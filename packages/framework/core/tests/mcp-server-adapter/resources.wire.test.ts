/**
 * Wire-уровень тестов resources/* (пакет 5.1.A плана модернизации MCP
 * 2026-07-28). Раздельно от резервуара unit-тестов ResourceRegistry
 * (tests/resources/resource-registry.test.ts) — здесь проверяется то, что
 * unit-тест регистра принципиально не видит: реальный `Server` SDK,
 * `cacheHints` → `ttlMs`/`cacheScope` на wire, и что брошенный
 * `ResourceNotFoundError` действительно сериализуется SDK как JSON-RPC
 * `-32602`, а не просто имеет нужное поле `code` в JS-объекте.
 *
 * Транспорт — `InMemoryTransport.createLinkedPair()` (сам SDK, не
 * дополнительная зависимость), но подключается он НЕ через `server.connect()`
 * напрямую, а через `serveStdio(factory, { transport })` — "bring your own
 * transport" опция `serveStdio` (документирована в `stdio.d.mts`). Это
 * принципиально: era-детекция, регистрация `server/discover` и стемпинг
 * `ttlMs`/`cacheScope`/`resultType` на 2026-07-28 — поведение ИМЕННО
 * serving-обёртки `serveStdio` (`installModernOnlyHandlers` и encode seam
 * внутри неё), а не голого `Protocol`/`Server` — эмпирически проверено:
 * `server.connect(transport)` напрямую отвечает на `server/discover`
 * `-32601 Method not found`, т.к. соответствующий `setRequestHandler`
 * регистрирует ИМЕННО serving-обёртка, а не конструктор `Server`. Другой
 * конец пары драйвится вручную как raw JSON-RPC клиент — тот же принцип, что
 * и `ServerHarness` в скриптах raw-wire-test.ts трёх серверов (сценарии
 * пакета 4.1.D), но без реального STDIO-процесса/child_process.
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
import { ResourceRegistry } from '../../src/resources/index.js';
import type {
  ResourceProvider,
  ResourceListPage,
  McpResource,
  McpResourceContents,
} from '../../src/resources/resource-provider.js';
import type { McpServerAdapterOptions } from '../../src/mcp-server-adapter/types.js';

// ---------------------------------------------------------------------------
// Тестовый провайдер: 3 ресурса, pageSize=2 (пагинация внутри одного
// провайдера), плюс uri, отсутствующий в listResources, но читаемый напрямую.
// ---------------------------------------------------------------------------
class WireTestResourceProvider implements ResourceProvider {
  public readonly id = 'wire-test-provider';
  private readonly all: readonly McpResource[] = [
    { uri: 'test://1', name: 'one' },
    { uri: 'test://2', name: 'two' },
    { uri: 'test://3', name: 'three' },
  ];

  listResources(cursor?: string): ResourceListPage {
    const offset = cursor === undefined ? 0 : Number(cursor);
    const pageSize = 2;
    const slice = this.all.slice(offset, offset + pageSize);
    const nextOffset = offset + pageSize;
    return {
      resources: slice,
      ...(nextOffset < this.all.length ? { nextCursor: String(nextOffset) } : {}),
    };
  }

  readResource(uri: string): readonly McpResourceContents[] | undefined {
    if (uri === 'test://1') return [{ uri, text: 'содержимое test://1' }];
    if (uri === 'test://hidden') return [{ uri, text: 'скрытый ресурс, не в списке' }];
    return undefined;
  }

  listTemplates(): readonly [{ uriTemplate: string; name: string }] {
    return [{ uriTemplate: 'test://{id}', name: 'wire-test-template' }];
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
  const resourceRegistry = new ResourceRegistry();
  resourceRegistry.register(new WireTestResourceProvider());

  const toolRegistry = new ToolRegistry(new Container(), makeMockLogger(), []);

  const options: McpServerAdapterOptions = {
    serverName: 'wire-test-server',
    version: '0.0.1',
    toolRegistry,
    resourceRegistry,
    logger: makeMockLogger(),
  };

  return buildMcpServer(options);
}

function modernMeta(extra: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    'io.modelcontextprotocol/protocolVersion': '2026-07-28',
    'io.modelcontextprotocol/clientInfo': { name: 'resources-wire-test', version: '1.0.0' },
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

/**
 * Raw JSON-RPC клиент поверх `serveStdio({ transport })` — см. заголовок
 * файла: era-детекция и cache-стемпинг живут в serving-обёртке, поэтому
 * фабрику отдаём именно `serveStdio`, а не строим `Server` и не зовём
 * `.connect()` сами.
 */
