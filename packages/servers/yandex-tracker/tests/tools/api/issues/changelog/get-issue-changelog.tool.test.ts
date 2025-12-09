/**
 * Unit тесты для GetIssueChangelogTool (batch mode)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GetIssueChangelogTool } from '#tools/api/issues/changelog/index.js';
import type { YandexTrackerFacade } from '#tracker_api/facade/yandex-tracker.facade.js';
import type { Logger } from '@fractalizer/mcp-infrastructure/logging/index.js';
import type { ChangelogEntryWithUnknownFields } from '#tracker_api/entities/index.js';
import type { BatchResult } from '@fractalizer/mcp-infrastructure';
import { buildToolName } from '@fractalizer/mcp-core';
import { MCP_TOOL_PREFIX } from '#constants';
import { STANDARD_CHANGELOG_FIELDS } from '#helpers/test-fields.js';

describe('GetIssueChangelogTool (batch mode)', () => {
  let mockTrackerFacade: YandexTrackerFacade;
  let mockLogger: Logger;
  let tool: GetIssueChangelogTool;

  const mockChangelogEntry1: ChangelogEntryWithUnknownFields = {
    id: '1',
    self: 'https://api.tracker.yandex.net/v3/issues/QUEUE-123/changelog/1',
    issue: { id: '123', key: 'QUEUE-123', display: 'Test Issue' },
    updatedAt: '2025-01-01T10:00:00Z',
    updatedBy: {
      uid: 'uid-user1',
      display: 'User One',
      login: 'user1',
      isActive: true,
    },
    type: 'IssueUpdated',
    fields: [
      {
        field: {
          id: 'status',
          display: 'Status',
        },
        from: { id: '1', key: 'open', display: 'Open' },
        to: { id: '2', key: 'in-progress', display: 'In Progress' },
      },
    ],
  };

  beforeEach(() => {
    mockTrackerFacade = {
      getIssueChangelog: vi.fn(),
    } as unknown as YandexTrackerFacade;

    mockLogger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    } as unknown as Logger;

    tool = new GetIssueChangelogTool(mockTrackerFacade, mockLogger);
  });

  describe('getDefinition', () => {
    it('должен вернуть корректное определение для batch mode', () => {
      const definition = tool.getDefinition();

      expect(definition.name).toBe(buildToolName('get_issue_changelog', MCP_TOOL_PREFIX));
      expect(definition.description).toContain('История изменений');
      expect(definition.inputSchema.type).toBe('object');
      expect(definition.inputSchema.required).toEqual(['issueKeys', 'fields']);
      expect(definition.inputSchema.properties?.['issueKeys']).toBeDefined();
      expect(definition.inputSchema.properties?.['fields']).toBeDefined();
    });
  });

  describe('Validation', () => {
    it('должен требовать параметр issueKeys', async () => {
      const result = await tool.execute({});

      expect(result.isError).toBe(true);
      const parsed = JSON.parse(result.content[0]?.text || '{}') as {
        success: boolean;
        message: string;
      };
      expect(parsed.success).toBe(false);
      expect(parsed.message).toContain('валидации');
    });

    it('должен требовать непустой массив issueKeys', async () => {
      const result = await tool.execute({
        issueKeys: [],
        fields: STANDARD_CHANGELOG_FIELDS,
      });

      expect(result.isError).toBe(true);
    });
  });

  describe('Batch operations', () => {
    it('должен вызвать getIssueChangelog с массивом ключей', async () => {
      const mockBatchResult: BatchResult<string, ChangelogEntryWithUnknownFields[]> = [
        {
          status: 'fulfilled',
          key: 'QUEUE-123',
          value: [mockChangelogEntry1],
          index: 0,
        },
      ];

      vi.mocked(mockTrackerFacade.getIssueChangelog).mockResolvedValue(mockBatchResult);

      await tool.execute({
        issueKeys: ['QUEUE-123'],
        fields: STANDARD_CHANGELOG_FIELDS,
      });

      expect(mockTrackerFacade.getIssueChangelog).toHaveBeenCalledWith(['QUEUE-123']);
    });

    it('должен вернуть batch результаты с successful и failed', async () => {
      const mockBatchResult: BatchResult<string, ChangelogEntryWithUnknownFields[]> = [
        {
          status: 'fulfilled',
          key: 'QUEUE-123',
          value: [mockChangelogEntry1],
          index: 0,
        },
        {
          status: 'fulfilled',
          key: 'QUEUE-456',
          value: [],
          index: 1,
        },
      ];

      vi.mocked(mockTrackerFacade.getIssueChangelog).mockResolvedValue(mockBatchResult);

      const result = await tool.execute({
        issueKeys: ['QUEUE-123', 'QUEUE-456'],
        fields: STANDARD_CHANGELOG_FIELDS,
      });

      expect(result.isError).toBeUndefined();
      const parsed = JSON.parse(result.content[0]?.text || '{}') as {
        success: boolean;
        data: {
          total: number;
          successful: Array<{ issueKey: string; changelog: unknown[]; totalEntries: number }>;
          failed: Array<{ key: string; error: string }>;
        };
      };
      expect(parsed.success).toBe(true);
      expect(parsed.data.total).toBe(2);
      expect(parsed.data.successful).toHaveLength(2);
      expect(parsed.data.failed).toHaveLength(0);
      expect(parsed.data.successful[0]?.issueKey).toBe('QUEUE-123');
      expect(parsed.data.successful[0]?.totalEntries).toBe(1);
    });

    it('должен обработать частичные ошибки (mixed success/failure)', async () => {
      const mockBatchResult: BatchResult<string, ChangelogEntryWithUnknownFields[]> = [
        {
          status: 'fulfilled',
          key: 'QUEUE-123',
          value: [mockChangelogEntry1],
          index: 0,
        },
        {
          status: 'rejected',
          key: 'INVALID-999',
          reason: new Error('Issue not found'),
          index: 1,
        },
      ];

      vi.mocked(mockTrackerFacade.getIssueChangelog).mockResolvedValue(mockBatchResult);

      const result = await tool.execute({
        issueKeys: ['QUEUE-123', 'INVALID-999'],
        fields: STANDARD_CHANGELOG_FIELDS,
      });

      expect(result.isError).toBeUndefined();
      const parsed = JSON.parse(result.content[0]?.text || '{}') as {
        success: boolean;
        data: {
          total: number;
          successful: unknown[];
          failed: Array<{ key: string; error: string }>;
        };
      };
      expect(parsed.success).toBe(true);
      expect(parsed.data.total).toBe(2);
      expect(parsed.data.successful).toHaveLength(1);
      expect(parsed.data.failed).toHaveLength(1);
      expect(parsed.data.failed[0]?.key).toBe('INVALID-999');
    });
  });

  describe('Field filtering', () => {
    it('должен фильтровать поля в batch результатах', async () => {
      const mockBatchResult: BatchResult<string, ChangelogEntryWithUnknownFields[]> = [
        {
          status: 'fulfilled',
          key: 'QUEUE-123',
          value: [mockChangelogEntry1],
          index: 0,
        },
      ];

      vi.mocked(mockTrackerFacade.getIssueChangelog).mockResolvedValue(mockBatchResult);

      const result = await tool.execute({
        issueKeys: ['QUEUE-123'],
        fields: ['id', 'updatedAt'],
      });

      expect(result.isError).toBeUndefined();
      const parsed = JSON.parse(result.content[0]?.text || '{}') as {
        success: boolean;
        data: {
          successful: Array<{ changelog: ChangelogEntryWithUnknownFields[] }>;
          fieldsReturned: string[];
        };
      };
      expect(parsed.success).toBe(true);
      expect(parsed.data.successful[0]?.changelog[0]).toHaveProperty('id');
      expect(parsed.data.successful[0]?.changelog[0]).toHaveProperty('updatedAt');
      expect(parsed.data.successful[0]?.changelog[0]).not.toHaveProperty('updatedBy');
      expect(parsed.data.fieldsReturned).toEqual(['id', 'updatedAt']);
    });
  });

  describe('Logging', () => {
    it('должен логировать batch операции', async () => {
      const mockBatchResult: BatchResult<string, ChangelogEntryWithUnknownFields[]> = [
        {
          status: 'fulfilled',
          key: 'QUEUE-123',
          value: [mockChangelogEntry1],
          index: 0,
        },
      ];

      vi.mocked(mockTrackerFacade.getIssueChangelog).mockResolvedValue(mockBatchResult);

      await tool.execute({
        issueKeys: ['QUEUE-123'],
        fields: STANDARD_CHANGELOG_FIELDS,
      });

      // ResultLogger.logBatchResults использует logger.debug
      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.stringContaining('История изменений получена'),
        expect.objectContaining({
          successful: 1,
          failed: 0,
        })
      );
    });
  });

  describe('Error handling', () => {
    it('должен обработать полные ошибки batch операции', async () => {
      const error = new Error('Network error');
      vi.mocked(mockTrackerFacade.getIssueChangelog).mockRejectedValue(error);

      const result = await tool.execute({
        issueKeys: ['QUEUE-123'],
        fields: STANDARD_CHANGELOG_FIELDS,
      });

      expect(result.isError).toBe(true);
      expect(result.content[0]?.text).toContain('Ошибка при получении истории изменений задач');
    });
  });
});
