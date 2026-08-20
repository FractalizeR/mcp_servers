/**
 * Unit тесты для UpdateWorklogTool (единичная сущность, не batch)
 *
 * Детектор незаполненных полей (FIELDS_WITHOUT_VALUE) для одиночного объекта —
 * регрессионное покрытие плана `plan_tool_contract_unification`.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { UpdateWorklogTool } from '#tools/api/worklog/update/index.js';
import type { YandexTrackerFacade } from '#tracker_api/facade/yandex-tracker.facade.js';
import type { Logger } from '@fractalizer/mcp-infrastructure/logging/index.js';
import { createWorklogFixture } from '#helpers/worklog.fixture.js';
import { getTextContent } from '#helpers/tool-result.helper.js';

describe('UpdateWorklogTool', () => {
  let mockTrackerFacade: YandexTrackerFacade;
  let mockLogger: Logger;
  let tool: UpdateWorklogTool;

  beforeEach(() => {
    mockTrackerFacade = {
      updateWorklog: vi.fn(),
    } as unknown as YandexTrackerFacade;

    mockLogger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    } as unknown as Logger;

    tool = new UpdateWorklogTool(mockTrackerFacade, mockLogger);
  });

  describe('Operation calls', () => {
    it('обновляет запись и возвращает отфильтрованные поля под ключом data', async () => {
      const worklog = createWorklogFixture({ id: 'wl1', duration: 'PT2H' });
      vi.mocked(mockTrackerFacade.updateWorklog).mockResolvedValue(worklog);

      const result = await tool.execute({
        issueId: 'TEST-1',
        worklogId: 'wl1',
        duration: '2h',
        fields: ['id', 'duration'],
      });

      expect(result.isError).toBeUndefined();
      const parsed = JSON.parse(getTextContent(result)) as {
        success: boolean;
        data: { data: { id: string; duration: string } };
      };
      expect(parsed.success).toBe(true);
      expect(parsed.data.data.id).toBe('wl1');
      expect(parsed.data.data.duration).toBe('PT2H');
    });

    it('принимает issueId как внутренний 24-символьный hex id', async () => {
      const internalId = '6a86a4f94f009850c7186c67';
      const worklog = createWorklogFixture({ id: 'wl1' });
      vi.mocked(mockTrackerFacade.updateWorklog).mockResolvedValue(worklog);

      const result = await tool.execute({
        issueId: internalId,
        worklogId: 'wl1',
        fields: ['id'],
      });

      expect(result.isError).toBeUndefined();
      expect(mockTrackerFacade.updateWorklog).toHaveBeenCalledWith(
        internalId,
        'wl1',
        expect.any(Object)
      );
    });
  });

  describe('Предупреждения о полях без значения (FIELDS_WITHOUT_VALUE)', () => {
    it('добавляет warning, когда запрошенное поле не пришло', async () => {
      // createWorklogFixture не заполняет updatedBy (запись не редактировалась)
      const worklog = createWorklogFixture({ id: 'wl1' });
      vi.mocked(mockTrackerFacade.updateWorklog).mockResolvedValue(worklog);

      const result = await tool.execute({
        issueId: 'TEST-1',
        worklogId: 'wl1',
        fields: ['id', 'updatedBy.display'],
      });

      const parsed = JSON.parse(getTextContent(result)) as {
        success: boolean;
        warnings?: Array<{ code: string; details?: { fields: string[] } }>;
      };
      expect(parsed.success).toBe(true);
      expect(parsed.warnings).toHaveLength(1);
      expect(parsed.warnings?.[0]?.code).toBe('FIELDS_WITHOUT_VALUE');
      expect(parsed.warnings?.[0]?.details?.fields).toEqual(['updatedBy.display']);
    });

    it('ответ без предупреждений не содержит ключа warnings', async () => {
      const worklog = createWorklogFixture({ id: 'wl1', duration: 'PT1H' });
      vi.mocked(mockTrackerFacade.updateWorklog).mockResolvedValue(worklog);

      const result = await tool.execute({
        issueId: 'TEST-1',
        worklogId: 'wl1',
        fields: ['id', 'duration'],
      });

      const parsed = JSON.parse(getTextContent(result)) as Record<string, unknown>;
      expect('warnings' in parsed).toBe(false);
      expect(
        result['structuredContent'] && 'warnings' in (result['structuredContent'] as object)
      ).toBe(false);
    });
  });

  describe('Error handling', () => {
    it('обрабатывает ошибку фасада', async () => {
      vi.mocked(mockTrackerFacade.updateWorklog).mockRejectedValue(new Error('API Error'));

      const result = await tool.execute({
        issueId: 'TEST-1',
        worklogId: 'wl1',
        fields: ['id'],
      });

      expect(result.isError).toBe(true);
    });
  });
});
