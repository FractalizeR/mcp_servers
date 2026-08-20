/**
 * Unit тесты для AddWorklogTool (batch режим)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AddWorklogTool } from '#tools/api/worklog/add/index.js';
import type { YandexTrackerFacade } from '#tracker_api/facade/yandex-tracker.facade.js';
import type { Logger } from '@fractalizer/mcp-infrastructure/logging/index.js';
import type { WorklogWithUnknownFields } from '#tracker_api/entities/index.js';
import { buildToolName } from '@fractalizer/mcp-core';
import { MCP_TOOL_PREFIX } from '#constants';
import { getTextContent, itemAt } from '#helpers/tool-result.helper.js';

describe('AddWorklogTool', () => {
  let mockTrackerFacade: YandexTrackerFacade;
  let mockLogger: Logger;
  let tool: AddWorklogTool;

  beforeEach(() => {
    mockTrackerFacade = {
      addWorklogsMany: vi.fn(),
    } as unknown as YandexTrackerFacade;

    mockLogger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    } as unknown as Logger;

    tool = new AddWorklogTool(mockTrackerFacade, mockLogger);
  });

  describe('getDefinition', () => {
    it('должен иметь корректное имя yandex_tracker_add_worklog', () => {
      const definition = tool.getDefinition();

      expect(definition.name).toBe(buildToolName('add_worklog', MCP_TOOL_PREFIX));
    });
  });

  describe('Batch operations', () => {
    it('должен привести worklogId к строке, когда API вернул id числом (регрессия -32602)', async () => {
      // Реальный API v2 возвращает id записи времени числом, а не строкой —
      // раньше это валило outputSchema с "worklogId must be string".
      const numericIdWorklog = {
        id: 12345,
        duration: 'PT1H',
      } as unknown as WorklogWithUnknownFields;

      vi.mocked(mockTrackerFacade.addWorklogsMany).mockResolvedValue([
        { status: 'fulfilled', key: 'TEST-1', value: numericIdWorklog, index: 0 },
      ]);

      // id НЕ запрошен в fields — инструмент обязан вернуть его для worklogId.
      const result = await tool.execute({
        worklogs: [{ issueId: 'TEST-1', start: '2026-08-16T10:00:00.000+0000', duration: 'PT1H' }],
        fields: ['duration'],
      });

      expect(result.isError).toBeUndefined();
      const parsed = JSON.parse(getTextContent(result)) as {
        success: boolean;
        data: { successful: Array<{ issueId: string; worklogId: string }> };
      };
      expect(itemAt(parsed.data.successful).issueId).toBe('TEST-1');
      expect(itemAt(parsed.data.successful).worklogId).toBe('12345');
    });
  });
});
