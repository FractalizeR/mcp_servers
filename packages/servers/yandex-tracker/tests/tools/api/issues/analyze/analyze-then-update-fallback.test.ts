/**
 * DoD пилота MCP Apps №1 — «Fallback обязателен и проверяется тестом: тот же
 * сценарий полностью проходится без Apps — инструмент возвращает осмысленный
 * текст с предложением, и правка возможна обычным инструментом обновления».
 *
 * Тест воспроизводит ИМЕННО клиента без MCP Apps (Codex/ChatGPT): он видит
 * только `content[0].text`/`structuredContent` двух ОБЫЧНЫХ tool-вызовов —
 * никакого `_meta`, никакого postMessage, никакого iframe. Агент:
 * 1) вызывает analyze_issue_description, читает suggestedDescription из JSON;
 * 2) сам решает применить (в реальности — после диалога с пользователем) и
 *    вызывает update_issue с этим текстом.
 */

import { describe, it, expect, vi } from 'vitest';
import type { Logger } from '@fractalizer/mcp-infrastructure';
import type { YandexTrackerFacade } from '#tracker_api/facade/index.js';
import { AnalyzeIssueDescriptionTool } from '#tools/api/issues/analyze/index.js';
import { UpdateIssueTool } from '#tools/api/issues/update/index.js';
import type { IssueWithUnknownFields } from '#tracker_api/entities/index.js';

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

interface AnalyzeSuccessPayload {
  success: true;
  data: {
    issueKey: string;
    suggestedDescription: string;
    version?: number;
  };
}

describe('Fallback без MCP Apps: analyze_issue_description → update_issue', () => {
  it('агент читает suggestedDescription из текста результата и применяет его через update_issue', async () => {
    const originalIssue: IssueWithUnknownFields = {
      id: '1',
      key: 'QUEUE-1',
      summary: 'Test',
      queue: { id: '1', key: 'QUEUE', name: 'Queue' },
      createdBy: { id: 'u1', display: 'User' },
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
      description: 'Коротко',
      version: 7,
    };

    const getIssues = vi
      .fn()
      .mockResolvedValue([{ status: 'fulfilled', key: 'QUEUE-1', index: 0, value: originalIssue }]);
    const updateIssue = vi
      .fn()
      .mockResolvedValue({ ...originalIssue, description: 'ignored-by-test' });

    const facade = { getIssues, updateIssue } as unknown as YandexTrackerFacade;
    const logger = makeLogger();

    // Шаг 1 — обычный tool-вызов, БЕЗ какого-либо обращения к _meta/UI.
    const analyzeTool = new AnalyzeIssueDescriptionTool(facade, logger);
    const analyzeResult = await analyzeTool.execute({ issueKey: 'QUEUE-1' });
    expect(analyzeResult.isError).toBeUndefined();

    const analyzePayload = JSON.parse(
      (analyzeResult.content[0] as { text: string }).text
    ) as AnalyzeSuccessPayload;
    expect(analyzePayload.success).toBe(true);
    expect(analyzePayload.data.suggestedDescription.length).toBeGreaterThan(0);
    expect(analyzePayload.data.version).toBe(7);

    // Шаг 2 — «агент решил применить правку» (в реальности после диалога с
    // человеком) обычным существующим инструментом, без UI-канала.
    const updateTool = new UpdateIssueTool(facade, logger);
    const updateResult = await updateTool.execute({
      issueKey: analyzePayload.data.issueKey,
      description: analyzePayload.data.suggestedDescription,
      version: analyzePayload.data.version,
      fields: ['key'],
    });

    expect(updateResult.isError).toBeUndefined();
    expect(updateIssue).toHaveBeenCalledWith(
      'QUEUE-1',
      { description: analyzePayload.data.suggestedDescription },
      7
    );
  });
});
