/**
 * Wire-уровень тестов resources/* для Трекера (пакет 5.1.C.tracker плана
 * модернизации MCP 2026-07-28) — реальный `Server` SDK через
 * `createTrackerResourceRegistry()` + мок `YandexTrackerFacade`, а не сам
 * `ResourceRegistry` (это уже покрыто unit-тестами framework и
 * `tests/resources/*-resource-provider.test.ts`).
 *
 * Проверяет DoD пакета целиком на уровне протокола:
 * 1. resources/list, resources/read, resources/templates/list работают.
 * 2. resources/read по URI задачи, отсутствующей в listResources — работает
 *    (задачи вообще не перечисляются, см. issue-resource-provider.ts).
 * 3. Несуществующий ресурс → JSON-RPC -32602 (НЕ -32002).
 *
 * Harness скопирован из packages/framework/core/tests/mcp-server-adapter/
 * resources.wire.test.ts (framework, 5.1.A) — тот же приём: `serveStdio`, а
 * не голый `server.connect()` (era-детекция и cache-стемпинг — поведение
 * serving-обёртки, не конструктора `Server`).
 */

import { describe, it, expect, afterEach, vi } from 'vitest';
import { createQueueRef } from '#helpers/common-fixtures.js';
import { Container } from 'inversify';
import type { Logger } from '@fractalizer/mcp-infrastructure';
import { ApiErrorClass } from '@fractalizer/mcp-infrastructure';
import { InMemoryTransport } from '@modelcontextprotocol/server';
import type { Server, JSONRPCMessage } from '@modelcontextprotocol/server';
import { serveStdio } from '@modelcontextprotocol/server/stdio';
import type { StdioServerHandle } from '@modelcontextprotocol/server/stdio';
import { buildMcpServer, ToolRegistry } from '@fractalizer/mcp-core';
import type { McpServerAdapterOptions } from '@fractalizer/mcp-core';

import type { YandexTrackerFacade } from '#tracker_api/facade/index.js';
import { createTrackerResourceRegistry } from '#resources/index.js';
import { UPDATE_ISSUE_TOOL_METADATA } from '#tools/api/issues/update/update-issue.metadata.js';
import { buildIssueResourceUri, buildQueueResourceUri } from '#resources/tracker-resource-uri.js';
import { createQueueListFixture } from '#helpers/queue.fixture.js';
import type { IssueWithUnknownFields, PaginatedResult } from '#tracker_api/entities/index.js';
import { createIssueFixture } from '#helpers/issue.fixture.js';

function page<T>(items: T[]): PaginatedResult<T> {
  return {
    items,
    pagination: {
      hasNextPage: false,
      fetchedAll: true,
      truncated: false,
      hasError: false,
      pagesFetched: 1,
    },
  };
}

const mockIssue: IssueWithUnknownFields = createIssueFixture({
  id: '1',
  key: 'QUEUE-1',
  summary: 'Задача, не попавшая в listResources',
  queue: createQueueRef({ id: '1', key: 'QUEUE', display: 'Queue' }),
  status: { id: '1', key: 'open', display: 'Open' },
});

