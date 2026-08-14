/**
 * Wire-уровень теста tools/list для AnalyzeIssueDescriptionTool (пакет 6.1 —
 * пилот MCP Apps №1).
 *
 * ИСТОРИЯ: до пакета 6.2 framework/core (`projectToolDefinitionForList()`,
 * `packages/framework/core/src/tool-registry/tools-list-projection.ts`)
 * строило ответ `tools/list` по whitelist полей БЕЗ `_meta` — находка пилота,
 * подтверждённая этим тестом (см. историю файла в git). Пакет 6.2 снял
 * ограничение: `ToolDefinition._meta` — теперь явное поле контракта
 * (`packages/framework/core/src/tools/base/base.types.ts`), и
 * `projectToolDefinitionForList()` пропускает его в whitelist наравне с
 * title/outputSchema/annotations.
 *
 * `AnalyzeIssueDescriptionTool.getDefinition()` (см. tool-файл) кладёт
 * `_meta.ui.resourceUri` на СВОЙ `ToolDefinition` — подтверждено unit-тестом
 * `analyze-issue-description.tool.test.ts`. Тест ниже доказывает, что поле
 * ТЕПЕРЬ доезжает и до реального ответа протокола `tools/list` (тот же
 * `Server`, что использует прод — `buildMcpServer` + `InMemoryTransport`) —
 * по SEP-1865 (https://modelcontextprotocol.io/seps/1865-mcp-apps-interactive-user-interfaces-for-mcp)
 * именно так хост узнаёт о UI-виджете инструмента до его вызова («hosts can
 * prefetch templates before tool execution»).
 */

import { describe, it, expect, afterEach, vi } from 'vitest';
import type { Container } from 'inversify';
import type { Logger } from '@fractalizer/mcp-infrastructure';
import { InMemoryTransport } from '@modelcontextprotocol/server';
import type { Server, JSONRPCMessage } from '@modelcontextprotocol/server';
import { serveStdio } from '@modelcontextprotocol/server/stdio';
import type { StdioServerHandle } from '@modelcontextprotocol/server/stdio';
import { buildMcpServer, ToolRegistry } from '@fractalizer/mcp-core';
import type { McpServerAdapterOptions } from '@fractalizer/mcp-core';

import type { YandexTrackerFacade } from '#tracker_api/facade/index.js';
import { AnalyzeIssueDescriptionTool } from '#tools/api/issues/analyze/index.js';
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

/** Мок-контейнер: тот же приём, что tests/tool-registry.test.ts — резолвит
 * по Symbol.for(ClassName), как это делает реальный composition root
 * (container.ts:bindTools). */
function makeMockContainer(facade: YandexTrackerFacade, logger: Logger): Container {
  return {
    get: vi.fn((symbol: symbol) => {
      if (symbol.toString().includes('AnalyzeIssueDescriptionTool')) {
        return new AnalyzeIssueDescriptionTool(facade, logger);
      }
      throw new Error(`Неожиданный symbol в тестовом контейнере: ${String(symbol)}`);
    }),
  } as unknown as Container;
}

function buildTestServer(): Server {
  const facade = makeMockFacade();
  const logger = makeMockLogger();
  const container = makeMockContainer(facade, logger);
  const toolRegistry = new ToolRegistry(container, logger, [AnalyzeIssueDescriptionTool]);

  const options: McpServerAdapterOptions = {
    serverName: 'analyze-issue-description-tools-list-wire-test',
    version: '0.0.1',
    toolRegistry,
    logger,
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
      name: 'analyze-tools-list-wire-test',
      version: '1.0.0',
    },
    'io.modelcontextprotocol/clientCapabilities': {},
    ...extra,
  };
}

describe('_meta.ui.resourceUri присутствует in-process И доезжает до wire tools/list (пакет 6.2)', () => {
  let harness: InMemoryHarness;

  afterEach(async () => {
    await harness?.close();
  });

  it('in-process: ToolRegistry.getVisibleDefinitions() несёт _meta.ui.resourceUri', () => {
    const facade = makeMockFacade();
    const logger = makeMockLogger();
    const container = makeMockContainer(facade, logger);
    const toolRegistry = new ToolRegistry(container, logger, [AnalyzeIssueDescriptionTool]);

    const definitions = toolRegistry.getVisibleDefinitions() as unknown as Array<{
      name: string;
      _meta?: { ui?: { resourceUri?: string } };
    }>;
    const found = definitions.find((d) => d.name.includes('analyze_issue_description'));

    expect(found?._meta?.ui?.resourceUri).toBe(ISSUE_DESCRIPTION_EDITOR_URI);
  });

  it('wire: tools/list СОДЕРЖИТ _meta.ui.resourceUri (framework/core projectToolDefinitionForList — пакет 6.2)', async () => {
    harness = new InMemoryHarness(buildTestServer);
    await harness.connect();

    const discover = await harness.request(1, 'server/discover', { _meta: modernMeta() });
    expect(discover.result?.['capabilities']).toMatchObject({ tools: {} });

    const list = await harness.request(2, 'tools/list', { _meta: modernMeta() });
    expect(list.error).toBeUndefined();

    const tools = list.result?.['tools'] as Array<Record<string, unknown>>;
    const found = tools.find((t) => String(t['name']).includes('analyze_issue_description'));

    expect(found).toBeDefined();
    const meta = found?.['_meta'] as
      | { ui?: { resourceUri?: string; visibility?: string[] } }
      | undefined;
    expect(meta?.ui?.resourceUri).toBe(ISSUE_DESCRIPTION_EDITOR_URI);
    expect(meta?.ui?.visibility).toEqual(['model', 'app']);
  });
});
