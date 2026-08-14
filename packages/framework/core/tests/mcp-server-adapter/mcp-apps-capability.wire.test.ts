/**
 * Wire-уровень теста capability-negotiation расширения MCP Apps (пакет 6.2 —
 * снятие ограничения пилота MCP Apps, framework/core).
 *
 * SEP-1865 (https://github.com/modelcontextprotocol/ext-apps/blob/main/specification/draft/apps.mdx,
 * раздел «Reservations in MCP») резервирует идентификатор расширения
 * `io.modelcontextprotocol/ui`. Общий механизм капабилити-расширений —
 * SEP-1724: `ServerCapabilities.extensions` — открытая карта
 * `{ [extensionId]: settings }`. `buildServerOptions()`
 * (`packages/framework/core/src/mcp-server-adapter/build-mcp-server.ts`)
 * объявляет расширение безусловно (тем же способом, что и `tools`/
 * `resources`/`prompts` капабилити) — сервер согласовывает поддержку MCP Apps
 * один раз на уровне протокола, а не per-tool.
 *
 * Harness скопирован из `resources.wire.test.ts` (тот же файл в этой папке) —
 * тот же приём: `serveStdio`, а не голый `server.connect()` (era-детекция и
 * ответ на `server/discover` — поведение serving-обёртки, не конструктора
 * `Server`, см. заголовок `resources.wire.test.ts`).
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
import type { McpServerAdapterOptions } from '../../src/mcp-server-adapter/types.js';

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
  const toolRegistry = new ToolRegistry(new Container(), makeMockLogger(), []);

  const options: McpServerAdapterOptions = {
    serverName: 'mcp-apps-capability-wire-test',
    version: '0.0.1',
    toolRegistry,
    logger: makeMockLogger(),
  };

  return buildMcpServer(options);
}

function modernMeta(extra: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    'io.modelcontextprotocol/protocolVersion': '2026-07-28',
    'io.modelcontextprotocol/clientInfo': {
      name: 'mcp-apps-capability-wire-test',
      version: '1.0.0',
    },
    'io.modelcontextprotocol/clientCapabilities': {},
    ...extra,
  };
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

describe('Capability-negotiation расширения MCP Apps (server/discover)', () => {
  let harness: InMemoryHarness;

  afterEach(async () => {
    await harness?.close();
  });

  it('server/discover объявляет extensions["io.modelcontextprotocol/ui"] (SEP-1865/SEP-1724)', async () => {
    harness = new InMemoryHarness(buildTestServer);
    await harness.connect();

    const discover = await harness.request(1, 'server/discover', { _meta: modernMeta() });

    expect(discover.error).toBeUndefined();
    const capabilities = discover.result?.['capabilities'] as
      | { extensions?: Record<string, unknown> }
      | undefined;
    expect(capabilities?.extensions).toMatchObject({ 'io.modelcontextprotocol/ui': {} });
  });
});