function makeMockFacade(): YandexTrackerFacade {
  const queues = createQueueListFixture(1);

  return {
    getQueues: vi.fn().mockResolvedValue(page(queues)),
    getQueue: vi.fn().mockImplementation(({ queueId }: { queueId: string }) => {
      const found = queues.find((q) => q.key === queueId || String(q.id) === queueId);
      if (found === undefined) {
        return Promise.reject(new ApiErrorClass(404, 'Not found'));
      }
      return Promise.resolve(found);
    }),
    getIssues: vi.fn().mockImplementation((keys: string[]) => {
      const [key] = keys;
      if (key === mockIssue.key) {
        return Promise.resolve([{ status: 'fulfilled', key, index: 0, value: mockIssue }]);
      }
      return Promise.resolve([
        { status: 'rejected', key, index: 0, reason: new ApiErrorClass(404, 'Not found') },
      ]);
    }),
  } as unknown as YandexTrackerFacade;
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
  const facade = makeMockFacade();
  const resourceRegistry = createTrackerResourceRegistry(facade, {
    updateIssue: UPDATE_ISSUE_TOOL_METADATA.name,
  });
  const toolRegistry = new ToolRegistry(new Container(), makeMockLogger(), []);

  const options: McpServerAdapterOptions = {
    serverName: 'tracker-resources-wire-test',
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
    'io.modelcontextprotocol/clientInfo': { name: 'tracker-resources-wire-test', version: '1.0.0' },
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

describe('Трекер: resources/* через реальный Server (wire-уровень)', () => {
  let harness: InMemoryHarness;

  afterEach(async () => {
    await harness?.close();
  });

  async function withConnectedHarness(): Promise<InMemoryHarness> {
    harness = new InMemoryHarness(buildTestServer);
    await harness.connect();
    const discover = await harness.request(1, 'server/discover', { _meta: modernMeta() });
    expect(discover.result?.['capabilities']).toMatchObject({ resources: {} });
    return harness;
  }

  /**
   * ResourceRegistry возвращает РОВНО одну страницу ОДНОГО провайдера за
   * вызов (см. resource-registry.ts в framework) — курсор агрегата
   * переключается на следующего провайдера, когда текущий исчерпан. Тег
   * 'tracker-issues' сортируется первым и всегда пуст (задачи не
   * перечисляются), поэтому самая первая страница ОЖИДАЕМО пуста, но несёт
   * nextCursor на следующего провайдера — реальный клиент обязан идти по
   * курсору до его отсутствия, что и делает этот хелпер.
   */
  async function collectAllResources(
    h: InMemoryHarness
  ): Promise<Array<{ uri: string; [key: string]: unknown }>> {
    const all: Array<{ uri: string; [key: string]: unknown }> = [];
    let cursor: string | undefined;
    let requestId = 100;
    for (let guard = 0; guard < 10; guard++) {
      const list = await h.request(requestId++, 'resources/list', {
        ...(cursor !== undefined ? { cursor } : {}),
        _meta: modernMeta(),
      });
      expect(list.error).toBeUndefined();
      all.push(...((list.result?.['resources'] as typeof all) ?? []));
      cursor = list.result?.['nextCursor'] as string | undefined;
      if (cursor === undefined) {
        break;
      }
    }
    return all;
  }

  it('DoD 1: resources/list (по всем страницам) агрегирует очереди и виджет MCP Apps (задачи не перечисляются)', async () => {
    const h = await withConnectedHarness();

    const resources = await collectAllResources(h);

    // 2: queue + ui://tracker/issue-description-editor (пилот MCP
    // Apps №1, пакет 6.1) — статический виджет, тоже единственный в своём
    // роде, поэтому тоже перечислим (в отличие от issues, см. ниже).
    expect(resources).toHaveLength(2);
    expect(resources.some((r) => r.uri.startsWith('tracker://queue/'))).toBe(true);
    expect(resources.some((r) => r.uri.startsWith('tracker://issue/'))).toBe(false);
    expect(resources.some((r) => r.uri === 'ui://tracker/issue-description-editor')).toBe(true);
  });

  it('DoD 1: первая страница resources/list несёт ttlMs/cacheScope (даже если пуста)', async () => {
    const h = await withConnectedHarness();

    const list = await h.request(2, 'resources/list', { _meta: modernMeta() });

    expect(list.error).toBeUndefined();
    expect(typeof list.result?.['ttlMs']).toBe('number');
    expect(list.result?.['cacheScope']).toBeDefined();
  });

  it('DoD 1: resources/templates/list отдаёт шаблоны обеих схем', async () => {
    const h = await withConnectedHarness();

    const templates = await h.request(2, 'resources/templates/list', { _meta: modernMeta() });

    expect(templates.error).toBeUndefined();
    const list = templates.result?.['resourceTemplates'] as Array<{ uriTemplate: string }>;
    const uriTemplates = list.map((t) => t.uriTemplate).sort();
    expect(uriTemplates).toEqual(['tracker://issue/{key}', 'tracker://queue/{key}'].sort());
  });

  it('DoD 2: resources/read по URI задачи, ОТСУТСТВУЮЩЕЙ в resources/list, тем не менее работает', async () => {
    const h = await withConnectedHarness();

    const uri = buildIssueResourceUri(mockIssue.key);
    const read = await h.request(2, 'resources/read', { uri, _meta: modernMeta() });

    expect(read.error).toBeUndefined();
    const contents = read.result?.['contents'] as Array<{ uri: string; text: string }>;
    expect(contents).toHaveLength(1);
    expect(contents[0]?.uri).toBe(uri);
    expect(JSON.parse(contents[0]!.text)).toEqual(mockIssue);
  });

  it('resources/read по URI очереди из списка работает', async () => {
    const h = await withConnectedHarness();

    const resources = await collectAllResources(h);
    const queueUri = resources.find((r) => r.uri.startsWith('tracker://queue/'))!.uri;

    const read = await h.request(50, 'resources/read', { uri: queueUri, _meta: modernMeta() });

    expect(read.error).toBeUndefined();
    expect((read.result?.['contents'] as unknown[]).length).toBe(1);
  });

  it('DoD 3: несуществующий ресурс → JSON-RPC ошибка -32602 (НЕ -32002)', async () => {
    const h = await withConnectedHarness();

    const read = await h.request(2, 'resources/read', {
      uri: buildQueueResourceUri('DOES-NOT-EXIST'),
      _meta: modernMeta(),
    });

    expect(read.result).toBeUndefined();
    expect(read.error?.code).toBe(-32602);
  });

  it('несуществующая задача (404 от API) тоже даёт -32602 через тот же механизм', async () => {
    const h = await withConnectedHarness();

    const read = await h.request(2, 'resources/read', {
      uri: buildIssueResourceUri('QUEUE-404'),
      _meta: modernMeta(),
    });

    expect(read.result).toBeUndefined();
    expect(read.error?.code).toBe(-32602);
  });
});
