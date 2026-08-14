/**
 * Smoke Test: MCP Prompts протокол для TickTick (пакет 5.1.C.ticktick плана
 * модернизации MCP 2026-07-28, промпты).
 *
 * Wire-уровень — тот же приём, что и `resources.smoke.test.ts` (см. его
 * заголовок за подробным обоснованием `serveStdio(factory, { transport })`
 * вместо `server.connect()`), но с реальным `TickTickPromptProvider` через
 * DI-контейнер (провайдер промптов не зависит от facade/HTTP — контейнер
 * нужен здесь только чтобы собрать `ToolRegistry`/`PromptRegistry` тем же
 * способом, что и в проде, через `server.ts`).
 *
 * Область: DoD задания «промпты TickTick», пункты 1-4.
 * 1. prompts/list отдаёт все три промпта с описаниями и аргументами.
 * 2. prompts/get каждого подставляет аргументы; обязательный аргумент без
 *    значения даёт внятную ошибку.
 * 3. Несуществующее имя промпта → -32602.
 * 4. Два последовательных prompts/list побайтово идентичны.
 */

import { describe, it, expect, afterEach } from 'vitest';
import { InMemoryTransport } from '@modelcontextprotocol/server';
import type { Server, JSONRPCMessage } from '@modelcontextprotocol/server';
import { serveStdio } from '@modelcontextprotocol/server/stdio';
import type { StdioServerHandle } from '@modelcontextprotocol/server/stdio';

import { buildMcpServer } from '@fractalizer/mcp-core';
import type { ToolRegistry, PromptRegistry } from '@fractalizer/mcp-core';
import type { McpServerAdapterOptions } from '@fractalizer/mcp-core';

import { createContainer } from '#composition-root/container.js';
import { TYPES } from '#composition-root/types.js';
import { TICKTICK_PROMPT_NAMES } from '#prompts/index.js';
import type { ServerConfig } from '#config';

const fakeConfig: ServerConfig = {
  oauth: {
    clientId: 'fake-client-id',
    clientSecret: 'fake-client-secret',
    redirectUri: 'http://localhost:3000/callback',
  },
  api: { baseUrl: 'https://api.ticktick.com/open/v1' },
  batch: { maxBatchSize: 50, maxConcurrentRequests: 10 },
  retry: { attempts: 3, minDelay: 1000, maxDelay: 10000 },
  cache: { ttlMs: 300000 },
  tools: {},
  logging: { level: 'error', dir: './logs', prettyLogs: false, maxSize: 51200, maxFiles: 20 },
  requestTimeout: 30000,
};

async function buildTestServer(): Promise<Server> {
  const container = await createContainer(fakeConfig);

  const toolRegistry = container.get<ToolRegistry>(TYPES.ToolRegistry);
  const promptRegistry = container.get<PromptRegistry>(TYPES.PromptRegistry);

  const options: McpServerAdapterOptions = {
    serverName: 'ticktick-prompts-test',
    version: '0.0.1',
    toolRegistry,
    promptRegistry,
    logger: container.get(TYPES.Logger),
  };

  return buildMcpServer(options);
}

function modernMeta(extra: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    'io.modelcontextprotocol/protocolVersion': '2026-07-28',
    'io.modelcontextprotocol/clientInfo': { name: 'prompts-smoke-test', version: '1.0.0' },
    'io.modelcontextprotocol/clientCapabilities': {},
    ...extra,
  };
}

interface JsonRpcErrorObject {
  code: number;
  message: string;
  data?: unknown;
}

interface JsonRpcResponseLike {
  jsonrpc: '2.0';
  id: number;
  result?: Record<string, unknown>;
  error?: JsonRpcErrorObject;
}

/** Тот же raw JSON-RPC harness, что и в resources.smoke.test.ts. */
class InMemoryHarness {
  private readonly waiters = new Map<number, (msg: JsonRpcResponseLike) => void>();
  private readonly serverTransport: InMemoryTransport;
  private readonly clientTransport: InMemoryTransport;
  private readonly handle: StdioServerHandle;

  constructor(factory: () => Promise<Server>) {
    const [serverTransport, clientTransport] = InMemoryTransport.createLinkedPair();
    this.serverTransport = serverTransport;
    this.clientTransport = clientTransport;
    this.clientTransport.onmessage = (message: JSONRPCMessage): void => {
      const msg = message as unknown as JsonRpcResponseLike;
      if (typeof msg.id === 'number') {
        const waiter = this.waiters.get(msg.id);
        if (waiter) {
          this.waiters.delete(msg.id);
          waiter(msg);
        }
      }
    };
    this.handle = serveStdio(factory, { transport: serverTransport, legacy: 'serve' });
  }

  async connect(): Promise<void> {
    await this.clientTransport.start();
  }

  async request(
    id: number,
    method: string,
    params?: Record<string, unknown>
  ): Promise<JsonRpcResponseLike> {
    const pending = new Promise<JsonRpcResponseLike>((resolve) => {
      this.waiters.set(id, resolve);
    });
    await this.clientTransport.send({
      jsonrpc: '2.0',
      id,
      method,
      ...(params ? { params } : {}),
    } as unknown as JSONRPCMessage);
    return pending;
  }

