/**
 * Unit тесты для BulkMoveIssuesTool
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BulkMoveIssuesTool } from '#tools/api/bulk-change/move/index.js';
import type { YandexTrackerFacade } from '#tracker_api/facade/yandex-tracker.facade.js';
import type { Logger } from '@fractalizer/mcp-infrastructure/logging/index.js';
import type { BulkChangeOperationWithUnknownFields } from '#tracker_api/entities/index.js';
import { getTextContent } from '#helpers/tool-result.helper.js';

describe('BulkMoveIssuesTool', () => {
  let mockTrackerFacade: YandexTrackerFacade;
  let mockLogger: Logger;
  let tool: BulkMoveIssuesTool;

  const mockOperation: BulkChangeOperationWithUnknownFields = {
    id: 'op-1',
    self: 'https://api.tracker.yandex.net/v2/bulkchange/op-1',
    status: 'CREATED',
    totalIssues: 2,
  };

  beforeEach(() => {
    mockTrackerFacade = {
      bulkMoveIssues: vi.fn(),
    } as unknown as YandexTrackerFacade;

    mockLogger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    } as unknown as Logger;

    tool = new BulkMoveIssuesTool(mockTrackerFacade, mockLogger);
  });

  describe('Validation', () => {
    it('должен требовать параметры issueIds и queue', async () => {
      const result = await tool.execute({});

      expect(result.isError).toBe(true);
    });
  });

  describe('Operation calls', () => {
    it('должен вызвать bulkMoveIssues без initialStatus, если он не указан', async () => {
      vi.mocked(mockTrackerFacade.bulkMoveIssues).mockResolvedValue(mockOperation);

      await tool.execute({
        issueIds: ['QUEUE1-1', 'QUEUE1-2'],
        queue: 'QUEUE2',
      });

      expect(mockTrackerFacade.bulkMoveIssues).toHaveBeenCalledWith({
        issues: ['QUEUE1-1', 'QUEUE1-2'],
        queue: 'QUEUE2',
      });
    });

    // Регрессионный тест для дефекта: initialStatus отсутствовал в schema/DTO/operation —
    // задача при перемещении в очередь с другим workflow оставалась в несуществующем статусе.
    it('должен передать initialStatus=true в facade.bulkMoveIssues', async () => {
      vi.mocked(mockTrackerFacade.bulkMoveIssues).mockResolvedValue(mockOperation);

      await tool.execute({
        issueIds: ['QUEUE1-1', 'QUEUE1-2'],
        queue: 'QUEUE2',
        initialStatus: true,
      });

      expect(mockTrackerFacade.bulkMoveIssues).toHaveBeenCalledWith({
        issues: ['QUEUE1-1', 'QUEUE1-2'],
        queue: 'QUEUE2',
        initialStatus: true,
      });
    });

    it('должен передать initialStatus=false в facade.bulkMoveIssues', async () => {
      vi.mocked(mockTrackerFacade.bulkMoveIssues).mockResolvedValue(mockOperation);

      await tool.execute({
        issueIds: ['QUEUE1-1'],
        queue: 'QUEUE2',
        initialStatus: false,
      });

      expect(mockTrackerFacade.bulkMoveIssues).toHaveBeenCalledWith({
        issues: ['QUEUE1-1'],
        queue: 'QUEUE2',
        initialStatus: false,
      });
    });

    it('должен вернуть initialStatus в результате', async () => {
      vi.mocked(mockTrackerFacade.bulkMoveIssues).mockResolvedValue(mockOperation);

      const result = await tool.execute({
        issueIds: ['QUEUE1-1'],
        queue: 'QUEUE2',
        initialStatus: true,
      });

      expect(result.isError).toBeUndefined();
      const parsed = JSON.parse(getTextContent(result)) as {
        success: boolean;
        data: { initialStatus: boolean };
      };
      expect(parsed.success).toBe(true);
      expect(parsed.data.initialStatus).toBe(true);
    });
  });

  describe('Error handling', () => {
    it('должен обработать ошибки от operation', async () => {
      const error = new Error('API Error');
      vi.mocked(mockTrackerFacade.bulkMoveIssues).mockRejectedValue(error);

      const result = await tool.execute({
        issueIds: ['QUEUE1-1'],
        queue: 'QUEUE2',
      });

      expect(result.isError).toBe(true);
    });
  });
});
