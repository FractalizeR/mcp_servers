/**
 * Wire-уровень тестов prompts/* для Wiki (аудит внешнего ревью,
 * REVIEW_MCP_SDK_FINDINGS.md — M8) — реальный `Server` SDK через
 * `PromptRegistry` + `WikiPromptProvider`, по образцу
 * `packages/servers/yandex-tracker/tests/prompts/tracker-prompts.wire.test.ts`.
 *
 * Проверяет:
 * 1. prompts/list отдаёт оба промпта Wiki с описаниями и аргументами.
 * 2. prompts/get подставляет аргументы; обязательный аргумент без значения
 *    даёт JSON-RPC -32602 (не internal error).
 * 3. Несуществующее имя промпта → -32602.
 * 4. Два последовательных prompts/list побайтово идентичны.
 * 5. prompts/list несёт ttlMs/cacheScope; prompts/get — нет (контракт SEP-2549).
 */

import { describe, it, expect, afterEach } from 'vitest';
import { InMemoryTransport } from '@modelcontextprotocol/server';
import type { Server, JSONRPCMessage } from '@modelcontextprotocol/server';
import { serveStdio } from '@modelcontextprotocol/server/stdio';
import type { StdioServerHandle } from '@modelcontextprotocol/server/stdio';
import { buildMcpServer, ToolRegistry, PromptRegistry } from '@fractalizer/mcp-core';
import type { McpServerAdapterOptions } from '@fractalizer/mcp-core';
import { Container } from 'inversify';

import {
  WikiPromptProvider,
  SECTION_SUMMARY,
  DOCUMENT_UPDATE_PREP,
} from '#prompts/wiki-prompt.provider.js';
import { createMockLogger } from '#helpers/index.js';

function buildTestServer(): Server {
  const promptRegistry = new PromptRegistry();
  promptRegistry.register(new WikiPromptProvider());

  const toolRegistry = new ToolRegistry(new Container(), createMockLogger(), []);

  const options: McpServerAdapterOptions = {
    serverName: 'wiki-prompts-wire-test',
    version: '0.0.1',
    toolRegistry,
    promptRegistry,
    logger: createMockLogger(),
  };

  return buildMcpServer(options);
}

function modernMeta(extra: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    'io.modelcontextprotocol/protocolVersion': '2026-07-28',
    'io.modelcontextprotocol/clientInfo': { name: 'wiki-prompts-wire-test', version: '1.0.0' },
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

describe('Wiki: prompts/* через реальный Server (wire-уровень)', () => {
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

  it('prompts/list отдаёт оба промпта Wiki с описаниями, аргументами и ttlMs/cacheScope', async () => {
    const h = await withConnectedHarness();

    const list = await h.request(2, 'prompts/list', { _meta: modernMeta() });

    expect(list.error).toBeUndefined();
    const prompts = list.result?.['prompts'] as Array<{
      name: string;
      description?: string;
      arguments?: unknown[];
    }>;
    expect(prompts.map((p) => p.name)).toEqual([SECTION_SUMMARY, DOCUMENT_UPDATE_PREP]);
    for (const p of prompts) {
      expect(p.description, `${p.name} обязан иметь description`).toBeTruthy();
    }
    expect(typeof list.result?.['ttlMs']).toBe('number');
    expect(list.result?.['cacheScope']).toBeDefined();
  });

  it('два последовательных prompts/list побайтово идентичны', async () => {
    const h = await withConnectedHarness();

    const first = await h.request(2, 'prompts/list', { _meta: modernMeta() });
    const second = await h.request(3, 'prompts/list', { _meta: modernMeta() });

    expect(JSON.stringify(second.result)).toBe(JSON.stringify(first.result));
  });

  it(`prompts/get подставляет аргументы (${SECTION_SUMMARY})`, async () => {
    const h = await withConnectedHarness();

    const get = await h.request(2, 'prompts/get', {
      name: SECTION_SUMMARY,
      arguments: { slug: 'users/docs' },
      _meta: modernMeta(),
    });

    expect(get.error).toBeUndefined();
    const messages = get.result?.['messages'] as Array<{ content: { text: string } }>;
    expect(messages[0]?.content.text).toContain('users/docs');
    // prompts/get не несёт ttlMs/cacheScope — контракт спеки (SEP-2549).
    expect(get.result).not.toHaveProperty('ttlMs');
    expect(get.result).not.toHaveProperty('cacheScope');
  });

  it(`prompts/get без обязательного аргумента → JSON-RPC -32602 на WIRE (${SECTION_SUMMARY} без slug)`, async () => {
    const h = await withConnectedHarness();

    const get = await h.request(2, 'prompts/get', {
      name: SECTION_SUMMARY,
      _meta: modernMeta(),
    });

    expect(get.result).toBeUndefined();
    expect(get.error).toBeDefined();
    expect(get.error?.message).toMatch(/slug/i);
    expect(get.error?.code).toBe(-32602);
  });

  it(`prompts/get без обязательного аргумента → JSON-RPC -32602 на WIRE (${DOCUMENT_UPDATE_PREP} без slug)`, async () => {
    const h = await withConnectedHarness();

    const get = await h.request(2, 'prompts/get', {
      name: DOCUMENT_UPDATE_PREP,
      _meta: modernMeta(),
    });

    expect(get.result).toBeUndefined();
    expect(get.error).toBeDefined();
    expect(get.error?.message).toMatch(/slug/i);
    expect(get.error?.code).toBe(-32602);
  });

  it(`prompts/get с необязательным аргументом опущенным работает (${DOCUMENT_UPDATE_PREP} без instructions)`, async () => {
    const h = await withConnectedHarness();

    const get = await h.request(2, 'prompts/get', {
      name: DOCUMENT_UPDATE_PREP,
      arguments: { slug: 'users/docs/readme' },
      _meta: modernMeta(),
    });

    expect(get.error).toBeUndefined();
    const messages = get.result?.['messages'] as Array<{ content: { text: string } }>;
    expect(messages[0]?.content.text).toContain('yw_diff_page');
  });

  it('несуществующее имя промпта → JSON-RPC ошибка -32602', async () => {
    const h = await withConnectedHarness();

    const get = await h.request(2, 'prompts/get', {
      name: 'does-not-exist',
      _meta: modernMeta(),
    });

    expect(get.result).toBeUndefined();
    expect(get.error?.code).toBe(-32602);
  });
});
