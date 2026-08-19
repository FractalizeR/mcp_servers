/**
 * Wire-уровень тестов prompts/* (пакет 5.1.A плана модернизации MCP
 * 2026-07-28). Зеркалирует resources.wire.test.ts — см. его заголовок для
 * обоснования `serveStdio(factory, { transport })` вместо голого
 * `server.connect()`.
 *
 * Отдельно проверяет то, что unit-тест PromptRegistry принципиально не
 * видит: `ttlMs`/`cacheScope` реально доходят до wire на `prompts/list`
 * (через `cacheHints` SDK, как и tools/list/resources/*) — И ЧТО ИХ НЕТ на
 * `prompts/get`. Это не пропуск, а требование спеки 2026-07-28: результат
 * `prompts/get` зависит от аргументов конкретного вызова, поэтому
 * `GetPromptResult` не наследует `CacheableResult` (SEP-2549) и намеренно
 * исключён из закрытого списка `CacheableResultMethod` SDK — подсказка о
 * кешировании здесь ввела бы посредника в заблуждение и заставила бы его
 * закешировать ответ, который кешировать нельзя. Тест фиксирует ОТСУТСТВИЕ
 * полей как контракт — чтобы никто не вернул их «для единообразия» с
 * другими методами. Также проверяет, что несуществующий промпт даёт
 * JSON-RPC `-32602` на wire, а не просто имеет нужный `code` в JS-объекте.
 */

import { describe, it, expect, afterEach } from 'vitest';
import { Container } from 'inversify';
import type { Logger } from '@fractalizer/mcp-infrastructure';
import { InMemoryTransport } from '@modelcontextprotocol/server';
import type { Server, JSONRPCMessage } from '@modelcontextprotocol/server';
import { serveStdio } from '@modelcontextprotocol/server/stdio';
import type { StdioServerHandle } from '@modelcontextprotocol/server/stdio';

import { buildMcpServer } from '../../src/mcp-server-adapter/build-mcp-server.js';
import { ToolRegistry } from '../../src/tool-registry/index.js';
import { PromptRegistry } from '../../src/prompts/index.js';
import type {
  PromptProvider,
  McpPrompt,
  PromptGetResult,
} from '../../src/prompts/prompt-provider.js';
import type { McpServerAdapterOptions } from '../../src/mcp-server-adapter/types.js';

// ---------------------------------------------------------------------------
// Тестовый провайдер: 2 промпта, один — параметризуемый (аргумент queue).
// ---------------------------------------------------------------------------
class WireTestPromptProvider implements PromptProvider {
  public readonly id = 'wire-test-prompts';
  private readonly prompts: readonly McpPrompt[] = [
    {
      name: 'triage',
      title: 'Triage очереди',
      description: 'Разбор задач очереди по приоритету',
      arguments: [{ name: 'queue', description: 'Ключ очереди', required: true }],
    },
    { name: 'daily', description: 'Дейли-сводка' },
  ];

  listPrompts(): readonly McpPrompt[] {
    return this.prompts;
  }

  getPrompt(name: string, args?: Record<string, string>): PromptGetResult | undefined {
    if (name === 'triage') {
      return {
        description: 'Triage очереди',
        messages: [
          {
            role: 'user',
            content: { type: 'text', text: `Разбери задачи очереди ${args?.['queue'] ?? '?'}` },
          },
        ],
      };
    }
    if (name === 'daily') {
      return {
        messages: [{ role: 'user', content: { type: 'text', text: 'Дай дейли-сводку' } }],
      };
    }
    return undefined;
  }
}

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
  const promptRegistry = new PromptRegistry();
  promptRegistry.register(new WireTestPromptProvider());

  const toolRegistry = new ToolRegistry(new Container(), makeMockLogger(), []);

  const options: McpServerAdapterOptions = {
    serverName: 'wire-test-server',
    version: '0.0.1',
    toolRegistry,
    promptRegistry,
    logger: makeMockLogger(),
  };

  return buildMcpServer(options);
}

function buildEmptyPromptsTestServer(): Server {
  const toolRegistry = new ToolRegistry(new Container(), makeMockLogger(), []);

  const options: McpServerAdapterOptions = {
    serverName: 'wire-test-server-empty-prompts',
    version: '0.0.1',
    toolRegistry,
    logger: makeMockLogger(),
  };

  return buildMcpServer(options);
}

