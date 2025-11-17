/**
 * Unit тесты для GetIssueChangelogTool
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GetIssueChangelogTool } from '@tools/api/issues/changelog/index.js';
import type { YandexTrackerFacade } from '@tracker_api/facade/yandex-tracker.facade.js';
import type { Logger } from '@mcp-framework/infrastructure/logging/index.js';
import type { ChangelogEntryWithUnknownFields } from '@tracker_api/entities/index.js';
import { buildToolName } from '@mcp-framework/core';
import { MCP_TOOL_PREFIX } from '@constants';

describe('GetIssueChangelogTool', () => {
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

  const mockChangelogEntry2: ChangelogEntryWithUnknownFields = {
    id: '2',
    self: 'https://api.tracker.yandex.net/v3/issues/QUEUE-123/changelog/2',
    issue: { id: '123', key: 'QUEUE-123', display: 'Test Issue' },
    updatedAt: '2025-01-02T12:00:00Z',
    updatedBy: {
      uid: 'uid-user2',
      display: 'User Two',
      login: 'user2',
      isActive: true,
    },
    type: 'IssueUpdated',
    fields: [
      {
        field: {
          id: 'summary',
          display: 'Summary',
        },
        from: 'Old Summary',
        to: 'New Summary',
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
    it('должен вернуть корректное определение инструмента', () => {
      const definition = tool.getDefinition();

      expect(definition.name).toBe(buildToolName('get_issue_changelog', MCP_TOOL_PREFIX));
      expect(definition.description).toContain('историю изменений');
      expect(definition.inputSchema.type).toBe('object');
      expect(definition.inputSchema.required).toEqual(['issueKey']);
      expect(definition.inputSchema.properties?.['issueKey']).toBeDefined();
      expect(definition.inputSchema.properties?.['fields']).toBeDefined();
    });
  });

  describe('Validation', () => {
    it('должен требовать параметр issueKey', async () => {
      const result = await tool.execute({});

      expect(result.isError).toBe(true);
      const parsed = JSON.parse(result.content[0]?.text || '{}') as {
        success: boolean;
        message: string;
      };
      expect(parsed.success).toBe(false);
      expect(parsed.message).toContain('валидации');
    });
  });

  describe('Operation calls', () => {
    it('должен вызвать getIssueChangelog с issueKey', async () => {
      vi.mocked(mockTrackerFacade.getIssueChangelog).mockResolvedValue([mockChangelogEntry1]);

      await tool.execute({
        issueKey: 'QUEUE-123',
      });

      expect(mockTrackerFacade.getIssueChangelog).toHaveBeenCalledWith('QUEUE-123');
    });

    it('должен вернуть список записей changelog', async () => {
      vi.mocked(mockTrackerFacade.getIssueChangelog).mockResolvedValue([
        mockChangelogEntry1,
        mockChangelogEntry2,
      ]);

      const result = await tool.execute({
        issueKey: 'QUEUE-123',
      });

      expect(result.isError).toBeUndefined();
      const parsed = JSON.parse(result.content[0]?.text || '{}') as {
        success: boolean;
        data: {
          issueKey: string;
          totalEntries: number;
          changelog: ChangelogEntryWithUnknownFields[];
        };
      };
      expect(parsed.success).toBe(true);
      expect(parsed.data.issueKey).toBe('QUEUE-123');
      expect(parsed.data.totalEntries).toBe(2);
      expect(parsed.data.changelog).toHaveLength(2);
      expect(parsed.data.changelog[0]?.id).toBe('1');
      expect(parsed.data.changelog[1]?.id).toBe('2');
    });

    it('должен вернуть пустой список если нет изменений', async () => {
      vi.mocked(mockTrackerFacade.getIssueChangelog).mockResolvedValue([]);

      const result = await tool.execute({
        issueKey: 'QUEUE-123',
      });

      expect(result.isError).toBeUndefined();
      const parsed = JSON.parse(result.content[0]?.text || '{}') as {
        success: boolean;
        data: {
          totalEntries: number;
          changelog: ChangelogEntryWithUnknownFields[];
        };
      };
      expect(parsed.success).toBe(true);
      expect(parsed.data.totalEntries).toBe(0);
      expect(parsed.data.changelog).toHaveLength(0);
    });
  });

  describe('Field filtering', () => {
    it('должен фильтровать поля когда указан fields параметр', async () => {
      vi.mocked(mockTrackerFacade.getIssueChangelog).mockResolvedValue([mockChangelogEntry1]);

      const result = await tool.execute({
        issueKey: 'QUEUE-123',
        fields: ['id', 'updatedAt'],
      });

      expect(result.isError).toBeUndefined();
      const parsed = JSON.parse(result.content[0]?.text || '{}') as {
        success: boolean;
        data: {
          changelog: ChangelogEntryWithUnknownFields[];
        };
      };
      expect(parsed.success).toBe(true);
      expect(parsed.data.changelog[0]).toHaveProperty('id');
      expect(parsed.data.changelog[0]).toHaveProperty('updatedAt');
      expect(parsed.data.changelog[0]).not.toHaveProperty('updatedBy');
      expect(parsed.data.changelog[0]).not.toHaveProperty('fields');
    });

    it('должен вернуть все поля когда fields не указан', async () => {
      vi.mocked(mockTrackerFacade.getIssueChangelog).mockResolvedValue([mockChangelogEntry1]);

      const result = await tool.execute({
        issueKey: 'QUEUE-123',
      });

      expect(result.isError).toBeUndefined();
      const parsed = JSON.parse(result.content[0]?.text || '{}') as {
        success: boolean;
        data: {
          changelog: ChangelogEntryWithUnknownFields[];
          fieldsReturned: string;
        };
      };
      expect(parsed.success).toBe(true);
      expect(parsed.data.changelog[0]).toHaveProperty('id');
      expect(parsed.data.changelog[0]).toHaveProperty('updatedAt');
      expect(parsed.data.changelog[0]).toHaveProperty('updatedBy');
      expect(parsed.data.changelog[0]).toHaveProperty('fields');
      expect(parsed.data.fieldsReturned).toBe('all');
    });
  });

  describe('Logging', () => {
    it('должен логировать получение changelog', async () => {
      vi.mocked(mockTrackerFacade.getIssueChangelog).mockResolvedValue([mockChangelogEntry1]);

      await tool.execute({
        issueKey: 'QUEUE-123',
      });

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('История изменений получена'),
        expect.objectContaining({
          issueKey: 'QUEUE-123',
          entriesCount: 1,
        })
      );
    });
  });

  describe('Error handling', () => {
    it('должен обработать ошибки от operation', async () => {
      const error = new Error('API Error');
      vi.mocked(mockTrackerFacade.getIssueChangelog).mockRejectedValue(error);

      const result = await tool.execute({
        issueKey: 'QUEUE-123',
      });

      expect(result.isError).toBe(true);
      expect(result.content[0]?.text).toContain('Ошибка при получении истории изменений');
      expect(result.content[0]?.text).toContain('QUEUE-123');
    });

    it('должен обработать not found ошибки (404)', async () => {
      const notFoundError = new Error('Issue not found');
      vi.mocked(mockTrackerFacade.getIssueChangelog).mockRejectedValue(notFoundError);

      const result = await tool.execute({
        issueKey: 'NOTFOUND-999',
      });

      expect(result.isError).toBe(true);
      expect(result.content[0]?.text).toContain('Ошибка при получении истории изменений');
    });
  });
});
