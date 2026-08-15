/**
 * Wire-уровень тестов resources/* для Wiki (аудит внешнего ревью,
 * REVIEW_MCP_SDK_FINDINGS.md — M8) — реальный `Server` SDK через
 * `ResourceRegistry` + три провайдера Wiki (страница/ресурс-страницы/
 * комментарий) с мок `YandexWikiFacade`, по образцу
 * `packages/servers/yandex-tracker/tests/resources/tracker-resources.wire.test.ts`.
 *
 * У Wiki, в отличие от Трекера, нет фабрики `createXResourceRegistry()` —
 * регистрация инлайн в `composition-root/container.ts` (см. L5 отчёта),
 * поэтому здесь она воспроизведена локально (те же 3 провайдера, тот же
 * порядок), не импортируется.
 *
 * Проверяет:
 * 1. Маршрутизация URI трёх схем (`wiki://page/...`,
 *    `wiki://page-resource/...`, `wiki://page-comment/...`) на правильный
 *    провайдер через ОДИН `resources/read`.
 * 2. Несуществующий ресурс / чужая схема → JSON-RPC -32602 (не -32002).
 * 3. `resources/list` несёт `ttlMs`/`cacheScope` (даже пустой — все три
 *    провайдера Wiki намеренно возвращают `listResources: []`, см. заголовки
 *    провайдеров).
 * 4. `resources/templates/list` отдаёт шаблоны всех трёх схем.
 */

import { describe, it, expect, afterEach, vi } from 'vitest';
import { ApiErrorClass } from '@fractalizer/mcp-infrastructure';
import { InMemoryTransport } from '@modelcontextprotocol/server';
import type { Server, JSONRPCMessage } from '@modelcontextprotocol/server';
import { serveStdio } from '@modelcontextprotocol/server/stdio';
import type { StdioServerHandle } from '@modelcontextprotocol/server/stdio';
import { buildMcpServer, ToolRegistry, ResourceRegistry } from '@fractalizer/mcp-core';
import type { McpServerAdapterOptions } from '@fractalizer/mcp-core';
import { Container } from 'inversify';

import { WikiPageResourceProvider } from '#resources/wiki-page-resource.provider.js';
import { WikiPageItemResourceProvider } from '#resources/wiki-page-item-resource.provider.js';
import { WikiPageCommentResourceProvider } from '#resources/wiki-page-comment-resource.provider.js';
import type { YandexWikiFacade } from '#wiki_api/facade/yandex-wiki.facade.js';
import { createMockFacade, createMockLogger, createPageFixture } from '#helpers/index.js';

function buildTestServer(): Server {
  const facade = createMockFacade() as YandexWikiFacade;
  vi.mocked(facade.getPage).mockImplementation(({ slug }) =>
    slug === 'users/docs/readme'
      ? Promise.resolve(createPageFixture({ slug, title: 'Readme', content: 'Тело страницы' }))
      : Promise.reject(new ApiErrorClass(404, 'Not found'))
  );

  const resourceRegistry = new ResourceRegistry();
  resourceRegistry.register(new WikiPageResourceProvider(facade));
  resourceRegistry.register(new WikiPageItemResourceProvider(facade));
  resourceRegistry.register(new WikiPageCommentResourceProvider(facade));

  const toolRegistry = new ToolRegistry(new Container(), createMockLogger(), []);

  const options: McpServerAdapterOptions = {
    serverName: 'wiki-resources-wire-test',
    version: '0.0.1',
    toolRegistry,
    resourceRegistry,
    logger: createMockLogger(),
  };

  return buildMcpServer(options);
}

function modernMeta(extra: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    'io.modelcontextprotocol/protocolVersion': '2026-07-28',
    'io.modelcontextprotocol/clientInfo': { name: 'wiki-resources-wire-test', version: '1.0.0' },
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

describe('Wiki: resources/* через реальный Server (wire-уровень)', () => {
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

  it('resources/list несёт ttlMs/cacheScope даже пустым (нет эндпоинта полного обзора)', async () => {
    const h = await withConnectedHarness();

    const list = await h.request(2, 'resources/list', { _meta: modernMeta() });

    expect(list.error).toBeUndefined();
    expect(list.result?.['resources']).toEqual([]);
    expect(typeof list.result?.['ttlMs']).toBe('number');
    expect(list.result?.['cacheScope']).toBeDefined();
  });

  it('resources/templates/list отдаёт шаблоны всех трёх схем Wiki', async () => {
    const h = await withConnectedHarness();

    const templates = await h.request(2, 'resources/templates/list', { _meta: modernMeta() });

    expect(templates.error).toBeUndefined();
    const list = templates.result?.['resourceTemplates'] as Array<{ uriTemplate: string }>;
    const uriTemplates = list.map((t) => t.uriTemplate).sort();
    expect(uriTemplates).toEqual(
      [
        'wiki://page/{slug}',
        'wiki://page-resource/{pageId}/{type}/{name}',
        'wiki://page-comment/{pageId}/{commentId}',
      ].sort()
    );
  });

  it('маршрутизация: resources/read по wiki://page/{slug} идёт в WikiPageResourceProvider', async () => {
    const h = await withConnectedHarness();

    const read = await h.request(2, 'resources/read', {
      uri: 'wiki://page/users/docs/readme',
      _meta: modernMeta(),
    });

    expect(read.error).toBeUndefined();
    const contents = read.result?.['contents'] as Array<{ uri: string; text: string }>;
    expect(contents).toHaveLength(1);
    expect(contents[0]?.uri).toBe('wiki://page/users/docs/readme');
    expect(contents[0]?.text).toContain('Тело страницы');
  });

  it('маршрутизация: resources/read по wiki://page-resource/... идёт в WikiPageItemResourceProvider', async () => {
    const facade = createMockFacade() as YandexWikiFacade;
    vi.mocked(facade.getResources).mockResolvedValue({
      results: [{ type: 'attachment', item: { name: 'doc.pdf' } }],
    });

    const resourceRegistry = new ResourceRegistry();
    resourceRegistry.register(new WikiPageItemResourceProvider(facade));
    const toolRegistry = new ToolRegistry(new Container(), createMockLogger(), []);
    const localHarness = new InMemoryHarness(() =>
      buildMcpServer({
        serverName: 'wiki-resources-wire-test-item',
        version: '0.0.1',
        toolRegistry,
        resourceRegistry,
        logger: createMockLogger(),
      })
    );
    await localHarness.connect();
    await localHarness.request(1, 'server/discover', { _meta: modernMeta() });

    const read = await localHarness.request(2, 'resources/read', {
      uri: 'wiki://page-resource/123/attachment/doc.pdf',
      _meta: modernMeta(),
    });

    expect(read.error).toBeUndefined();
    const contents = read.result?.['contents'] as Array<{ uri: string; mimeType: string }>;
    expect(contents[0]?.mimeType).toBe('application/json');

    await localHarness.close();
  });

  it('несуществующий ресурс (URI своей схемы) → JSON-RPC -32602 (НЕ -32002)', async () => {
    const h = await withConnectedHarness();

    const read = await h.request(2, 'resources/read', {
      uri: 'wiki://page/no-such-page',
      _meta: modernMeta(),
    });

    expect(read.result).toBeUndefined();
    expect(read.error?.code).toBe(-32602);
  });

  it('чужая схема URI → JSON-RPC -32602', async () => {
    const h = await withConnectedHarness();

    const read = await h.request(2, 'resources/read', {
      uri: 'tracker://issue/PROJ-1',
      _meta: modernMeta(),
    });

    expect(read.result).toBeUndefined();
    expect(read.error?.code).toBe(-32602);
  });
});