class InMemoryHarness {
  private readonly waiters = new Map<number, (msg: JsonRpcResponseLike) => void>();
  private readonly serverTransport: InMemoryTransport;
  private readonly clientTransport: InMemoryTransport;
  private readonly handle: StdioServerHandle;

  constructor(factory: () => Server) {
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
    // legacy: 'serve' — тот же выбор, что и у createMcpServerAdapter (см.
    // заголовок create-mcp-server-adapter.ts); здесь несущественно, т.к.
    // открывающее сообщение всегда modern (server/discover), но держим то
    // же значение, чтобы не расходиться с production-конфигурацией.
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

describe('resources/* через реальный Server (wire-уровень)', () => {
  let harness: InMemoryHarness;

  afterEach(async () => {
    await harness?.close();
  });

  async function withConnectedHarness(): Promise<InMemoryHarness> {
    harness = new InMemoryHarness(buildTestServer);
    await harness.connect();
    // Открывающее сообщение пинит соединение на modern-эру (2026-07-28) —
    // тот же приём, что и raw-wire сценарий 2/3/4 трёх серверов.
    const discover = await harness.request(1, 'server/discover', { _meta: modernMeta() });
    expect(discover.result?.['capabilities']).toMatchObject({ resources: {} });
    return harness;
  }

  it('resources/list возвращает ресурсы, ttlMs и cacheScope', async () => {
    const h = await withConnectedHarness();

    const list = await h.request(2, 'resources/list', { _meta: modernMeta() });

    expect(list.error).toBeUndefined();
    expect(Array.isArray(list.result?.['resources'])).toBe(true);
    expect((list.result?.['resources'] as unknown[]).length).toBe(2);
    expect(typeof list.result?.['ttlMs']).toBe('number');
    expect(list.result?.['cacheScope']).toBe('private');
    expect(list.result?.['nextCursor']).toBeDefined();
  });

  it('resources/list: курсор продолжает пагинацию до конца списка', async () => {
    const h = await withConnectedHarness();

    const first = await h.request(2, 'resources/list', { _meta: modernMeta() });
    const nextCursor = first.result?.['nextCursor'] as string;
    expect(nextCursor).toBeTruthy();

    const second = await h.request(3, 'resources/list', {
      cursor: nextCursor,
      _meta: modernMeta(),
    });

    expect(second.error).toBeUndefined();
    expect((second.result?.['resources'] as unknown[]).length).toBe(1);
    expect(second.result?.['nextCursor']).toBeUndefined();
  });

  it('resources/templates/list возвращает шаблоны, ttlMs и cacheScope', async () => {
    const h = await withConnectedHarness();

    const templates = await h.request(2, 'resources/templates/list', { _meta: modernMeta() });

    expect(templates.error).toBeUndefined();
    expect(Array.isArray(templates.result?.['resourceTemplates'])).toBe(true);
    expect((templates.result?.['resourceTemplates'] as unknown[]).length).toBe(1);
    expect(typeof templates.result?.['ttlMs']).toBe('number');
    expect(templates.result?.['cacheScope']).toBe('private');
  });

  it('resources/read по uri из списка возвращает contents, ttlMs и cacheScope', async () => {
    const h = await withConnectedHarness();

    const read = await h.request(2, 'resources/read', {
      uri: 'test://1',
      _meta: modernMeta(),
    });

    expect(read.error).toBeUndefined();
    expect(read.result?.['contents']).toEqual([{ uri: 'test://1', text: 'содержимое test://1' }]);
    expect(typeof read.result?.['ttlMs']).toBe('number');
    expect(read.result?.['cacheScope']).toBe('private');
  });

  it('resources/read по uri, ОТСУТСТВУЮЩЕМУ в resources/list, тем не менее работает', async () => {
    const h = await withConnectedHarness();

    const read = await h.request(2, 'resources/read', {
      uri: 'test://hidden',
      _meta: modernMeta(),
    });

    expect(read.error).toBeUndefined();
    expect(read.result?.['contents']).toEqual([
      { uri: 'test://hidden', text: 'скрытый ресурс, не в списке' },
    ]);
  });

  it('resources/read несуществующего uri → JSON-RPC ошибка с кодом -32602 (НЕ -32002)', async () => {
    const h = await withConnectedHarness();

    const read = await h.request(2, 'resources/read', {
      uri: 'test://does-not-exist',
      _meta: modernMeta(),
    });

    expect(read.result).toBeUndefined();
    expect(read.error?.code).toBe(-32602);
  });
});
