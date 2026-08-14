/**
 * Wire-уровень теста resources/read для виджета MCP Apps пилота №1 (пакет 6.1)
 * — реальный `Server` SDK через `createTrackerResourceRegistry()`, тот же
 * harness-приём, что и `tracker-resources.wire.test.ts`.
 *
 * Доказывает эмпирически (не только чтением кода) утверждение из заголовка
 * `issue-description-editor-resource-provider.ts`: в отличие от `tools/list`
 * (см. `analyze-issue-description-tools-list.wire.test.ts` — там `_meta`
 * теряется), `resources/read` прокидывает `_meta` без потерь — DoD 5 пилота
 * («CSP объявлен в `_meta.ui.csp`; внешние origin не разрешены») реально
 * достигает клиента, а не только внутрипроцессного вызова провайдера.
 */

import { describe, it, expect, afterEach, vi } from 'vitest';
import type { Logger } from '@fractalizer/mcp-infrastructure';
import { InMemoryTransport } from '@modelcontextprotocol/server';
import type { Server, JSONRPCMessage } from '@modelcontextprotocol/server';
import { serveStdio } from '@modelcontextprotocol/server/stdio';
import type { StdioServerHandle } from '@modelcontextprotocol/server/stdio';
import { buildMcpServer, ToolRegistry } from '@fractalizer/mcp-core';
import type { McpServerAdapterOptions } from '@fractalizer/mcp-core';
import { Container } from 'inversify';

import type { YandexTrackerFacade } from '#tracker_api/facade/index.js';
import { createTrackerResourceRegistry } from '#resources/index.js';
import { ISSUE_DESCRIPTION_EDITOR_URI } from '#resources/apps-ui-uri.js';

function makeMockFacade(): YandexTrackerFacade {
  return { getIssues: vi.fn() } as unknown as YandexTrackerFacade;
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
  const resourceRegistry = createTrackerResourceRegistry(facade);
  const toolRegistry = new ToolRegistry(new Container(), makeMockLogger(), []);

  const options: McpServerAdapterOptions = {
    serverName: 'issue-description-editor-wire-test',
    version: '0.0.1',
    toolRegistry,
    resourceRegistry,
    logger: makeMockLogger(),
  };

  return buildMcpServer(options);
}

interface JsonRpcResponseLike {
  jsonrpc: '2.0';
  id: number;
  result?: Record<string, unknown>;
  error?: { code: number; message: string };
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

function modernMeta(extra: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    'io.modelcontextprotocol/protocolVersion': '2026-07-28',
    'io.modelcontextprotocol/clientInfo': {
      name: 'issue-description-editor-wire-test',
      version: '1.0.0',
    },
    'io.modelcontextprotocol/clientCapabilities': {},
    ...extra,
  };
}

describe('MCP Apps пилот №1: resources/read для ui://tracker/issue-description-editor (wire-уровень)', () => {
  let harness: InMemoryHarness;

  afterEach(async () => {
    await harness?.close();
  });

  it('DoD 1: resources/read по фиксированному ui:// URI отдаёт HTML-бандл', async () => {
    harness = new InMemoryHarness(buildTestServer);
    await harness.connect();
    await harness.request(1, 'server/discover', { _meta: modernMeta() });

    const read = await harness.request(2, 'resources/read', {
      uri: ISSUE_DESCRIPTION_EDITOR_URI,
      _meta: modernMeta(),
    });

    expect(read.error).toBeUndefined();
    const contents = read.result?.['contents'] as Array<{
      uri: string;
      mimeType: string;
      text: string;
    }>;
    expect(contents).toHaveLength(1);
    expect(contents[0]?.uri).toBe(ISSUE_DESCRIPTION_EDITOR_URI);
    expect(contents[0]?.mimeType).toBe('text/html;profile=mcp-app');
    expect(contents[0]?.text).toContain('<html');
  });

  it('DoD 5: _meta.ui.csp доезжает до wire resources/read без потерь (пустые списки — 0 внешних origin)', async () => {
    harness = new InMemoryHarness(buildTestServer);
    await harness.connect();
    await harness.request(1, 'server/discover', { _meta: modernMeta() });

    const read = await harness.request(2, 'resources/read', {
      uri: ISSUE_DESCRIPTION_EDITOR_URI,
      _meta: modernMeta(),
    });

    const contents = read.result?.['contents'] as Array<{
      _meta?: {
        ui?: {
          csp?: {
            connectDomains: string[];
            resourceDomains: string[];
            frameDomains: string[];
            baseUriDomains: string[];
          };
        };
      };
    }>;
    const csp = contents[0]?._meta?.ui?.csp;

    expect(csp).toBeDefined();
    expect(csp?.connectDomains).toEqual([]);
    expect(csp?.resourceDomains).toEqual([]);
    expect(csp?.frameDomains).toEqual([]);
    expect(csp?.baseUriDomains).toEqual([]);
  });

  it('resources/read по несуществующему ui:// URI → -32602 (ResourceNotFoundError)', async () => {
    harness = new InMemoryHarness(buildTestServer);
    await harness.connect();
    await harness.request(1, 'server/discover', { _meta: modernMeta() });

    const read = await harness.request(2, 'resources/read', {
      uri: 'ui://tracker/does-not-exist',
      _meta: modernMeta(),
    });

    expect(read.result).toBeUndefined();
    expect(read.error?.code).toBe(-32602);
  });
});
