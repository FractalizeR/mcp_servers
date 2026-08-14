/**
 * Smoke Test: MCP Resources протокол для TickTick (пакет 5.1.C.ticktick плана
 * модернизации MCP 2026-07-28).
 *
 * Wire-уровень — тот же приём, что framework использует в
 * `packages/framework/core/tests/mcp-server-adapter/resources.wire.test.ts`:
 * `serveStdio(factory, { transport })` над `InMemoryTransport`, а не
 * `server.connect()` напрямую (era-детекция и cache-стемпинг — поведение
 * ИМЕННО serving-обёртки, см. заголовок того файла за подробным обоснованием).
 * В отличие от framework-теста здесь — РЕАЛЬНЫЙ DI-контейнер TickTick
 * (`createContainer`) с реальными `TaskResourceProvider`/`ProjectResourceProvider`,
 * подключённый мок только на уровне `IHttpClient`.
 *
 * Область: DoD пакета 5.1.C.ticktick, пункты 1-3.
 * 1. resources/list, resources/read, resources/templates/list работают по
 *    заданным схемам URI (ticktick://task/{id}, ticktick://project/{id}).
 * 2. resources/read по URI задачи, отсутствующей в текущей выборке
 *    resources/list, работает (провайдер разрешает URI напрямую).
 * 3. Несуществующий ресурс → JSON-RPC -32602.
 */

import { describe, it, expect, afterEach } from 'vitest';
import { InMemoryTransport } from '@modelcontextprotocol/server';
import type { Server, JSONRPCMessage } from '@modelcontextprotocol/server';
import { serveStdio } from '@modelcontextprotocol/server/stdio';
import type { StdioServerHandle } from '@modelcontextprotocol/server/stdio';

import { buildMcpServer } from '@fractalizer/mcp-core';
import type { ToolRegistry, ResourceRegistry } from '@fractalizer/mcp-core';
import type { McpServerAdapterOptions } from '@fractalizer/mcp-core';
import type { IHttpClient } from '@fractalizer/mcp-infrastructure/http/client/i-http-client.interface.js';

import { createContainer } from '#composition-root/container.js';
import { TYPES } from '#composition-root/types.js';
import type { ServerConfig } from '#config';
import type { ProjectWithUnknownFields } from '#ticktick_api/entities/project.entity.js';
import type { ProjectData } from '#ticktick_api/api_operations/projects/get-project-data.operation.js';

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

const PROJECTS: ProjectWithUnknownFields[] = [{ id: 'proj-1', name: 'Inbox' }];

const PROJECT_DATA: ProjectData = {
  project: PROJECTS[0] as ProjectWithUnknownFields,
  tasks: [
    {
      id: 'task-visible',
      projectId: 'proj-1',
      title: 'Visible task',
      priority: 0,
      status: 0,
      createdTime: '2026-01-01T00:00:00Z',
      modifiedTime: '2026-01-01T00:00:00Z',
    },
    {
      id: 'task-hidden',
      projectId: 'proj-1',
      title: 'Hidden task (не в первой странице теста)',
      priority: 0,
      status: 0,
      createdTime: '2026-01-01T00:00:00Z',
      modifiedTime: '2026-01-01T00:00:00Z',
    },
  ],
};

/** Мок HttpClient.get, покрывающий три эндпоинта, нужных провайдерам ресурсов. */
function mockHttpGet(path: string): unknown {
  if (path === '/project') return PROJECTS;
  if (path === '/project/proj-1') return PROJECTS[0];
  if (path === '/project/proj-1/data') return PROJECT_DATA;
  throw new Error(`mockHttpGet: неожиданный путь "${path}"`);
}

async function buildTestServer(): Promise<Server> {
  const container = await createContainer(fakeConfig);
  const httpClient = container.get<IHttpClient>(TYPES.HttpClient);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (httpClient as any).get = async (path: string): Promise<unknown> => mockHttpGet(path);

  const toolRegistry = container.get<ToolRegistry>(TYPES.ToolRegistry);
  const resourceRegistry = container.get<ResourceRegistry>(TYPES.ResourceRegistry);

  const options: McpServerAdapterOptions = {
    serverName: 'ticktick-resources-test',
    version: '0.0.1',
    toolRegistry,
    resourceRegistry,
    logger: container.get(TYPES.Logger),
  };

  return buildMcpServer(options);
}

