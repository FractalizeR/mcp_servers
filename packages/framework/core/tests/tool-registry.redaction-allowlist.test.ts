/**
 * Тесты allow-list для redaction логов (пакет 3.1.F)
 *
 * Долг пакета 1.1.B: `redactParams()` умеет принимать allow-list имён
 * параметров, безопасных для лога, но `ToolRegistry.execute()` подключал его
 * пустым — ни одно значение параметра не раскрывалось. Пакет 3.1.F заводит
 * поле `StaticToolMetadata.redactionAllowlist` и прокидывает его в
 * `redactParams()` внутри `execute()`.
 *
 * Эти тесты проверяют именно ПРОВОДКУ метаданные → `redactParams()`, а не
 * сам редактор (он покрыт `params-redactor.test.ts`).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ToolRegistry, type ToolConstructor } from '../src/tool-registry/index.js';
import { BaseTool } from '../src/tools/base/base-tool.js';
import type { Container } from 'inversify';
import type { Logger, ToolCallParams, ToolResult } from '@fractalizer/mcp-infrastructure';
import type { ToolDefinition } from '../src/tools/base/index.js';

const SECRET_MARKER = 'UNIQUE_SECRET_MARKER_c4e1a9d7';

/** Tool БЕЗ заполненного redactionAllowlist — контроль регрессии (DoD п.4) */
class LegacyTool extends BaseTool<void> {
  static override METADATA = {
    name: 'legacy_tool',
    description: 'Tool without redactionAllowlist',
    category: 'test',
    priority: 'normal' as const,
    tags: [],
    isHelper: true,
  };

  constructor(logger: Logger) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    super(null as any, logger);
  }

  override getDefinition(): ToolDefinition {
    return {
      name: 'legacy_tool',
      description: 'Legacy tool',
      inputSchema: { type: 'object' as const, properties: {}, required: [] },
    };
  }

  override async execute(_params: ToolCallParams): Promise<ToolResult> {
    return { content: [{ type: 'text', text: 'ok' }], isError: false };
  }
}

/** Tool С заполненным redactionAllowlist: issueId и queue объявлены безопасными */
class AllowlistedTool extends LegacyTool {
  static override METADATA = {
    ...LegacyTool.METADATA,
    name: 'allowlisted_tool',
    redactionAllowlist: ['issueId', 'queue'] as const,
  };

  override getDefinition(): ToolDefinition {
    return {
      name: 'allowlisted_tool',
      description: 'Allowlisted tool',
      inputSchema: { type: 'object' as const, properties: {}, required: [] },
    };
  }
}

function buildRegistry(ToolClass: ToolConstructor, mockLogger: Logger): ToolRegistry {
  const mockContainer = {
    get: vi.fn(() => new (ToolClass as unknown as new (logger: Logger) => BaseTool)(mockLogger)),
  } as unknown as Container;

  return new ToolRegistry(mockContainer, mockLogger, [ToolClass]);
}

function findParamsLogCall(mockLogger: Logger): Record<string, unknown> {
  const debugCalls = (mockLogger.debug as unknown as { mock: { calls: unknown[][] } }).mock.calls;
  const call = debugCalls.find(
    (entry) => typeof entry[0] === 'string' && entry[0].includes('Параметры вызова')
  );
  if (!call) {
    throw new Error('Лог параметров вызова не найден');
  }
  return call[1] as Record<string, unknown>;
}

describe('ToolRegistry.execute — allow-list redaction из метаданных (пакет 3.1.F)', () => {
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

  it('DoD 1: параметр, объявленный безопасным в redactionAllowlist, виден в логе как значение', async () => {
    const registry = buildRegistry(AllowlistedTool as unknown as ToolConstructor, mockLogger);

    await registry.execute('allowlisted_tool', { issueId: 'TEST-42', queue: 'TESTQ' });

    const loggedShape = findParamsLogCall(mockLogger);
    expect(loggedShape['issueId']).toBe('TEST-42');
    expect(loggedShape['queue']).toBe('TESTQ');
  });

  it('DoD 2: параметр, НЕ объявленный в redactionAllowlist, остаётся маркером с длиной', async () => {
    const registry = buildRegistry(AllowlistedTool as unknown as ToolConstructor, mockLogger);
    const secretComment = `приватный текст ${SECRET_MARKER}`;

    await registry.execute('allowlisted_tool', {
      issueId: 'TEST-42',
      comment: secretComment,
    });

    const loggedShape = findParamsLogCall(mockLogger);
    expect(loggedShape['comment']).toEqual({ type: 'string', length: secretComment.length });
    expect(JSON.stringify(loggedShape)).not.toContain(SECRET_MARKER);
  });

  it('DoD 3: значение сверх лимита длины обрезается, даже будучи в allow-list', async () => {
    const registry = buildRegistry(AllowlistedTool as unknown as ToolConstructor, mockLogger);
    const longValue = 'x'.repeat(10_000);

    await registry.execute('allowlisted_tool', { issueId: longValue });

    const loggedShape = findParamsLogCall(mockLogger);
    const shape = loggedShape['issueId'] as { value: string; length: number; truncated: boolean };
    expect(shape.truncated).toBe(true);
    expect(shape.length).toBe(10_000);
    expect(shape.value.length).toBeLessThan(600);
  });

  it('DoD 4 (регрессия): tool без заполненного redactionAllowlist ведёт себя ровно как до пакета — ничего не раскрывается', async () => {
    const registry = buildRegistry(LegacyTool as unknown as ToolConstructor, mockLogger);

    await registry.execute('legacy_tool', { issueId: 'TEST-42', comment: SECRET_MARKER });

    const loggedShape = findParamsLogCall(mockLogger);
    expect(loggedShape['issueId']).toEqual({ type: 'string', length: 'TEST-42'.length });
    expect(loggedShape['comment']).toEqual({ type: 'string', length: SECRET_MARKER.length });
    expect(JSON.stringify(loggedShape)).not.toContain(SECRET_MARKER);
  });

  it('DoD 4 (регрессия): tool без redactionAllowlist ведёт себя как без tool вовсе (не найден) — оба дают пустой allow-list', async () => {
    const registry = buildRegistry(LegacyTool as unknown as ToolConstructor, mockLogger);

    // Вызов несуществующего инструмента: getRedactionAllowlist(undefined) должен
    // так же не бросать и не раскрывать ничего.
    await expect(
      registry.execute('does_not_exist', { comment: SECRET_MARKER })
    ).resolves.toBeDefined();

    const loggedShape = findParamsLogCall(mockLogger);
    expect(loggedShape['comment']).toEqual({ type: 'string', length: SECRET_MARKER.length });
  });
});
