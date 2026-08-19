/**
 * Unit-тесты AnalyzeIssueDescriptionTool (пакет 6.1 — пилот MCP Apps №1).
 *
 * Покрывает DoD пилота на уровне инструмента:
 * 1. getDefinition() объявляет `_meta.ui.resourceUri` (см. предупреждение в
 *    заголовке tool-файла про потерю поля на wire в tools/list — это отдельно
 *    проверяется wire-тестом analyze-issue-description-tools-list.wire.test.ts).
 * 2. Санитайз: description с разметкой/скриптом не просачивается в результат.
 * 3. Fallback: результат — обычный JSON/текст, достаточный для ручной правки
 *    через update_issue без Apps (см. analyze-then-update-fallback.test.ts).
 */

import { describe, it, expect, vi } from 'vitest';
import type { Logger } from '@fractalizer/mcp-infrastructure';
import { ApiErrorClass } from '@fractalizer/mcp-infrastructure';
import type { YandexTrackerFacade } from '#tracker_api/facade/index.js';
import { AnalyzeIssueDescriptionTool } from '#tools/api/issues/analyze/index.js';
import { ISSUE_DESCRIPTION_EDITOR_URI } from '#resources/apps-ui-uri.js';
import type { IssueWithUnknownFields } from '#tracker_api/entities/index.js';
import { createQueueFixture } from '#helpers/queue.fixture.js';

function makeLogger(): Logger {
  return {
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    child: vi.fn(function (this: Logger) {
      return this;
    }),
  } as unknown as Logger;
}

function makeFacade(overrides?: Partial<YandexTrackerFacade>): YandexTrackerFacade {
  return {
    getIssues: vi.fn(),
    ...overrides,
  } as unknown as YandexTrackerFacade;
}

interface SuccessPayload {
  success: true;
  data: {
    issueKey: string;
    currentDescription: string;
    suggestedDescription: string;
    notes: string[];
    version?: number;
  };
}

interface ErrorPayload {
  success: false;
  message: string;
}

describe('AnalyzeIssueDescriptionTool', () => {
  it('getDefinition() объявляет _meta.ui.resourceUri (SEP-1865)', () => {
    const tool = new AnalyzeIssueDescriptionTool(makeFacade(), makeLogger());
    const definition = tool.getDefinition() as unknown as {
      _meta?: { ui?: { resourceUri?: string; visibility?: string[] } };
    };
    expect(definition._meta?.ui?.resourceUri).toBe(ISSUE_DESCRIPTION_EDITOR_URI);
    expect(definition._meta?.ui?.visibility).toEqual(['model', 'app']);
  });

  it('outputSchema/annotations спроецированы из METADATA (readOnlyHint: true)', () => {
    const tool = new AnalyzeIssueDescriptionTool(makeFacade(), makeLogger());
    const definition = tool.getDefinition();
    expect(definition.outputSchema).toBeDefined();
    expect(definition.annotations).toEqual({
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    });
  });

  it('санитайзит description со скриптом перед анализом и возвратом', async () => {
    const mockIssue: IssueWithUnknownFields = {
      id: '1',
      key: 'QUEUE-1',
      summary: 'Test',
      queue: createQueueFixture({ id: '1', key: 'QUEUE', name: 'Queue' }),
      createdBy: { id: 'u1', display: 'User' },
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
      description: 'Легитимный текст<script>alert(document.cookie)</script> и продолжение',
      version: 3,
    };
    const getIssues = vi
      .fn()
      .mockResolvedValue([{ status: 'fulfilled', key: 'QUEUE-1', index: 0, value: mockIssue }]);
    const tool = new AnalyzeIssueDescriptionTool(makeFacade({ getIssues }), makeLogger());

    const result = await tool.execute({ issueKey: 'QUEUE-1' });

    expect(getIssues).toHaveBeenCalledWith(['QUEUE-1']);
    const payload = JSON.parse((result.content[0] as { text: string }).text) as SuccessPayload;
    expect(payload.success).toBe(true);
    expect(payload.data.currentDescription).not.toMatch(/[<>]/);
    expect(payload.data.currentDescription).not.toContain('script');
    expect(payload.data.currentDescription).toBe('Легитимный текст и продолжение');
    expect(payload.data.version).toBe(3);
    expect(result['structuredContent']).toEqual(payload);
  });

  it('пустое description → suggestedDescription содержит шаблон разделов', async () => {
    const mockIssue: IssueWithUnknownFields = {
      id: '2',
      key: 'QUEUE-2',
      summary: 'Test 2',
      queue: createQueueFixture({ id: '1', key: 'QUEUE', name: 'Queue' }),
      createdBy: { id: 'u1', display: 'User' },
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    };
    const getIssues = vi
      .fn()
      .mockResolvedValue([{ status: 'fulfilled', key: 'QUEUE-2', index: 0, value: mockIssue }]);
    const tool = new AnalyzeIssueDescriptionTool(makeFacade({ getIssues }), makeLogger());

    const result = await tool.execute({ issueKey: 'QUEUE-2' });
    const payload = JSON.parse((result.content[0] as { text: string }).text) as SuccessPayload;

    expect(payload.data.currentDescription).toBe('');
    expect(payload.data.suggestedDescription).toContain('## Контекст');
    expect(payload.data.notes.length).toBeGreaterThan(0);
    expect(payload.data.version).toBeUndefined();
  });

  it('несуществующая задача (404) → formatError, не бросает исключение', async () => {
    const getIssues = vi.fn().mockResolvedValue([
      {
        status: 'rejected',
        key: 'QUEUE-404',
        index: 0,
        reason: new ApiErrorClass(404, 'Not found'),
      },
    ]);
    const tool = new AnalyzeIssueDescriptionTool(makeFacade({ getIssues }), makeLogger());

    const result = await tool.execute({ issueKey: 'QUEUE-404' });

    expect(result.isError).toBe(true);
    const payload = JSON.parse((result.content[0] as { text: string }).text) as ErrorPayload;
    expect(payload.success).toBe(false);
  });

  it('невалидные параметры (issueKey неверного формата) → ошибка валидации', async () => {
    const tool = new AnalyzeIssueDescriptionTool(makeFacade(), makeLogger());

    const result = await tool.execute({ issueKey: 'not-a-key' });

    expect(result.isError).toBe(true);
  });
});