function modernMeta(extra: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    'io.modelcontextprotocol/protocolVersion': '2026-07-28',
    'io.modelcontextprotocol/clientInfo': { name: 'resources-smoke-test', version: '1.0.0' },
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

/** Тот же raw JSON-RPC harness, что и во framework-тесте resources.wire.test.ts. */
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

describe('MCP Resources TickTick через реальный Server (wire-уровень)', () => {
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

  it('resources/list отдаёт задачи (ticktick://task/{id}) и проекты (ticktick://project/{id})', async () => {
    const h = await withConnectedHarness();

    // ResourceRegistry (framework) агрегирует НЕСКОЛЬКО провайдеров, отдавая
    // за один вызов страницу ОДНОГО провайдера (сортировка по id:
    // "ticktick-projects" < "ticktick-tasks") — обходим курсор до конца,
    // чтобы увидеть оба провайдера, см. resource-registry.ts framework.
    let cursor: string | undefined;
    const allUris: string[] = [];
    let requestId = 2;
    let lastResult: JsonRpcResponseLike | undefined;
    do {
      const params: Record<string, unknown> = { _meta: modernMeta() };
      if (cursor !== undefined) params['cursor'] = cursor;
      const list = await h.request(requestId, 'resources/list', params);
      requestId += 1;
      lastResult = list;
      expect(list.error).toBeUndefined();
      const resources = list.result?.['resources'] as { uri: string }[];
      allUris.push(...resources.map((r) => r.uri));
      cursor = list.result?.['nextCursor'] as string | undefined;
    } while (cursor !== undefined);

    expect(allUris).toEqual(
      expect.arrayContaining([
        'ticktick://project/proj-1',
        'ticktick://task/task-visible',
        'ticktick://task/task-hidden',
      ])
    );
    expect(typeof lastResult?.result?.['ttlMs']).toBe('number');
    expect(lastResult?.result?.['cacheScope']).toBe('private');
  });

  it('resources/templates/list отдаёт оба шаблона URI', async () => {
    const h = await withConnectedHarness();

    const templates = await h.request(2, 'resources/templates/list', { _meta: modernMeta() });

    expect(templates.error).toBeUndefined();
    const list = templates.result?.['resourceTemplates'] as { uriTemplate: string }[];
    expect(list.map((t) => t.uriTemplate)).toEqual(
      expect.arrayContaining(['ticktick://task/{id}', 'ticktick://project/{id}'])
    );
  });

  it('resources/read по uri из списка возвращает contents задачи', async () => {
    const h = await withConnectedHarness();

    const read = await h.request(2, 'resources/read', {
      uri: 'ticktick://task/task-visible',
      _meta: modernMeta(),
    });

    expect(read.error).toBeUndefined();
    const contents = read.result?.['contents'] as { uri: string; text: string }[];
    expect(contents).toHaveLength(1);
    expect(contents[0]?.uri).toBe('ticktick://task/task-visible');
    expect(JSON.parse(contents[0]?.text ?? '{}')).toMatchObject({ id: 'task-visible' });
    expect(typeof read.result?.['ttlMs']).toBe('number');
    expect(read.result?.['cacheScope']).toBe('private');
  });

  it('resources/read по uri задачи, ОТСУТСТВУЮЩЕЙ на просмотренной странице resources/list, тем не менее работает', async () => {
    const h = await withConnectedHarness();

    // "task-hidden" присутствует в моке данных, но клиент resources/list её
    // не запрашивал в этом тесте вовсе — читаем СРАЗУ, без предварительного
    // listResources, доказывая независимость readResource от текущей
    // просмотренной страницы (см. заголовок файла, DoD п.2).
    const read = await h.request(2, 'resources/read', {
      uri: 'ticktick://task/task-hidden',
      _meta: modernMeta(),
    });

    expect(read.error).toBeUndefined();
    const contents = read.result?.['contents'] as { uri: string; text: string }[];
    expect(contents[0]?.uri).toBe('ticktick://task/task-hidden');
  });

  it('resources/read по uri проекта работает', async () => {
    const h = await withConnectedHarness();

    const read = await h.request(2, 'resources/read', {
      uri: 'ticktick://project/proj-1',
      _meta: modernMeta(),
    });

    expect(read.error).toBeUndefined();
    const contents = read.result?.['contents'] as { uri: string; text: string }[];
    expect(JSON.parse(contents[0]?.text ?? '{}')).toMatchObject({ id: 'proj-1', name: 'Inbox' });
  });

  it('resources/read несуществующего ресурса → JSON-RPC -32602 (НЕ -32002)', async () => {
    const h = await withConnectedHarness();

    const read = await h.request(2, 'resources/read', {
      uri: 'ticktick://task/does-not-exist',
      _meta: modernMeta(),
    });

    expect(read.result).toBeUndefined();
    expect(read.error?.code).toBe(-32602);
  });

  it('resources/read по чужой схеме uri → JSON-RPC -32602', async () => {
    const h = await withConnectedHarness();

    const read = await h.request(2, 'resources/read', {
      uri: 'tracker://issue/PROJ-1',
      _meta: modernMeta(),
    });

    expect(read.result).toBeUndefined();
    expect(read.error?.code).toBe(-32602);
  });
});