  async close(): Promise<void> {
    await this.clientTransport.close();
    await this.handle.close();
  }
}

describe('MCP Prompts TickTick через реальный Server (wire-уровень)', () => {
  let harness: InMemoryHarness;

  afterEach(async () => {
    await harness?.close();
  });

  async function withConnectedHarness(): Promise<InMemoryHarness> {
    harness = new InMemoryHarness(buildTestServer);
    await harness.connect();
    const discover = await harness.request(1, 'server/discover', { _meta: modernMeta() });
    expect(discover.result?.['capabilities']).toMatchObject({ prompts: {} });
    return harness;
  }

  it('prompts/list отдаёт все три промпта с описаниями и аргументами', async () => {
    const h = await withConnectedHarness();

    const list = await h.request(2, 'prompts/list', { _meta: modernMeta() });

    expect(list.error).toBeUndefined();
    const prompts = list.result?.['prompts'] as { name: string; description?: string }[];
    expect(prompts.map((p) => p.name)).toEqual([
      TICKTICK_PROMPT_NAMES.dailyReview,
      TICKTICK_PROMPT_NAMES.weeklyReview,
      TICKTICK_PROMPT_NAMES.gtdInboxReview,
    ]);
    expect(prompts.every((p) => Boolean(p.description))).toBe(true);
    expect(typeof list.result?.['ttlMs']).toBe('number');
    expect(list.result?.['cacheScope']).toBe('private');
  });

  it('prompts/list: два последовательных вызова побайтово идентичны', async () => {
    const h = await withConnectedHarness();

    const first = await h.request(2, 'prompts/list', { _meta: modernMeta() });
    const second = await h.request(3, 'prompts/list', { _meta: modernMeta() });

    expect(JSON.stringify(second.result)).toBe(JSON.stringify(first.result));
  });

  it('prompts/get(daily_review) без аргументов подставляет сегодняшнюю дату', async () => {
    const h = await withConnectedHarness();

    const get = await h.request(2, 'prompts/get', {
      name: TICKTICK_PROMPT_NAMES.dailyReview,
      _meta: modernMeta(),
    });

    expect(get.error).toBeUndefined();
    const messages = get.result?.['messages'] as { content: { text: string } }[];
    const todayIso = new Date().toISOString().slice(0, 10);
    expect(messages[0]?.content.text).toContain(todayIso);
    expect(get.result).not.toHaveProperty('ttlMs');
    expect(get.result).not.toHaveProperty('cacheScope');
  });

  it('prompts/get(daily_review) с аргументом date подставляет его в сообщение', async () => {
    const h = await withConnectedHarness();

    const get = await h.request(2, 'prompts/get', {
      name: TICKTICK_PROMPT_NAMES.dailyReview,
      arguments: { date: '2026-05-01' },
      _meta: modernMeta(),
    });

    expect(get.error).toBeUndefined();
    const messages = get.result?.['messages'] as { content: { text: string } }[];
    expect(messages[0]?.content.text).toContain('2026-05-01');
  });

  it('prompts/get(weekly_review) без аргументов работает', async () => {
    const h = await withConnectedHarness();

    const get = await h.request(2, 'prompts/get', {
      name: TICKTICK_PROMPT_NAMES.weeklyReview,
      _meta: modernMeta(),
    });

    expect(get.error).toBeUndefined();
    const messages = get.result?.['messages'] as { content: { text: string } }[];
    expect(messages[0]?.content.text).toContain('get_tasks_due_this_week');
  });

  it('prompts/get(gtd_inbox_review) с обязательным project_id подставляет его в сообщение', async () => {
    const h = await withConnectedHarness();

    const get = await h.request(2, 'prompts/get', {
      name: TICKTICK_PROMPT_NAMES.gtdInboxReview,
      arguments: { project_id: 'inbox-42' },
      _meta: modernMeta(),
    });

    expect(get.error).toBeUndefined();
    const messages = get.result?.['messages'] as { content: { text: string } }[];
    expect(messages[0]?.content.text).toContain('inbox-42');
  });

  it('prompts/get(gtd_inbox_review) БЕЗ обязательного project_id → внятная JSON-RPC ошибка -32602', async () => {
    const h = await withConnectedHarness();

    const get = await h.request(2, 'prompts/get', {
      name: TICKTICK_PROMPT_NAMES.gtdInboxReview,
      _meta: modernMeta(),
    });

    expect(get.result).toBeUndefined();
    expect(get.error?.code).toBe(-32602);
    expect(get.error?.message).toContain('project_id');
  });

  it('prompts/get несуществующего имени → JSON-RPC -32602', async () => {
    const h = await withConnectedHarness();

    const get = await h.request(2, 'prompts/get', {
      name: 'fr_ticktick_does_not_exist',
      _meta: modernMeta(),
    });

    expect(get.result).toBeUndefined();
    expect(get.error?.code).toBe(-32602);
  });
});
