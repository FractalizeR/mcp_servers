/**
 * Unit тесты для FindIssuesTool
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Logger } from '@mcp-framework/infrastructure/logging/index.js';
import type { YandexTrackerFacade } from '#tracker_api/facade/yandex-tracker.facade.js';
import type { IssueWithUnknownFields } from '#tracker_api/entities/index.js';
import { FindIssuesTool } from '#tools/api/issues/find/index.js';
import { buildToolName } from '@mcp-framework/core';
import { MCP_TOOL_PREFIX } from '#constants';
import { STANDARD_ISSUE_FIELDS } from '#helpers/test-fields.js';

describe('FindIssuesTool', () => {
  let tool: FindIssuesTool;
  let mockTrackerFacade: YandexTrackerFacade;
  let mockLogger: Logger;

  const mockIssue1: IssueWithUnknownFields = {
    id: '1',
    key: 'QUEUE-123',
    summary: 'Test Issue 1',
    description: 'Test Description 1',
    queue: {
      id: '1',
      key: 'QUEUE',
      name: 'Test Queue',
    },
    status: {
      id: '1',
      key: 'open',
      display: 'Open',
    },
    createdBy: {
      uid: 'uid-creator',
      display: 'Creator',
      login: 'creator',
      isActive: true,
    },
    createdAt: '2025-01-01T10:00:00Z',
    updatedAt: '2025-01-02T12:00:00Z',
  };

  const mockIssue2: IssueWithUnknownFields = {
    id: '2',
    key: 'QUEUE-456',
    summary: 'Test Issue 2',
    description: 'Test Description 2',
    queue: {
      id: '1',
      key: 'QUEUE',
      name: 'Test Queue',
    },
    status: {
      id: '2',
      key: 'closed',
      display: 'Closed',
    },
    createdBy: {
      uid: 'uid-creator2',
      display: 'Creator 2',
      login: 'creator2',
      isActive: true,
    },
    createdAt: '2025-01-03T10:00:00Z',
    updatedAt: '2025-01-04T12:00:00Z',
  };

  beforeEach(() => {
    mockTrackerFacade = {
      findIssues: vi.fn(),
    } as unknown as YandexTrackerFacade;

    mockLogger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    } as unknown as Logger;

    tool = new FindIssuesTool(mockTrackerFacade, mockLogger);
  });

  describe('getDefinition', () => {
    it('должен вернуть корректное определение инструмента', () => {
      const definition = tool.getDefinition();

      expect(definition.name).toBe(buildToolName('find_issues', MCP_TOOL_PREFIX));
      expect(definition.description).toContain('Ищет задачи');
      expect(definition.inputSchema.type).toBe('object');
      expect(definition.inputSchema.required).toEqual(['fields']);
      expect(definition.inputSchema.properties?.['query']).toBeDefined();
      expect(definition.inputSchema.properties?.['filter']).toBeDefined();
      expect(definition.inputSchema.properties?.['keys']).toBeDefined();
      expect(definition.inputSchema.properties?.['queue']).toBeDefined();
      expect(definition.inputSchema.properties?.['fields']).toBeDefined();
    });
  });

  describe('Validation', () => {
    it('должен отклонить запрос без параметров поиска', async () => {
      const result = await tool.execute({});

      expect(result.isError).toBe(true);
      const parsed = JSON.parse(result.content[0]?.text || '{}') as {
        success: boolean;
        message: string;
      };
      expect(parsed.success).toBe(false);
      expect(parsed.message).toContain('валидации');
    });

    it('должен отклонить невалидный perPage (отрицательное число)', async () => {
      const result = await tool.execute({
        query: 'Author: me()',
        perPage: -10,
      });

      expect(result.isError).toBe(true);
      const parsed = JSON.parse(result.content[0]?.text || '{}') as {
        success: boolean;
        message: string;
      };
      expect(parsed.success).toBe(false);
    });

    it('должен отклонить невалидный page (ноль)', async () => {
      const result = await tool.execute({
        query: 'Author: me()',
        page: 0,
      });

      expect(result.isError).toBe(true);
      const parsed = JSON.parse(result.content[0]?.text || '{}') as {
        success: boolean;
        message: string;
      };
      expect(parsed.success).toBe(false);
    });

    it('должен принять валидный query параметр', async () => {
      vi.mocked(mockTrackerFacade.findIssues).mockResolvedValue([mockIssue1]);

      const result = await tool.execute({ query: 'Author: me()', fields: STANDARD_ISSUE_FIELDS });

      expect(result.isError).not.toBe(true);
      expect(mockTrackerFacade.findIssues).toHaveBeenCalled();
    });

    it('должен принять валидный keys параметр', async () => {
      vi.mocked(mockTrackerFacade.findIssues).mockResolvedValue([mockIssue1]);

      const result = await tool.execute({ keys: ['QUEUE-123'], fields: STANDARD_ISSUE_FIELDS });

      expect(result.isError).not.toBe(true);
      expect(mockTrackerFacade.findIssues).toHaveBeenCalled();
    });

    it('должен принять валидный queue параметр', async () => {
      vi.mocked(mockTrackerFacade.findIssues).mockResolvedValue([mockIssue1]);

      const result = await tool.execute({ queue: 'QUEUE', fields: STANDARD_ISSUE_FIELDS });

      expect(result.isError).not.toBe(true);
      expect(mockTrackerFacade.findIssues).toHaveBeenCalled();
    });

    it('должен принять валидный filter параметр', async () => {
      vi.mocked(mockTrackerFacade.findIssues).mockResolvedValue([mockIssue1]);

      const result = await tool.execute({
        filter: { status: 'open' },
        fields: STANDARD_ISSUE_FIELDS,
      });

      expect(result.isError).not.toBe(true);
      expect(mockTrackerFacade.findIssues).toHaveBeenCalled();
    });
  });

  describe('Operation calls', () => {
    it('должен вызвать FindIssuesOperation с query параметром', async () => {
      vi.mocked(mockTrackerFacade.findIssues).mockResolvedValue([mockIssue1]);

      await tool.execute({ query: 'Author: me() Status: open', fields: STANDARD_ISSUE_FIELDS });

      expect(mockTrackerFacade.findIssues).toHaveBeenCalledWith(
        expect.objectContaining({ query: 'Author: me() Status: open' })
      );
    });

    it('должен вызвать FindIssuesOperation с keys параметром', async () => {
      vi.mocked(mockTrackerFacade.findIssues).mockResolvedValue([mockIssue1, mockIssue2]);

      await tool.execute({ keys: ['QUEUE-123', 'QUEUE-456'], fields: STANDARD_ISSUE_FIELDS });

      expect(mockTrackerFacade.findIssues).toHaveBeenCalledWith(
        expect.objectContaining({ keys: ['QUEUE-123', 'QUEUE-456'] })
      );
    });

    it('должен вызвать FindIssuesOperation с queue параметром', async () => {
      vi.mocked(mockTrackerFacade.findIssues).mockResolvedValue([mockIssue1]);

      await tool.execute({ queue: 'MYQUEUE', fields: STANDARD_ISSUE_FIELDS });

      expect(mockTrackerFacade.findIssues).toHaveBeenCalledWith(
        expect.objectContaining({ queue: 'MYQUEUE' })
      );
    });

    it('должен вызвать FindIssuesOperation с filter параметром', async () => {
      vi.mocked(mockTrackerFacade.findIssues).mockResolvedValue([mockIssue1]);

      const filter = { status: 'open', priority: 'high' };
      await tool.execute({ filter, fields: STANDARD_ISSUE_FIELDS });

      expect(mockTrackerFacade.findIssues).toHaveBeenCalledWith(
        expect.objectContaining({ filter })
      );
    });

    it('должен передать параметры пагинации (perPage, page)', async () => {
      vi.mocked(mockTrackerFacade.findIssues).mockResolvedValue([mockIssue1]);

      await tool.execute({
        query: 'Author: me()',
        perPage: 20,
        page: 2,
        fields: STANDARD_ISSUE_FIELDS,
      });

      expect(mockTrackerFacade.findIssues).toHaveBeenCalledWith(
        expect.objectContaining({ perPage: 20, page: 2 })
      );
    });

    it('должен передать параметры сортировки (order)', async () => {
      vi.mocked(mockTrackerFacade.findIssues).mockResolvedValue([mockIssue1]);

      const order = ['+created', '-priority'];
      await tool.execute({ query: 'Author: me()', order, fields: STANDARD_ISSUE_FIELDS });

      expect(mockTrackerFacade.findIssues).toHaveBeenCalledWith(expect.objectContaining({ order }));
    });

    it('должен передать expand параметр', async () => {
      vi.mocked(mockTrackerFacade.findIssues).mockResolvedValue([mockIssue1]);

      const expand = ['transitions', 'attachments'];
      await tool.execute({ query: 'Author: me()', expand, fields: STANDARD_ISSUE_FIELDS });

      expect(mockTrackerFacade.findIssues).toHaveBeenCalledWith(
        expect.objectContaining({ expand })
      );
    });
  });

  describe('Field filtering', () => {
    it('должен фильтровать поля в результатах', async () => {
      vi.mocked(mockTrackerFacade.findIssues).mockResolvedValue([mockIssue1]);

      const result = await tool.execute({
        query: 'Author: me()',
        fields: ['key', 'summary'],
      });

      expect(result.isError).not.toBe(true);
      const parsed = JSON.parse(result.content[0]?.text || '{}') as {
        success: boolean;
        data: {
          issues: Array<Partial<IssueWithUnknownFields>>;
          fieldsReturned: string[];
        };
      };
      expect(parsed.success).toBe(true);
      expect(parsed.data.issues[0]).toEqual({
        key: 'QUEUE-123',
        summary: 'Test Issue 1',
      });
      expect(parsed.data.issues[0]).not.toHaveProperty('description');
      expect(parsed.data.fieldsReturned).toEqual(['key', 'summary']);
    });

    it('должен вернуть поля с фильтрацией', async () => {
      vi.mocked(mockTrackerFacade.findIssues).mockResolvedValue([mockIssue1]);

      const result = await tool.execute({ query: 'Author: me()', fields: STANDARD_ISSUE_FIELDS });

      expect(result.isError).not.toBe(true);
      const parsed = JSON.parse(result.content[0]?.text || '{}') as {
        success: boolean;
        data: {
          issues: IssueWithUnknownFields[];
          fieldsReturned: string[];
        };
      };
      expect(parsed.success).toBe(true);
      expect(parsed.data.issues[0]).toHaveProperty('description');
      expect(parsed.data.fieldsReturned).toEqual(Array.from(STANDARD_ISSUE_FIELDS));
    });

    it('должен правильно фильтровать вложенные поля', async () => {
      vi.mocked(mockTrackerFacade.findIssues).mockResolvedValue([mockIssue1]);

      const result = await tool.execute({
        query: 'Author: me()',
        fields: ['key', 'queue.key'],
      });

      const parsed = JSON.parse(result.content[0]?.text || '{}') as {
        success: boolean;
        data: {
          issues: Array<Partial<IssueWithUnknownFields>>;
        };
      };
      expect(parsed.success).toBe(true);
      expect(parsed.data.issues[0]).toHaveProperty('key');
      expect(parsed.data.issues[0]).toHaveProperty('queue');
      expect(parsed.data.issues[0]?.queue).toHaveProperty('key');
    });
  });

  describe('Error handling', () => {
    it('должен обработать пустые результаты', async () => {
      vi.mocked(mockTrackerFacade.findIssues).mockResolvedValue([]);

      const result = await tool.execute({ query: 'Author: me()', fields: STANDARD_ISSUE_FIELDS });

      expect(result.isError).not.toBe(true);
      const parsed = JSON.parse(result.content[0]?.text || '{}') as {
        success: boolean;
        data: { count: number; issues: IssueWithUnknownFields[] };
      };
      expect(parsed.success).toBe(true);
      expect(parsed.data.count).toBe(0);
      expect(parsed.data.issues).toHaveLength(0);
    });

    it('должен обработать ошибки operation', async () => {
      const error = new Error('Network timeout');
      vi.mocked(mockTrackerFacade.findIssues).mockRejectedValue(error);

      const result = await tool.execute({ query: 'Author: me()', fields: STANDARD_ISSUE_FIELDS });

      expect(result.isError).toBe(true);
      const parsed = JSON.parse(result.content[0]?.text || '{}') as {
        success: boolean;
        message: string;
        error: string;
      };
      expect(parsed.success).toBe(false);
      expect(parsed.message).toContain('поиске задач');
      expect(parsed.error).toBe('Network timeout');
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('METADATA', () => {
    it('должен иметь корректные статические метаданные', () => {
      expect(FindIssuesTool.METADATA).toBeDefined();
      expect(FindIssuesTool.METADATA.name).toBe(buildToolName('find_issues', MCP_TOOL_PREFIX));
      expect(FindIssuesTool.METADATA.description).toContain('Поиск');
      expect(FindIssuesTool.METADATA.category).toBe('issues');
      expect(FindIssuesTool.METADATA.tags).toContain('issues');
      expect(FindIssuesTool.METADATA.tags).toContain('query');
      expect(FindIssuesTool.METADATA.tags).toContain('search');
      expect(FindIssuesTool.METADATA.isHelper).toBe(false);
    });

    it('должен возвращать метаданные через getMetadata()', () => {
      const metadata = tool.getMetadata();

      expect(metadata).toBeDefined();
      expect(metadata.category).toBe('issues');
      expect(metadata.tags).toContain('search');
      expect(metadata.isHelper).toBe(false);
      expect(metadata.definition).toBeDefined();
    });
  });

  describe('Logging', () => {
    it('должен логировать начало и результаты операции', async () => {
      vi.mocked(mockTrackerFacade.findIssues).mockResolvedValue([mockIssue1, mockIssue2]);

      await tool.execute({ query: 'Author: me()', fields: STANDARD_ISSUE_FIELDS });

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Задачи найдены',
        expect.objectContaining({ count: 2 })
      );
      expect(mockLogger.debug).toHaveBeenCalled();
    });

    it('должен логировать параметры поиска', async () => {
      vi.mocked(mockTrackerFacade.findIssues).mockResolvedValue([mockIssue1]);

      await tool.execute({
        query: 'Status: open',
        keys: ['TEST-1'],
        perPage: 20,
        fields: STANDARD_ISSUE_FIELDS,
      });

      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Параметры поиска:',
        expect.objectContaining({
          hasQuery: true,
          keysCount: 1,
          perPage: 20,
        })
      );
    });
  });

  describe('Response format', () => {
    it('должен возвращать корректный формат ответа', async () => {
      vi.mocked(mockTrackerFacade.findIssues).mockResolvedValue([mockIssue1, mockIssue2]);

      const result = await tool.execute({ query: 'Author: me()', fields: STANDARD_ISSUE_FIELDS });

      expect(result.isError).not.toBe(true);
      const parsed = JSON.parse(result.content[0]?.text || '{}') as {
        success: boolean;
        data: {
          count: number;
          issues: IssueWithUnknownFields[];
          fieldsReturned: string[];
          searchCriteria: {
            hasQuery: boolean;
            hasFilter: boolean;
            keysCount: number;
            hasQueue: boolean;
            perPage: number;
          };
        };
      };
      expect(parsed.success).toBe(true);
      expect(parsed.data.count).toBe(2);
      expect(parsed.data.issues).toHaveLength(2);
      expect(parsed.data.searchCriteria).toBeDefined();
      expect(parsed.data.searchCriteria.hasQuery).toBe(true);
      expect(parsed.data.searchCriteria.perPage).toBe(50); // default
    });
  });
});
