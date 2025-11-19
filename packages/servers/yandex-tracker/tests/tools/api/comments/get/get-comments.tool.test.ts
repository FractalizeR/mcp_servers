/**
 * Unit тесты для GetCommentsTool
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GetCommentsTool } from '@tools/api/comments/get/index.js';
import type { YandexTrackerFacade } from '@tracker_api/facade/yandex-tracker.facade.js';
import type { Logger } from '@mcp-framework/infrastructure/logging/index.js';
import type { CommentWithUnknownFields } from '@tracker_api/entities/index.js';
import { buildToolName } from '@mcp-framework/core';
import { MCP_TOOL_PREFIX } from '@constants';
import { createCommentListFixture } from '../../../../helpers/comment.fixture.js';

describe('GetCommentsTool', () => {
  let mockTrackerFacade: YandexTrackerFacade;
  let mockLogger: Logger;
  let tool: GetCommentsTool;

  const mockComments: CommentWithUnknownFields[] = createCommentListFixture(3);

  beforeEach(() => {
    mockTrackerFacade = {
      getComments: vi.fn(),
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

      expect(definition.description).toContain('комментариев');
      expect(definition.description).toContain('задачи');
    });

    it('должен иметь корректную схему с обязательными полями', () => {
      const definition = tool.getDefinition();

      expect(definition.inputSchema.type).toBe('object');
      expect(definition.inputSchema.required).toEqual(['issueId', 'fields']);
      expect(definition.inputSchema.properties?.['issueId']).toBeDefined();
      expect(definition.inputSchema.properties?.['perPage']).toBeDefined();
      expect(definition.inputSchema.properties?.['page']).toBeDefined();
      expect(definition.inputSchema.properties?.['expand']).toBeDefined();
      expect(definition.inputSchema.properties?.['fields']).toBeDefined();
    });
  });

  describe('Validation', () => {
    it('должен требовать параметр issueId', async () => {
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
      const result = await tool.execute({ issueId: 'TEST-123' });

      expect(result.isError).toBe(true);
      const parsed = JSON.parse(result.content[0]?.text || '{}') as {
        success: boolean;
        message: string;
      };
      expect(parsed.success).toBe(false);
      expect(parsed.message).toContain('валидации');
    });

    it('должен отклонить пустой issueId', async () => {
      const result = await tool.execute({ issueId: '', fields: ['id', 'text'] });

      expect(result.isError).toBe(true);
      expect(result.content[0]?.text).toContain('валидации');
    });

    it('должен отклонить некорректный perPage (отрицательное число)', async () => {
      const result = await tool.execute({
        issueId: 'TEST-123',
        perPage: -1,
        fields: ['id', 'text'],
      });

      expect(result.isError).toBe(true);
      expect(result.content[0]?.text).toContain('валидации');
    });

    it('должен отклонить некорректный perPage (больше 500)', async () => {
      const result = await tool.execute({
        issueId: 'TEST-123',
        perPage: 501,
        fields: ['id', 'text'],
      });

      expect(result.isError).toBe(true);
      expect(result.content[0]?.text).toContain('валидации');
    });

    it('должен отклонить некорректный page (0)', async () => {
      const result = await tool.execute({
        issueId: 'TEST-123',
        page: 0,
        fields: ['id', 'text'],
      });

      expect(result.isError).toBe(true);
      expect(result.content[0]?.text).toContain('валидации');
    });

    it('должен принять корректные параметры', async () => {
      vi.mocked(mockTrackerFacade.getComments).mockResolvedValue(mockComments);

      const result = await tool.execute({
        issueId: 'TEST-123',
        fields: ['id', 'text'],
      });

      expect(result.isError).toBeUndefined();
    });
  });

  describe('Operation calls', () => {
    it('должен вызвать getComments с минимальными параметрами', async () => {
      vi.mocked(mockTrackerFacade.getComments).mockResolvedValue(mockComments);

      await tool.execute({
        issueId: 'TEST-123',
        fields: ['id', 'text'],
      });

      expect(mockTrackerFacade.getComments).toHaveBeenCalledWith('TEST-123', {
        perPage: undefined,
        page: undefined,
        expand: undefined,
      });
    });

    it('должен вызвать getComments с параметрами пагинации', async () => {
      vi.mocked(mockTrackerFacade.getComments).mockResolvedValue(mockComments);

      await tool.execute({
        issueId: 'TEST-123',
        perPage: 50,
        page: 2,
        fields: ['id', 'text'],
      });

      expect(mockTrackerFacade.getComments).toHaveBeenCalledWith('TEST-123', {
        perPage: 50,
        page: 2,
        expand: undefined,
      });
    });

    it('должен вызвать getComments с expand параметром', async () => {
      vi.mocked(mockTrackerFacade.getComments).mockResolvedValue(mockComments);

      await tool.execute({
        issueId: 'TEST-123',
        expand: ['attachments'],
        fields: ['id', 'text'],
      });

      expect(mockTrackerFacade.getComments).toHaveBeenCalledWith('TEST-123', {
        perPage: undefined,
        page: undefined,
        expand: 'attachments',
      });
    });

    it('должен вернуть список комментариев', async () => {
      vi.mocked(mockTrackerFacade.getComments).mockResolvedValue(mockComments);

      const result = await tool.execute({
        issueId: 'TEST-123',
        fields: ['id', 'text'],
      });

      expect(result.isError).toBeUndefined();
      const parsed = JSON.parse(result.content[0]?.text || '{}') as {
        success: boolean;
        data: {
          issueId: string;
          comments: CommentWithUnknownFields[];
          count: number;
          fieldsReturned: string[];
        };
      };
      expect(parsed.success).toBe(true);
      expect(parsed.data.issueId).toBe('TEST-123');
      expect(parsed.data.comments).toHaveLength(3);
      expect(parsed.data.count).toBe(3);
      expect(parsed.data.fieldsReturned).toEqual(['id', 'text']);
    });

    it('должен вернуть пустой массив для задачи без комментариев', async () => {
      vi.mocked(mockTrackerFacade.getComments).mockResolvedValue([]);

      const result = await tool.execute({
        issueId: 'TEST-123',
        fields: ['id', 'text'],
      });

      expect(result.isError).toBeUndefined();
      const parsed = JSON.parse(result.content[0]?.text || '{}') as {
        success: boolean;
        data: {
          comments: CommentWithUnknownFields[];
          count: number;
        };
      };
      expect(parsed.success).toBe(true);
      expect(parsed.data.comments).toHaveLength(0);
      expect(parsed.data.count).toBe(0);
    });
  });

  describe('Logging', () => {
    it('должен логировать начало получения комментариев', async () => {
      vi.mocked(mockTrackerFacade.getComments).mockResolvedValue(mockComments);

      await tool.execute({
        issueId: 'TEST-123',
        fields: ['id', 'text'],
      });

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Получение комментариев задачи',
        expect.objectContaining({
          issueId: 'TEST-123',
        })
      );
    });

    it('должен логировать параметры пагинации', async () => {
      vi.mocked(mockTrackerFacade.getComments).mockResolvedValue(mockComments);

      await tool.execute({
        issueId: 'TEST-123',
        perPage: 50,
        page: 2,
        fields: ['id', 'text'],
      });

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Получение комментариев задачи',
        expect.objectContaining({
          perPage: 50,
          page: 2,
        })
      );
    });

    it('должен логировать успешное получение', async () => {
      vi.mocked(mockTrackerFacade.getComments).mockResolvedValue(mockComments);

      await tool.execute({
        issueId: 'TEST-123',
        fields: ['id', 'text'],
      });

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Комментарии успешно получены',
        expect.objectContaining({
          issueId: 'TEST-123',
          commentsCount: 3,
        })
      );
    });
  });

  describe('Error handling', () => {
    it('должен обработать ошибки от operation', async () => {
      const error = new Error('API Error');
      vi.mocked(mockTrackerFacade.getComments).mockRejectedValue(error);

      const result = await tool.execute({
        issueId: 'TEST-123',
        fields: ['id', 'text'],
      });

      expect(result.isError).toBe(true);
      expect(result.content[0]?.text).toContain('Ошибка при получении комментариев');
      expect(result.content[0]?.text).toContain('TEST-123');
    });

    it('должен обработать ошибку несуществующей задачи (404)', async () => {
      const notFoundError = new Error('Issue not found');
      vi.mocked(mockTrackerFacade.getComments).mockRejectedValue(notFoundError);

      const result = await tool.execute({
        issueId: 'NONEXISTENT-999',
        fields: ['id', 'text'],
      });

      expect(result.isError).toBe(true);
      expect(result.content[0]?.text).toContain('Ошибка при получении комментариев');
      expect(result.content[0]?.text).toContain('NONEXISTENT-999');
    });

    it('должен обработать ошибку доступа (403)', async () => {
      const forbiddenError = new Error('Access denied');
      vi.mocked(mockTrackerFacade.getComments).mockRejectedValue(forbiddenError);

      const result = await tool.execute({
        issueId: 'PRIVATE-123',
        fields: ['id', 'text'],
      });

      expect(result.isError).toBe(true);
      expect(result.content[0]?.text).toContain('Ошибка при получении комментариев');
    });
  });
});
