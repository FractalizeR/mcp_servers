/**
 * Unit тесты для BulkTransitionIssuesTool
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BulkTransitionIssuesTool } from '#tools/api/bulk-change/transition/index.js';
import type { YandexTrackerFacade } from '#tracker_api/facade/yandex-tracker.facade.js';
import type { Logger } from '@fractalizer/mcp-infrastructure/logging/index.js';
import type { BulkChangeOperationWithUnknownFields } from '#tracker_api/entities/index.js';
import { getTextContent } from '#helpers/tool-result.helper.js';

describe('BulkTransitionIssuesTool', () => {
  let mockTrackerFacade: YandexTrackerFacade;
  let mockLogger: Logger;
  let tool: BulkTransitionIssuesTool;

  const mockOperation: BulkChangeOperationWithUnknownFields = {
    id: 'op-1',
    self: 'https://api.tracker.yandex.net/v3/bulkchange/op-1',
    status: 'CREATED',
    totalIssues: 2,
  };

  beforeEach(() => {
    mockTrackerFacade = {
      bulkTransitionIssues: vi.fn(),
    } as unknown as YandexTrackerFacade;

    mockLogger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    } as unknown as Logger;

    tool = new BulkTransitionIssuesTool(mockTrackerFacade, mockLogger);
  });

  describe('Validation', () => {
    it('должен требовать параметры issueIds и transitionId', async () => {
      const result = await tool.execute({});

      expect(result.isError).toBe(true);
    });
  });

  describe('Operation calls', () => {
    it('должен передать issueIds/transitionId в facade как issues/transition', async () => {
      vi.mocked(mockTrackerFacade.bulkTransitionIssues).mockResolvedValue(mockOperation);

      const result = await tool.execute({
        issueIds: ['QUEUE1-1', 'QUEUE1-2'],
        transitionId: 'start_progress',
      });

      expect(mockTrackerFacade.bulkTransitionIssues).toHaveBeenCalledWith({
        issues: ['QUEUE1-1', 'QUEUE1-2'],
        transition: 'start_progress',
      });
      expect(result.isError).toBeUndefined();

      const parsed = JSON.parse(getTextContent(result)) as {
        success: boolean;
        data: { transitionId: string };
      };
      expect(parsed.success).toBe(true);
      expect(parsed.data.transitionId).toBe('start_progress');
    });

    it('должен передать values (например resolution) в facade', async () => {
      vi.mocked(mockTrackerFacade.bulkTransitionIssues).mockResolvedValue(mockOperation);

      await tool.execute({
        issueIds: ['QUEUE1-1'],
        transitionId: 'close',
        values: { resolution: 'fixed' },
      });

      expect(mockTrackerFacade.bulkTransitionIssues).toHaveBeenCalledWith({
        issues: ['QUEUE1-1'],
        transition: 'close',
        values: { resolution: 'fixed' },
      });
    });
  });

  describe('Error handling', () => {
    it('должен обработать ошибки от operation', async () => {
      const error = new Error('API Error');
      vi.mocked(mockTrackerFacade.bulkTransitionIssues).mockRejectedValue(error);

      const result = await tool.execute({
        issueIds: ['QUEUE1-1'],
        transitionId: 'close',
      });

      expect(result.isError).toBe(true);
    });
  });
});
