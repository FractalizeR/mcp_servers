/**
 * Unit тесты для FindIssuesTool
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Logger } from '@fractalizer/mcp-infrastructure/logging/index.js';
import type { YandexTrackerFacade } from '#tracker_api/facade/yandex-tracker.facade.js';
import type { IssueWithUnknownFields } from '#tracker_api/entities/index.js';
import { FindIssuesTool } from '#tools/api/issues/find/index.js';
import { buildToolName } from '@fractalizer/mcp-core';
import { MCP_TOOL_PREFIX } from '#constants';
import { STANDARD_ISSUE_FIELDS } from '#helpers/test-fields.js';
import type { PaginatedResult, PaginationMeta } from '#tracker_api/entities/common/index.js';

/**
 * Метаданные пагинации по умолчанию (одна полная страница).
 */
const SINGLE_PAGE_META: PaginationMeta = {
  hasNextPage: false,
  fetchedAll: true,
  truncated: false,
  hasError: false,
  pagesFetched: 1,
};

/**
 * Обёртка массива задач в PaginatedResult (как теперь возвращает фасад).
 */
function page(items: IssueWithUnknownFields[]): PaginatedResult<IssueWithUnknownFields> {
  return { items, pagination: SINGLE_PAGE_META };
}

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
      expect(definition.description).toContain('Поиск');
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

    it('должен отклонить cursor вместе с perPage (конфликт)', async () => {
      const result = await tool.execute({
        query: 'Author: me()',
        cursor: 'c1:abc',
        perPage: 10,
        fields: STANDARD_ISSUE_FIELDS,
      });

      expect(result.isError).toBe(true);
      const parsed = JSON.parse(result.content[0]?.text || '{}') as {
        success: boolean;
        message: string;
      };
      expect(parsed.success).toBe(false);
    });

    it('должен принять валидный query параметр', async () => {
      vi.mocked(mockTrackerFacade.findIssues).mockResolvedValue(page([mockIssue1]));

      const result = await tool.execute({ query: 'Author: me()', fields: STANDARD_ISSUE_FIELDS });

      expect(result.isError).not.toBe(true);
      expect(mockTrackerFacade.findIssues).toHaveBeenCalled();
    });

    it('должен принять валидный keys параметр', async () => {
      vi.mocked(mockTrackerFacade.findIssues).mockResolvedValue(page([mockIssue1]));

      const result = await tool.execute({ keys: ['QUEUE-123'], fields: STANDARD_ISSUE_FIELDS });

      expect(result.isError).not.toBe(true);
      expect(mockTrackerFacade.findIssues).toHaveBeenCalled();
    });

    it('должен принять валидный queue параметр', async () => {
      vi.mocked(mockTrackerFacade.findIssues).mockResolvedValue(page([mockIssue1]));

      const result = await tool.execute({ queue: 'QUEUE', fields: STANDARD_ISSUE_FIELDS });

      expect(result.isError).not.toBe(true);
      expect(mockTrackerFacade.findIssues).toHaveBeenCalled();
    });

    it('должен принять валидный filter параметр', async () => {
      vi.mocked(mockTrackerFacade.findIssues).mockResolvedValue(page([mockIssue1]));

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
      vi.mocked(mockTrackerFacade.findIssues).mockResolvedValue(page([mockIssue1]));

      await tool.execute({ query: 'Author: me() Status: open', fields: STANDARD_ISSUE_FIELDS });

      expect(mockTrackerFacade.findIssues).toHaveBeenCalledWith(
        expect.objectContaining({ query: 'Author: me() Status: open' })
      );
    });

    it('должен вызвать FindIssuesOperation с keys параметром', async () => {
      vi.mocked(mockTrackerFacade.findIssues).mockResolvedValue(page([mockIssue1, mockIssue2]));

      await tool.execute({ keys: ['QUEUE-123', 'QUEUE-456'], fields: STANDARD_ISSUE_FIELDS });

      expect(mockTrackerFacade.findIssues).toHaveBeenCalledWith(
        expect.objectContaining({ keys: ['QUEUE-123', 'QUEUE-456'] })
      );
    });

    it('должен вызвать FindIssuesOperation с queue параметром', async () => {
      vi.mocked(mockTrackerFacade.findIssues).mockResolvedValue(page([mockIssue1]));

      await tool.execute({ queue: 'MYQUEUE', fields: STANDARD_ISSUE_FIELDS });

      expect(mockTrackerFacade.findIssues).toHaveBeenCalledWith(
        expect.objectContaining({ queue: 'MYQUEUE' })
      );
    });

    it('должен вызвать FindIssuesOperation с filter параметром', async () => {
      vi.mocked(mockTrackerFacade.findIssues).mockResolvedValue(page([mockIssue1]));

      const filter = { status: 'open', priority: 'high' };
      await tool.execute({ filter, fields: STANDARD_ISSUE_FIELDS });

      expect(mockTrackerFacade.findIssues).toHaveBeenCalledWith(
        expect.objectContaining({ filter })
      );
    });

    it('должен передать параметр пагинации perPage', async () => {
      vi.mocked(mockTrackerFacade.findIssues).mockResolvedValue(page([mockIssue1]));

      await tool.execute({
        query: 'Author: me()',
        perPage: 20,
        fields: STANDARD_ISSUE_FIELDS,
      });

      expect(mockTrackerFacade.findIssues).toHaveBeenCalledWith(
        expect.objectContaining({ perPage: 20 })
      );
    });

    it('должен передать cursor в фасад', async () => {
      vi.mocked(mockTrackerFacade.findIssues).mockResolvedValue(page([mockIssue1]));

      await tool.execute({
        query: 'Author: me()',
        cursor: 'c1:abc',
        fields: STANDARD_ISSUE_FIELDS,
      });

      expect(mockTrackerFacade.findIssues).toHaveBeenCalledWith(
        expect.objectContaining({ cursor: 'c1:abc' })
      );
    });

    it('должен передать параметры сортировки (order)', async () => {
      vi.mocked(mockTrackerFacade.findIssues).mockResolvedValue(page([mockIssue1]));

      const order = ['+created', '-priority'];
      await tool.execute({ query: 'Author: me()', order, fields: STANDARD_ISSUE_FIELDS });

      expect(mockTrackerFacade.findIssues).toHaveBeenCalledWith(expect.objectContaining({ order }));
    });

    it('должен передать expand параметр', async () => {
      vi.mocked(mockTrackerFacade.findIssues).mockResolvedValue(page([mockIssue1]));

      const expand = ['transitions', 'attachments'];
      await tool.execute({ query: 'Author: me()', expand, fields: STANDARD_ISSUE_FIELDS });

      expect(mockTrackerFacade.findIssues).toHaveBeenCalledWith(
        expect.objectContaining({ expand })
      );
    });
  });

  describe('Field filtering', () => {
    it('должен фильтровать поля в результатах', async () => {
      vi.mocked(mockTrackerFacade.findIssues).mockResolvedValue(page([mockIssue1]));

      const result = await tool.execute({
        query: 'Author: me()',
        fields: ['key', 'summary'],
      });

      expect(result.isError).not.toBe(true);
      const parsed = JSON.parse(result.content[0]?.text || '{}') as {
        success: boolean;
        data: {
          items: Array<Partial<IssueWithUnknownFields>>;
          summary: { fieldsReturned: string[] };
        };
      };
      expect(parsed.success).toBe(true);
      expect(parsed.data.items[0]).toEqual({
        key: 'QUEUE-123',
        summary: 'Test Issue 1',
      });
      expect(parsed.data.items[0]).not.toHaveProperty('description');
      // 'key'/'summary' уже были в запросе — гарантия идентичности (см.
      // RESOURCE_LINK_IDENTITY_FIELDS) здесь ничего не добавляет.
      expect(parsed.data.summary.fieldsReturned).toEqual(['key', 'summary']);
    });

    it('должен вернуть поля с фильтрацией', async () => {
      vi.mocked(mockTrackerFacade.findIssues).mockResolvedValue(page([mockIssue1]));

      const result = await tool.execute({ query: 'Author: me()', fields: STANDARD_ISSUE_FIELDS });

      expect(result.isError).not.toBe(true);
      const parsed = JSON.parse(result.content[0]?.text || '{}') as {
        success: boolean;
        data: {
          items: IssueWithUnknownFields[];
          summary: { fieldsReturned: string[] };
        };
      };
      expect(parsed.success).toBe(true);
      expect(parsed.data.items[0]).toHaveProperty('description');
      expect(parsed.data.summary.fieldsReturned).toEqual(Array.from(STANDARD_ISSUE_FIELDS));
    });

    it('должен правильно фильтровать вложенные поля', async () => {
      vi.mocked(mockTrackerFacade.findIssues).mockResolvedValue(page([mockIssue1]));

      const result = await tool.execute({
        query: 'Author: me()',
        fields: ['key', 'queue.key'],
      });

      const parsed = JSON.parse(result.content[0]?.text || '{}') as {
        success: boolean;
        data: {
          items: Array<Partial<IssueWithUnknownFields>>;
        };
      };
      expect(parsed.success).toBe(true);
      expect(parsed.data.items[0]).toHaveProperty('key');
      expect(parsed.data.items[0]).toHaveProperty('queue');
      expect(parsed.data.items[0]?.queue).toHaveProperty('key');
    });

    it('должен добавлять key/summary в fieldsReturned, даже если агент их не запросил (resource_link identity)', async () => {
      vi.mocked(mockTrackerFacade.findIssues).mockResolvedValue(page([mockIssue1]));

      const result = await tool.execute({
        query: 'Author: me()',
        fields: ['status'],
      });

      const parsed = JSON.parse(result.content[0]?.text || '{}') as {
        success: boolean;
        data: {
          items: Array<Partial<IssueWithUnknownFields>>;
          summary: { fieldsReturned: string[] };
        };
      };
      expect(parsed.success).toBe(true);
      expect(parsed.data.summary.fieldsReturned).toEqual(
        expect.arrayContaining(['status', 'key', 'summary'])
      );
      expect(parsed.data.items[0]).toHaveProperty('key', 'QUEUE-123');
      expect(parsed.data.items[0]).toHaveProperty('summary', 'Test Issue 1');
    });
  });

  describe('Error handling', () => {
    it('должен обработать пустые результаты', async () => {
      vi.mocked(mockTrackerFacade.findIssues).mockResolvedValue(page([]));

      const result = await tool.execute({ query: 'Author: me()', fields: STANDARD_ISSUE_FIELDS });

      expect(result.isError).not.toBe(true);
      const parsed = JSON.parse(result.content[0]?.text || '{}') as {
        success: boolean;
        data: { totalCount: number; items: IssueWithUnknownFields[] };
      };
      expect(parsed.success).toBe(true);
      expect(parsed.data.totalCount).toBe(0);
      expect(parsed.data.items).toHaveLength(0);
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
      vi.mocked(mockTrackerFacade.findIssues).mockResolvedValue(page([mockIssue1, mockIssue2]));

      await tool.execute({ query: 'Author: me()', fields: STANDARD_ISSUE_FIELDS });

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Задачи найдены',
        expect.objectContaining({ count: 2 })
      );
      expect(mockLogger.debug).toHaveBeenCalled();
    });

    it('должен логировать параметры поиска', async () => {
      vi.mocked(mockTrackerFacade.findIssues).mockResolvedValue(page([mockIssue1]));

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
      vi.mocked(mockTrackerFacade.findIssues).mockResolvedValue(page([mockIssue1, mockIssue2]));

      const result = await tool.execute({ query: 'Author: me()', fields: STANDARD_ISSUE_FIELDS });

      expect(result.isError).not.toBe(true);
      const parsed = JSON.parse(result.content[0]?.text || '{}') as {
        success: boolean;
        data: {
          totalCount: number;
          items: IssueWithUnknownFields[];
          summary: {
            fieldsReturned: string[];
            searchCriteria: {
              hasQuery: boolean;
              hasFilter: boolean;
              keysCount: number;
              hasQueue: boolean;
              perPage?: number;
            };
          };
        };
      };
      expect(parsed.success).toBe(true);
      expect(parsed.data.totalCount).toBe(2);
      expect(parsed.data.items).toHaveLength(2);
      expect(parsed.data.summary.searchCriteria).toBeDefined();
      expect(parsed.data.summary.searchCriteria.hasQuery).toBe(true);
      // perPage не задан в запросе → не подделываем дефолтом, поле опущено
      expect(parsed.data.summary.searchCriteria.perPage).toBeUndefined();
    });
  });

  describe('Pagination', () => {
    it('должен добавлять поле pagination в ответ (регрессия формата: items/totalCount на месте)', async () => {
      vi.mocked(mockTrackerFacade.findIssues).mockResolvedValue(page([mockIssue1]));

      const result = await tool.execute({ query: 'Author: me()', fields: STANDARD_ISSUE_FIELDS });

      const parsed = JSON.parse(result.content[0]?.text || '{}') as {
        success: boolean;
        data: {
          totalCount: number;
          items: unknown[];
          summary: { pagination: { hasNextPage: boolean } };
        };
      };
      expect(parsed.success).toBe(true);
      // прежние ключи сохранены (переименованы формально, форма — та же)
      expect(parsed.data.totalCount).toBe(1);
      expect(parsed.data.items).toHaveLength(1);
      // новое поле
      expect(parsed.data.summary.pagination).toBeDefined();
      expect(parsed.data.summary.pagination.hasNextPage).toBe(false);
    });

    it('не должен возвращать top-level page в ответе (R14)', async () => {
      vi.mocked(mockTrackerFacade.findIssues).mockResolvedValue(page([mockIssue1]));

      const result = await tool.execute({ query: 'Author: me()', fields: STANDARD_ISSUE_FIELDS });

      const parsed = JSON.parse(result.content[0]?.text || '{}') as {
        data: Record<string, unknown> & { summary: { searchCriteria: Record<string, unknown> } };
      };
      expect(parsed.data).not.toHaveProperty('page');
      expect(parsed.data.summary.searchCriteria).not.toHaveProperty('page');
      expect(parsed.data.summary.searchCriteria).not.toHaveProperty('perPage');
    });

    it('должен передавать fetchAll и maxItems в фасад', async () => {
      vi.mocked(mockTrackerFacade.findIssues).mockResolvedValue(page([mockIssue1]));

      await tool.execute({
        query: 'Author: me()',
        fetchAll: true,
        maxItems: 200,
        fields: STANDARD_ISSUE_FIELDS,
      });

      expect(mockTrackerFacade.findIssues).toHaveBeenCalledWith(
        expect.objectContaining({ fetchAll: true, maxItems: 200 })
      );
    });

    it('должен отклонить конфликт cursor + fetchAll', async () => {
      const result = await tool.execute({
        query: 'Author: me()',
        cursor: 'c1:abc',
        fetchAll: true,
        fields: STANDARD_ISSUE_FIELDS,
      });

      expect(result.isError).toBe(true);
      const parsed = JSON.parse(result.content[0]?.text || '{}') as { success: boolean };
      expect(parsed.success).toBe(false);
    });
  });

  describe('Collection response mode (resource_link, пакет 5.1.C.tracker)', () => {
    /**
     * Задача с текстом покрупнее (~длинное description) — приближает объём к
     * реальному API-ответу, чтобы сравнение размера full/links (DoD 5) не
     * было накручено искусственно короткими фикстурами.
     */
    function makeIssue(index: number): IssueWithUnknownFields {
      return {
        id: String(index),
        key: `QUEUE-${index}`,
        summary: `Задача №${index}: обработать входящий запрос пользователя`,
        description:
          'Подробное описание задачи с достаточным объёмом текста, чтобы объём тела ' +
          'элемента был сопоставим с реальным ответом API Яндекс.Трекера (типичная ' +
          'сводка одной сущности — примерно 150–400 токенов), а не тривиальной ' +
          `строкой-заглушкой. Итерация ${index}.`.repeat(6),
        queue: { id: '1', key: 'QUEUE', name: 'Test Queue' },
        status: { id: '1', key: 'open', display: 'Open' },
        createdBy: {
          uid: `uid-${index}`,
          display: `User ${index}`,
          login: `user${index}`,
          isActive: true,
        },
        createdAt: '2025-01-01T10:00:00Z',
        updatedAt: '2025-01-02T12:00:00Z',
      };
    }

    it('responseMode="links" отдаёт resource_link вместо тел (mode="links", items отсутствует)', async () => {
      vi.mocked(mockTrackerFacade.findIssues).mockResolvedValue(page([mockIssue1, mockIssue2]));

      const result = await tool.execute({
        query: 'Author: me()',
        fields: STANDARD_ISSUE_FIELDS,
        responseMode: 'links',
      });

      expect(result.isError).not.toBe(true);
      const parsed = JSON.parse(result.content[0]?.text || '{}') as {
        data: {
          mode: string;
          items?: unknown[];
          resourceLinks?: Array<{ uri: string; name: string; title?: string }>;
        };
      };
      expect(parsed.data.mode).toBe('links');
      expect(parsed.data.items).toBeUndefined();
      expect(parsed.data.resourceLinks).toHaveLength(2);
      expect(parsed.data.resourceLinks?.[0]).toMatchObject({
        uri: 'tracker://issue/QUEUE-123',
        name: 'QUEUE-123',
        title: 'Test Issue 1',
      });

      // resource_link виден и как отдельный content-блок протокола, не
      // только внутри JSON structuredContent (см. BaseTool.formatCollectionResult).
      const linkBlocks = result.content.filter(
        (block): block is typeof block & { type: 'resource_link' } =>
          block.type === 'resource_link'
      );
      expect(linkBlocks).toHaveLength(2);
      expect(linkBlocks[0]).toMatchObject({ uri: 'tracker://issue/QUEUE-123' });
    });

    it('responseMode="full" отдаёт тела даже выше порога (принудительный full побеждает threshold)', async () => {
      const issues = Array.from({ length: 25 }, (_, i) => makeIssue(i + 1));
      vi.mocked(mockTrackerFacade.findIssues).mockResolvedValue(page(issues));

      const result = await tool.execute({
        query: 'Author: me()',
        fields: STANDARD_ISSUE_FIELDS,
        responseMode: 'full',
      });

      const parsed = JSON.parse(result.content[0]?.text || '{}') as {
        data: { mode: string; items?: unknown[]; resourceLinks?: unknown[] };
      };
      expect(parsed.data.mode).toBe('full');
      expect(parsed.data.items).toHaveLength(25);
      expect(parsed.data.resourceLinks).toBeUndefined();
    });

    it('responseMode по умолчанию — "auto": ≤20 элементов → full', async () => {
      const issues = Array.from({ length: 20 }, (_, i) => makeIssue(i + 1));
      vi.mocked(mockTrackerFacade.findIssues).mockResolvedValue(page(issues));

      // responseMode не передан — проверяем именно значение по умолчанию схемы.
      const result = await tool.execute({ query: 'Author: me()', fields: STANDARD_ISSUE_FIELDS });

      const parsed = JSON.parse(result.content[0]?.text || '{}') as {
        data: { mode: string; totalCount: number; threshold: number };
      };
      expect(parsed.data.mode).toBe('full');
      expect(parsed.data.totalCount).toBe(20);
      expect(parsed.data.threshold).toBe(20);
    });

    it('responseMode по умолчанию — "auto": >20 элементов → links (мотивирующий случай плана)', async () => {
      const issues = Array.from({ length: 21 }, (_, i) => makeIssue(i + 1));
      vi.mocked(mockTrackerFacade.findIssues).mockResolvedValue(page(issues));

      const result = await tool.execute({ query: 'Author: me()', fields: STANDARD_ISSUE_FIELDS });

      const parsed = JSON.parse(result.content[0]?.text || '{}') as {
        data: { mode: string; totalCount: number; resourceLinks?: unknown[] };
      };
      expect(parsed.data.mode).toBe('links');
      expect(parsed.data.totalCount).toBe(21);
      expect(parsed.data.resourceLinks).toHaveLength(21);
    });

    it('порог виден в описании параметра responseMode (DoD плана: "дефолт должен быть виден в описании")', () => {
      const definition = tool.getDefinition();
      const responseModeSchema = definition.inputSchema.properties?.['responseMode'] as {
        description?: string;
      };
      expect(responseModeSchema?.description).toMatch(/20/);
    });

    it('DoD 5: объём ответа в режиме links СУЩЕСТВЕННО меньше, чем в full (измеренное сравнение)', async () => {
      const issues = Array.from({ length: 200 }, (_, i) => makeIssue(i + 1));

      vi.mocked(mockTrackerFacade.findIssues).mockResolvedValue(page(issues));
      const fullResult = await tool.execute({
        query: 'Author: me()',
        fields: STANDARD_ISSUE_FIELDS,
        responseMode: 'full',
      });

      vi.mocked(mockTrackerFacade.findIssues).mockResolvedValue(page(issues));
      const linksResult = await tool.execute({
        query: 'Author: me()',
        fields: STANDARD_ISSUE_FIELDS,
        responseMode: 'links',
      });

      const fullSize = fullResult.content[0]?.text.length ?? 0;
      const linksSize = linksResult.content[0]?.text.length ?? 0;

      expect(fullSize).toBeGreaterThan(0);
      expect(linksSize).toBeGreaterThan(0);
      // На 200 задачах экономия должна быть на порядок величины, а не на
      // проценты — это ровно мотивирующий случай плана ("find_issues на 200
      // задач вываливает 200 объектов в контекст"). Порог 5x — консервативный
      // (фактическая экономия на этой фикстуре — на порядок больше), чтобы
      // тест не был хрупким к мелким изменениям формата сводки/ссылки.
      expect(linksSize).toBeLessThan(fullSize / 5);

       
      console.log(
        `[DoD 5] find_issues(200 issues): full=${fullSize} bytes, links=${linksSize} bytes, ` +
          `экономия ${(100 * (1 - linksSize / fullSize)).toFixed(1)}%`
      );
    });
  });
});
