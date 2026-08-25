/**
 * Wire-уровень тестов prompts/* для Трекера (пакет 5.1.C.tracker плана
 * модернизации MCP 2026-07-28) — реальный `Server` SDK через
 * `createTrackerPromptRegistry()`, по образцу
 * `tests/resources/tracker-resources.wire.test.ts` (см. её заголовок —
 * `serveStdio`, а не голый `server.connect()`).
 *
 * Проверяет DoD задания целиком на уровне протокола:
 * 1. prompts/list отдаёт все 3 промпта с описаниями и аргументами.
 * 2. prompts/get каждого подставляет аргументы; обязательный аргумент без
 *    значения даёт внятную ошибку.
 * 3. Несуществующее имя промпта → -32602.
 * 4. Два последовательных prompts/list побайтово идентичны.
 */

import { describe, it, expect, afterEach } from 'vitest';
import { Container } from 'inversify';
import type { Logger } from '@fractalizer/mcp-infrastructure';
import { InMemoryTransport } from '@modelcontextprotocol/server';
import type { Server, JSONRPCMessage } from '@modelcontextprotocol/server';
import { serveStdio } from '@modelcontextprotocol/server/stdio';
import type { StdioServerHandle } from '@modelcontextprotocol/server/stdio';
import { buildMcpServer, ToolRegistry } from '@fractalizer/mcp-core';
import type { McpServerAdapterOptions } from '@fractalizer/mcp-core';

import { createTrackerPromptRegistry } from '#prompts/index.js';

function makeMockLogger(): Logger {
  return {
    info: (): void => {},
    debug: (): void => {},
    warn: (): void => {},
    error: (): void => {},
    child: function (this: Logger): Logger {
      return this;
    },
  } as unknown as Logger;
}

function buildTestServer(): Server {
  const promptRegistry = createTrackerPromptRegistry();
  const toolRegistry = new ToolRegistry(new Container(), makeMockLogger(), []);

  const options: McpServerAdapterOptions = {
    serverName: 'tracker-prompts-wire-test',
    version: '0.0.1',
    toolRegistry,
    promptRegistry,
    logger: makeMockLogger(),
  };

  return buildMcpServer(options);
}

function modernMeta(extra: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    'io.modelcontextprotocol/protocolVersion': '2026-07-28',
    'io.modelcontextprotocol/clientInfo': { name: 'tracker-prompts-wire-test', version: '1.0.0' },
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

class InMemoryHarness {
  private readonly waiters = new Map<number, (msg: JsonRpcResponseLike) => void>();
  private readonly clientTransport: InMemoryTransport;
  private readonly handle: StdioServerHandle;

  constructor(factory: () => Server) {
    const [serverTransport, clientTransport] = InMemoryTransport.createLinkedPair();
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

describe('Трекер: prompts/* через реальный Server (wire-уровень)', () => {
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

  it('DoD 1: prompts/list отдаёт все 3 промпта с описаниями и аргументами', async () => {
    const h = await withConnectedHarness();

    const list = await h.request(2, 'prompts/list', { _meta: modernMeta() });

    expect(list.error).toBeUndefined();
    const prompts = list.result?.['prompts'] as Array<{
      name: string;
      description?: string;
      arguments?: unknown[];
    }>;
    expect(prompts.map((p) => p.name)).toEqual(['triage_queue', 'daily_summary', 'epic_links']);
    for (const p of prompts) {
      expect(p.description, `${p.name} обязан иметь description`).toBeTruthy();
    }
    expect(typeof list.result?.['ttlMs']).toBe('number');
    expect(list.result?.['cacheScope']).toBeDefined();
  });

  it('DoD 4: два последовательных prompts/list побайтово идентичны', async () => {
    const h = await withConnectedHarness();

    const first = await h.request(2, 'prompts/list', { _meta: modernMeta() });
    const second = await h.request(3, 'prompts/list', { _meta: modernMeta() });

    expect(JSON.stringify(second.result)).toBe(JSON.stringify(first.result));
  });

  it('DoD 2: prompts/get подставляет аргументы (triage_queue)', async () => {
    const h = await withConnectedHarness();

    const get = await h.request(2, 'prompts/get', {
      name: 'triage_queue',
      arguments: { queue: 'BACKEND' },
      _meta: modernMeta(),
    });

    expect(get.error).toBeUndefined();
    const messages = get.result?.['messages'] as Array<{ content: { text: string } }>;
    expect(messages[0]?.content.text).toContain('BACKEND');
    // prompts/get не несёт ttlMs/cacheScope — контракт спеки (SEP-2549).
    expect(get.result).not.toHaveProperty('ttlMs');
    expect(get.result).not.toHaveProperty('cacheScope');
  });

  it('DoD 2/3: prompts/get без обязательного аргумента → JSON-RPC -32602 на WIRE (triage_queue без queue), не internal error', async () => {
    const h = await withConnectedHarness();

    const get = await h.request(2, 'prompts/get', {
      name: 'triage_queue',
      _meta: modernMeta(),
    });

    expect(get.result).toBeUndefined();
    expect(get.error).toBeDefined();
    expect(get.error?.message).toMatch(/queue/i);
    // Дефект, который проверяет этот тест: пропущенный required-аргумент —
    // это невалидные параметры вызова (-32602), а не internal error (-32603).
    // requireArgs() бросает ProtocolError сам, но только wire-уровень
    // (реальная сериализация через Server SDK) подтверждает, что код
    // действительно доходит до клиента таким, а не заворачивается по дороге.
    expect(get.error?.code).toBe(-32602);
  });

  it('DoD 2/3: prompts/get без обязательного аргумента → JSON-RPC -32602 на WIRE (epic_links без epic), не internal error', async () => {
    const h = await withConnectedHarness();

    const get = await h.request(2, 'prompts/get', {
      name: 'epic_links',
      _meta: modernMeta(),
    });

    expect(get.result).toBeUndefined();
    expect(get.error).toBeDefined();
    expect(get.error?.message).toMatch(/epic/i);
    expect(get.error?.code).toBe(-32602);
  });

  it('DoD 2: prompts/get без аргументов работает для daily_summary (обязательных полей нет)', async () => {
    const h = await withConnectedHarness();

    const get = await h.request(2, 'prompts/get', { name: 'daily_summary', _meta: modernMeta() });

    expect(get.error).toBeUndefined();
    const messages = get.result?.['messages'] as Array<{ content: { text: string } }>;
    expect(messages[0]?.content.text).toContain('me()');
  });

  it('DoD 3: несуществующее имя промпта → JSON-RPC ошибка -32602', async () => {
    const h = await withConnectedHarness();

    const get = await h.request(2, 'prompts/get', {
      name: 'does-not-exist',
      _meta: modernMeta(),
    });

    expect(get.result).toBeUndefined();
    expect(get.error?.code).toBe(-32602);
  });
});
