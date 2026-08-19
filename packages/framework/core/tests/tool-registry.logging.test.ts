/**
 * Тесты redaction логирования в ToolRegistry.execute()
 *
 * Пакет 1.1.B плана модернизации: `logger.debug('Параметры вызова:', params)`
 * писал params «как есть» в файловый лог. Эти тесты фиксируют, что:
 * - секретное/приватное значение параметра не попадает НИ В ОДИН вызов
 *   логгера (debug/info/warn/error), включая случай ошибки исполнения tool;
 * - имена параметров в логе сохраняются — отладка не деградировала.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ToolRegistry, type ToolConstructor } from '../src/tool-registry/index.js';
import { BaseTool } from '../src/tools/base/base-tool.js';
import type { Container } from 'inversify';
import type { Logger, ToolCallParams, ToolResult } from '@fractalizer/mcp-infrastructure';
import {
  ToolCategory,
  ToolPriority,
  type StaticToolMetadata,
  type ToolDefinition,
} from '../src/tools/base/index.js';

const SECRET_MARKER = 'UNIQUE_SECRET_MARKER_b81e4f0d';

class EchoTool extends BaseTool<void> {
  static override METADATA: StaticToolMetadata = {
    name: 'echo_tool',
    description: 'Echo tool for logging tests',
    category: ToolCategory.SYSTEM,
    priority: ToolPriority.NORMAL,
    tags: [],
    isHelper: true,
  };

  constructor(logger: Logger) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    super(null as any, logger);
  }

  override getDefinition(): ToolDefinition {
    return {
      name: 'echo_tool',
      description: 'Echo tool',
      inputSchema: { type: 'object' as const, properties: {}, required: [] },
    };
  }

  override async execute(_params: ToolCallParams): Promise<ToolResult> {
    return { content: [{ type: 'text', text: 'ok' }], isError: false };
  }
}

class ThrowingTool extends EchoTool {
  static override METADATA: StaticToolMetadata = {
    ...EchoTool.METADATA,
    name: 'throwing_tool',
  };

  override getDefinition(): ToolDefinition {
    return {
      name: 'throwing_tool',
      description: 'Throws',
      inputSchema: { type: 'object' as const, properties: {}, required: [] },
    };
  }

  override async execute(_params: ToolCallParams): Promise<ToolResult> {
    throw new Error(`Failure while processing ${SECRET_MARKER}`);
  }
}

/** Собирает ВСЕ строковые/объектные аргументы всех вызовов всех методов логгера */
function collectAllLoggedArgs(mockLogger: Logger): unknown[] {
  const spies = [mockLogger.debug, mockLogger.info, mockLogger.warn, mockLogger.error].map((fn) =>
    vi.mocked(fn)
  );
  return spies.flatMap((spy) => spy.mock.calls.flat());
}

function buildRegistry(ToolClass: ToolConstructor, mockLogger: Logger): ToolRegistry {
  const mockContainer = {
    get: vi.fn(() => new (ToolClass as unknown as new (logger: Logger) => BaseTool)(mockLogger)),
  } as unknown as Container;

  return new ToolRegistry(mockContainer, mockLogger, [ToolClass]);
}

describe('ToolRegistry.execute — redaction логирования (пакет 1.1.B)', () => {
  let mockLogger: Logger;

  beforeEach(() => {
    mockLogger = {
      info: vi.fn(),
      debug: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      child: vi.fn(() => mockLogger),
    } as unknown as Logger;
  });

  it('секретный параметр не попадает ни в один вызов логгера при успешном исполнении', async () => {
    const registry = buildRegistry(EchoTool as unknown as ToolConstructor, mockLogger);

    await registry.execute('echo_tool', { comment: `текст содержит ${SECRET_MARKER}` });

    const allArgs = collectAllLoggedArgs(mockLogger);
    const serialized = JSON.stringify(allArgs);
    expect(serialized).not.toContain(SECRET_MARKER);
  });

  it('секретный параметр не попадает в лог даже при ошибке исполнения tool', async () => {
    const registry = buildRegistry(ThrowingTool as unknown as ToolConstructor, mockLogger);

    await registry.execute('throwing_tool', {
      comment: `входной секрет ${SECRET_MARKER}-INPUT`,
    });

    // Само сообщение об ошибке (из Error, не из params) допустимо содержать маркер —
    // это не params. Проверяем отдельно, что INPUT-вариант (из params) не утёк.
    const allArgs = collectAllLoggedArgs(mockLogger);
    const serialized = JSON.stringify(allArgs);
    expect(serialized).not.toContain(`${SECRET_MARKER}-INPUT`);
  });

  it('имена параметров сохраняются в debug-логе — отладка не деградировала', async () => {
    const registry = buildRegistry(EchoTool as unknown as ToolConstructor, mockLogger);

    await registry.execute('echo_tool', { issueId: 'TEST-1', comment: 'text', queue: 'TEST' });

    const debugCalls = (mockLogger.debug as unknown as { mock: { calls: unknown[][] } }).mock.calls;
    const paramsLogCall = debugCalls.find(
      (call) => typeof call[0] === 'string' && call[0].includes('Параметры вызова')
    );

    expect(paramsLogCall).toBeDefined();
    const loggedShape = paramsLogCall?.[1] as Record<string, unknown>;
    expect(Object.keys(loggedShape).sort()).toEqual(['comment', 'issueId', 'queue']);
  });

  it('строковое значение параметра заменяется на маркер с длиной, не с префиксом', async () => {
    const registry = buildRegistry(EchoTool as unknown as ToolConstructor, mockLogger);
    const secretValue = 'sk-abcdef0123456789TAIL';

    await registry.execute('echo_tool', { token: secretValue });

    const debugCalls = (mockLogger.debug as unknown as { mock: { calls: unknown[][] } }).mock.calls;
    const paramsLogCall = debugCalls.find(
      (call) => typeof call[0] === 'string' && call[0].includes('Параметры вызова')
    );
    const loggedShape = paramsLogCall?.[1] as Record<string, { type: string; length: number }>;

    expect(loggedShape['token']).toEqual({ type: 'string', length: secretValue.length });
    expect(JSON.stringify(loggedShape)).not.toContain(secretValue.slice(0, 5));
  });
});