function modernMeta(extra: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    'io.modelcontextprotocol/protocolVersion': '2026-07-28',
    'io.modelcontextprotocol/clientInfo': { name: 'prompts-wire-test', version: '1.0.0' },
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

/** Raw JSON-RPC клиент поверх `serveStdio({ transport })` — см. resources.wire.test.ts. */
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

describe('prompts/* через реальный Server (wire-уровень)', () => {
  let harness: InMemoryHarness;

  afterEach(async () => {
    await harness?.close();
  });

  async function withConnectedHarness(factory: () => Server): Promise<InMemoryHarness> {
    harness = new InMemoryHarness(factory);
    await harness.connect();
    const discover = await harness.request(1, 'server/discover', { _meta: modernMeta() });
    expect(discover.result?.['capabilities']).toMatchObject({ prompts: {} });
    return harness;
  }

  it('prompts/list возвращает промпты, ttlMs и cacheScope', async () => {
    const h = await withConnectedHarness(buildTestServer);

    const list = await h.request(2, 'prompts/list', { _meta: modernMeta() });

    expect(list.error).toBeUndefined();
    expect(list.result?.['prompts']).toEqual([
      {
        name: 'triage',
        title: 'Triage очереди',
        description: 'Разбор задач очереди по приоритету',
        arguments: [{ name: 'queue', description: 'Ключ очереди', required: true }],
      },
      { name: 'daily', description: 'Дейли-сводка' },
    ]);
    expect(typeof list.result?.['ttlMs']).toBe('number');
    expect(list.result?.['cacheScope']).toBe('private');
  });

  it('prompts/list: два последовательных вызова побайтово идентичны', async () => {
    const h = await withConnectedHarness(buildTestServer);

    const first = await h.request(2, 'prompts/list', { _meta: modernMeta() });
    const second = await h.request(3, 'prompts/list', { _meta: modernMeta() });

    // ttlMs/cacheScope стабильны (константы), сравниваем весь результат
    // целиком — тот же контракт детерминизма, что и у tools/list.
    expect(JSON.stringify(second.result)).toBe(JSON.stringify(first.result));
  });

  it('prompts/get с аргументами подставляет их в сообщения и НЕ несёт ttlMs/cacheScope', async () => {
    const h = await withConnectedHarness(buildTestServer);

    const get = await h.request(2, 'prompts/get', {
      name: 'triage',
      arguments: { queue: 'BACKEND' },
      _meta: modernMeta(),
    });

    expect(get.error).toBeUndefined();
    expect(get.result?.['messages']).toEqual([
      { role: 'user', content: { type: 'text', text: 'Разбери задачи очереди BACKEND' } },
    ]);
    // Отсутствие полей — контракт спеки (SEP-2549), см. заголовок файла.
    expect(get.result).not.toHaveProperty('ttlMs');
    expect(get.result).not.toHaveProperty('cacheScope');
  });

  it('prompts/get без аргументов работает для промпта без обязательных полей', async () => {
    const h = await withConnectedHarness(buildTestServer);

    const get = await h.request(2, 'prompts/get', { name: 'daily', _meta: modernMeta() });

    expect(get.error).toBeUndefined();
    expect(get.result?.['messages']).toEqual([
      { role: 'user', content: { type: 'text', text: 'Дай дейли-сводку' } },
    ]);
  });

  it('prompts/get несуществующего имени → JSON-RPC ошибка с кодом -32602', async () => {
    const h = await withConnectedHarness(buildTestServer);

    const get = await h.request(2, 'prompts/get', {
      name: 'does-not-exist',
      _meta: modernMeta(),
    });

    expect(get.result).toBeUndefined();
    expect(get.error?.code).toBe(-32602);
  });

  it('сервер без зарегистрированных промптов: пустой список, а prompts/get → -32602 (не -32601 Method not found)', async () => {
    const h = await withConnectedHarness(buildEmptyPromptsTestServer);

    const list = await h.request(2, 'prompts/list', { _meta: modernMeta() });
    expect(list.error).toBeUndefined();
    expect(list.result?.['prompts']).toEqual([]);

    const get = await h.request(3, 'prompts/get', { name: 'anything', _meta: modernMeta() });
    expect(get.result).toBeUndefined();
    expect(get.error?.code).toBe(-32602);
  });
});
