/**
 * Unit тесты для GetCommentsTool
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GetCommentsTool } from '#tools/api/comments/get/index.js';
import type { YandexTrackerFacade } from '#tracker_api/facade/yandex-tracker.facade.js';
import type { Logger } from '@mcp-framework/infrastructure/logging/index.js';
import type { CommentWithUnknownFields } from '#tracker_api/entities/index.js';
import { buildToolName } from '@mcp-framework/core';
import { MCP_TOOL_PREFIX } from '#constants';
import { createCommentListFixture } from '#helpers/comment.fixture.js';

describe('GetCommentsTool', () => {
  let mockTrackerFacade: YandexTrackerFacade;
  let mockLogger: Logger;
  let tool: GetCommentsTool;

  const mockComments: CommentWithUnknownFields[] = createCommentListFixture(3);

  beforeEach(() => {
    mockTrackerFacade = {
      getCommentsMany: vi.fn(),
    } as unknown as YandexTrackerFacade;

    mockLogger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    } as unknown as Logger;

    tool = new GetCommentsTool(mockTrackerFacade, mockLogger);
  });

  describe('getDefinition', () => {
    it('должен иметь корректное имя yandex_tracker_get_comments', () => {
      const definition = tool.getDefinition();

      expect(definition.name).toBe(buildToolName('get_comments', MCP_TOOL_PREFIX));
    });

    it('должен иметь корректную категорию', () => {
      expect(GetCommentsTool.METADATA.category).toBe('comments');
      expect(GetCommentsTool.METADATA.subcategory).toBe('read');
    });

    it('должен иметь корректное описание', () => {
      const definition = tool.getDefinition();

      expect(definition.description).toContain('Получить комментарии');
    });

    it('должен иметь корректную схему с обязательными полями', () => {
      const definition = tool.getDefinition();

      expect(definition.inputSchema.type).toBe('object');
      expect(definition.inputSchema.required).toEqual(['issueIds', 'fields']);
      expect(definition.inputSchema.properties?.['issueIds']).toBeDefined();
      expect(definition.inputSchema.properties?.['perPage']).toBeDefined();
      expect(definition.inputSchema.properties?.['page']).toBeDefined();
      expect(definition.inputSchema.properties?.['expand']).toBeDefined();
      expect(definition.inputSchema.properties?.['fields']).toBeDefined();
    });
  });

  describe('Validation', () => {
    it('должен требовать параметр issueIds', async () => {
      const result = await tool.execute({ fields: ['id', 'text'] });

      expect(result.isError).toBe(true);
      const parsed = JSON.parse(result.content[0]?.text || '{}') as {
        success: boolean;
        message: string;
      };
      expect(parsed.success).toBe(false);
      expect(parsed.message).toContain('валидации');
    });

    it('должен требовать параметр fields', async () => {
      const result = await tool.execute({ issueIds: ['TEST-123'] });

      expect(result.isError).toBe(true);
      const parsed = JSON.parse(result.content[0]?.text || '{}') as {
        success: boolean;
        message: string;
      };
      expect(parsed.success).toBe(false);
      expect(parsed.message).toContain('валидации');
    });

    it('должен отклонить пустой массив issueIds', async () => {
      const result = await tool.execute({ issueIds: [], fields: ['id', 'text'] });

      expect(result.isError).toBe(true);
      expect(result.content[0]?.text).toContain('валидации');
    });

    it('должен отклонить некорректный perPage (отрицательное число)', async () => {
      const result = await tool.execute({
        issueIds: ['TEST-123'],
        perPage: -1,
        fields: ['id', 'text'],
      });

      expect(result.isError).toBe(true);
      expect(result.content[0]?.text).toContain('валидации');
    });

    it('должен отклонить некорректный perPage (больше 500)', async () => {
      const result = await tool.execute({
        issueIds: ['TEST-123'],
        perPage: 501,
        fields: ['id', 'text'],
      });

      expect(result.isError).toBe(true);
      expect(result.content[0]?.text).toContain('валидации');
    });

    it('должен отклонить некорректный page (0)', async () => {
      const result = await tool.execute({
        issueIds: ['TEST-123'],
        page: 0,
        fields: ['id', 'text'],
      });

      expect(result.isError).toBe(true);
      expect(result.content[0]?.text).toContain('валидации');
    });

    it('должен принять корректные параметры', async () => {
      vi.mocked(mockTrackerFacade.getCommentsMany).mockResolvedValue([
        {
          status: 'fulfilled',
          key: 'TEST-123',
          index: 0,
          value: mockComments,
        },
      ]);

      const result = await tool.execute({
        issueIds: ['TEST-123'],
        fields: ['id', 'text'],
      });

      expect(result.isError).toBeUndefined();
    });
  });

  describe('Operation calls', () => {
    it('должен вызвать getCommentsMany с минимальными параметрами', async () => {
      vi.mocked(mockTrackerFacade.getCommentsMany).mockResolvedValue([
        {
          status: 'fulfilled',
          key: 'TEST-123',
          index: 0,
          value: mockComments,
        },
      ]);

      await tool.execute({
        issueIds: ['TEST-123'],
        fields: ['id', 'text'],
      });

      expect(mockTrackerFacade.getCommentsMany).toHaveBeenCalledWith(['TEST-123'], {
        perPage: undefined,
        page: undefined,
        expand: undefined,
      });
    });

    it('должен вызвать getCommentsMany с параметрами пагинации', async () => {
      vi.mocked(mockTrackerFacade.getCommentsMany).mockResolvedValue([
        {
          status: 'fulfilled',
          key: 'TEST-123',
          index: 0,
          value: mockComments,
        },
      ]);

      await tool.execute({
        issueIds: ['TEST-123'],
        perPage: 50,
        page: 2,
        fields: ['id', 'text'],
      });

      expect(mockTrackerFacade.getCommentsMany).toHaveBeenCalledWith(['TEST-123'], {
        perPage: 50,
        page: 2,
        expand: undefined,
      });
    });

    it('должен вызвать getCommentsMany с expand параметром', async () => {
      vi.mocked(mockTrackerFacade.getCommentsMany).mockResolvedValue([
        {
          status: 'fulfilled',
          key: 'TEST-123',
          index: 0,
          value: mockComments,
        },
      ]);

      await tool.execute({
        issueIds: ['TEST-123'],
        expand: ['attachments'],
        fields: ['id', 'text'],
      });

      expect(mockTrackerFacade.getCommentsMany).toHaveBeenCalledWith(['TEST-123'], {
        perPage: undefined,
        page: undefined,
        expand: 'attachments',
      });
    });

    it('должен вернуть unified batch result', async () => {
      vi.mocked(mockTrackerFacade.getCommentsMany).mockResolvedValue([
        {
          status: 'fulfilled',
          key: 'TEST-123',
          index: 0,
          value: mockComments,
        },
      ]);

      const result = await tool.execute({
        issueIds: ['TEST-123'],
        fields: ['id', 'text'],
      });

      expect(result.isError).toBeUndefined();
      const parsed = JSON.parse(result.content[0]?.text || '{}') as {
        success: boolean;
        data: {
          total: number;
          successful: number;
          failed: number;
          comments: Array<{
            issueId: string;
            comments: CommentWithUnknownFields[];
            count: number;
          }>;
          fieldsReturned: string[];
        };
      };
      expect(parsed.success).toBe(true);
      expect(parsed.data.total).toBe(1);
      expect(parsed.data.successful).toBe(1);
      expect(parsed.data.failed).toBe(0);
      expect(parsed.data.comments).toHaveLength(1);
      expect(parsed.data.comments[0].issueId).toBe('TEST-123');
      expect(parsed.data.comments[0].count).toBe(3);
      expect(parsed.data.fieldsReturned).toEqual(['id', 'text']);
    });

    it('должен вернуть пустой массив для задачи без комментариев', async () => {
      vi.mocked(mockTrackerFacade.getCommentsMany).mockResolvedValue([
        {
          status: 'fulfilled',
          key: 'TEST-123',
          index: 0,
          value: [],
        },
      ]);

      const result = await tool.execute({
        issueIds: ['TEST-123'],
        fields: ['id', 'text'],
      });

      expect(result.isError).toBeUndefined();
      const parsed = JSON.parse(result.content[0]?.text || '{}') as {
        success: boolean;
        data: {
          total: number;
          successful: number;
          comments: Array<{
            count: number;
          }>;
        };
      };
      expect(parsed.success).toBe(true);
      expect(parsed.data.total).toBe(1);
      expect(parsed.data.successful).toBe(1);
      expect(parsed.data.comments[0].count).toBe(0);
    });

    it('должен обработать batch результаты для нескольких задач', async () => {
      vi.mocked(mockTrackerFacade.getCommentsMany).mockResolvedValue([
        {
          status: 'fulfilled',
          key: 'TEST-123',
          index: 0,
          value: mockComments,
        },
        {
          status: 'fulfilled',
          key: 'TEST-456',
          index: 1,
          value: [],
        },
      ]);

      const result = await tool.execute({
        issueIds: ['TEST-123', 'TEST-456'],
        fields: ['id', 'text'],
      });

      expect(result.isError).toBeUndefined();
      const parsed = JSON.parse(result.content[0]?.text || '{}') as {
        success: boolean;
        data: {
          total: number;
          successful: number;
          comments: Array<{
            issueId: string;
            count: number;
          }>;
        };
      };
      expect(parsed.success).toBe(true);
      expect(parsed.data.total).toBe(2);
      expect(parsed.data.successful).toBe(2);
      expect(parsed.data.comments).toHaveLength(2);
      expect(parsed.data.comments[0].issueId).toBe('TEST-123');
      expect(parsed.data.comments[0].count).toBe(3);
      expect(parsed.data.comments[1].issueId).toBe('TEST-456');
      expect(parsed.data.comments[1].count).toBe(0);
    });
  });

  describe('Logging', () => {
    it('должен логировать начало batch операции', async () => {
      vi.mocked(mockTrackerFacade.getCommentsMany).mockResolvedValue([
        {
          status: 'fulfilled',
          key: 'TEST-123',
          index: 0,
          value: mockComments,
        },
      ]);

      await tool.execute({
        issueIds: ['TEST-123'],
        fields: ['id', 'text'],
      });

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Получение комментариев'),
        expect.objectContaining({
          itemsCount: 1,
          fields: 2,
        })
      );
    });

    it('должен логировать результаты batch операции', async () => {
      vi.mocked(mockTrackerFacade.getCommentsMany).mockResolvedValue([
        {
          status: 'fulfilled',
          key: 'TEST-123',
          index: 0,
          value: mockComments,
        },
        {
          status: 'fulfilled',
          key: 'TEST-456',
          index: 1,
          value: [],
        },
      ]);

      await tool.execute({
        issueIds: ['TEST-123', 'TEST-456'],
        fields: ['id', 'text'],
      });

      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.stringContaining('Комментарии получены'),
        expect.objectContaining({
          successful: 2,
          failed: 0,
          fieldsCount: 2,
        })
      );
    });
  });

  describe('Error handling', () => {
    it('должен обработать ошибки от operation', async () => {
      const error = new Error('API Error');
      vi.mocked(mockTrackerFacade.getCommentsMany).mockRejectedValue(error);

      const result = await tool.execute({
        issueIds: ['TEST-123'],
        fields: ['id', 'text'],
      });

      expect(result.isError).toBe(true);
      expect(result.content[0]?.text).toContain('Ошибка при получении комментариев');
    });

    it('должен обработать частичные ошибки (partial failures)', async () => {
      vi.mocked(mockTrackerFacade.getCommentsMany).mockResolvedValue([
        {
          status: 'fulfilled',
          key: 'TEST-123',
          index: 0,
          value: mockComments,
        },
        {
          status: 'rejected',
          key: 'TEST-456',
          index: 1,
          reason: new Error('Not found'),
        },
      ]);

      const result = await tool.execute({
        issueIds: ['TEST-123', 'TEST-456'],
        fields: ['id', 'text'],
      });

      expect(result.isError).toBeUndefined();
      const parsed = JSON.parse(result.content[0]?.text || '{}') as {
        success: boolean;
        data: {
          total: number;
          successful: number;
          failed: number;
          errors: unknown[];
        };
      };
      expect(parsed.success).toBe(true);
      expect(parsed.data.total).toBe(2);
      expect(parsed.data.successful).toBe(1);
      expect(parsed.data.failed).toBe(1);
      expect(parsed.data.errors).toHaveLength(1);
    });

    it('должен обработать полный провал всех запросов', async () => {
      vi.mocked(mockTrackerFacade.getCommentsMany).mockResolvedValue([
        {
          status: 'rejected',
          key: 'TEST-123',
          index: 0,
          reason: new Error('Not found'),
        },
        {
          status: 'rejected',
          key: 'TEST-456',
          index: 1,
          reason: new Error('Access denied'),
        },
      ]);

      const result = await tool.execute({
        issueIds: ['TEST-123', 'TEST-456'],
        fields: ['id', 'text'],
      });

      expect(result.isError).toBeUndefined();
      const parsed = JSON.parse(result.content[0]?.text || '{}') as {
        success: boolean;
        data: {
          total: number;
          successful: number;
          failed: number;
        };
      };
      expect(parsed.success).toBe(true);
      expect(parsed.data.total).toBe(2);
      expect(parsed.data.successful).toBe(0);
      expect(parsed.data.failed).toBe(2);
    });
  });
});
