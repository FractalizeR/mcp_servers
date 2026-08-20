/**
 * Unit тесты для BulkUpdateIssuesTool
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BulkUpdateIssuesTool } from '#tools/api/bulk-change/update/index.js';
import type { YandexTrackerFacade } from '#tracker_api/facade/yandex-tracker.facade.js';
import type { Logger } from '@fractalizer/mcp-infrastructure/logging/index.js';
import type { BulkChangeOperationWithUnknownFields } from '#tracker_api/entities/index.js';
import { getTextContent } from '#helpers/tool-result.helper.js';

describe('BulkUpdateIssuesTool', () => {
  let mockTrackerFacade: YandexTrackerFacade;
  let mockLogger: Logger;
  let tool: BulkUpdateIssuesTool;

  const mockOperation: BulkChangeOperationWithUnknownFields = {
    id: 'op-1',
    self: 'https://api.tracker.yandex.net/v2/bulkchange/op-1',
    status: 'CREATED',
    totalIssues: 2,
  };

  beforeEach(() => {
    mockTrackerFacade = {
      bulkUpdateIssues: vi.fn(),
    } as unknown as YandexTrackerFacade;

    mockLogger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    } as unknown as Logger;

    tool = new BulkUpdateIssuesTool(mockTrackerFacade, mockLogger);
  });

  describe('Validation', () => {
    it('должен требовать параметры issueIds и values', async () => {
      const result = await tool.execute({});

      expect(result.isError).toBe(true);
    });
  });

  describe('Operation calls', () => {
    it('должен передать issueIds в facade как issues', async () => {
      vi.mocked(mockTrackerFacade.bulkUpdateIssues).mockResolvedValue(mockOperation);

      const result = await tool.execute({
        issueIds: ['QUEUE1-1', 'QUEUE1-2'],
        values: { priority: 'minor' },
      });

      expect(mockTrackerFacade.bulkUpdateIssues).toHaveBeenCalledWith({
        issues: ['QUEUE1-1', 'QUEUE1-2'],
        values: { priority: 'minor' },
      });
      expect(result.isError).toBeUndefined();

      const parsed = JSON.parse(getTextContent(result)) as {
        success: boolean;
        data: { updatedFields: string[] };
      };
      expect(parsed.success).toBe(true);
      expect(parsed.data.updatedFields).toEqual(['priority']);
    });
  });

  describe('Error handling', () => {
    it('должен обработать ошибки от operation', async () => {
      const error = new Error('API Error');
      vi.mocked(mockTrackerFacade.bulkUpdateIssues).mockRejectedValue(error);

      const result = await tool.execute({
        issueIds: ['QUEUE1-1'],
        values: { priority: 'minor' },
      });

      expect(result.isError).toBe(true);
    });
  });
});
