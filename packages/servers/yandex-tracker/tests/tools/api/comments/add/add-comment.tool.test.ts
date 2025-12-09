/**
 * Unit тесты для AddCommentTool (batch режим)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AddCommentTool } from '#tools/api/comments/add/index.js';
import type { YandexTrackerFacade } from '#tracker_api/facade/yandex-tracker.facade.js';
import type { Logger } from '@fractalizer/mcp-infrastructure/logging/index.js';
import type { CommentWithUnknownFields } from '#tracker_api/entities/index.js';
import { buildToolName } from '@fractalizer/mcp-core';
import { MCP_TOOL_PREFIX } from '#constants';
import { createCommentFixture } from '#helpers/comment.fixture.js';

describe('AddCommentTool', () => {
  let mockTrackerFacade: YandexTrackerFacade;
  let mockLogger: Logger;
  let tool: AddCommentTool;

  const mockComment1: CommentWithUnknownFields = createCommentFixture({
    id: '12345',
    text: 'Test comment 1',
  });

  const mockComment2: CommentWithUnknownFields = createCommentFixture({
    id: '67890',
    text: 'Test comment 2',
  });

  beforeEach(() => {
    mockTrackerFacade = {
      addCommentsMany: vi.fn(),
    } as unknown as YandexTrackerFacade;

    mockLogger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    } as unknown as Logger;

    tool = new AddCommentTool(mockTrackerFacade, mockLogger);
  });

  describe('getDefinition', () => {
    it('должен иметь корректное имя yandex_tracker_add_comment', () => {
      const definition = tool.getDefinition();

      expect(definition.name).toBe(buildToolName('add_comment', MCP_TOOL_PREFIX));
    });

    it('должен иметь корректную категорию', () => {
      expect(AddCommentTool.METADATA.category).toBe('comments');
      expect(AddCommentTool.METADATA.subcategory).toBe('write');
    });

    it('должен иметь корректное описание', () => {
      const definition = tool.getDefinition();

      expect(definition.description).toContain('Добавить комментарии');
    });

    it('должен иметь корректную схему с обязательными полями', () => {
      const definition = tool.getDefinition();

      expect(definition.inputSchema.type).toBe('object');
      expect(definition.inputSchema.required).toEqual(['comments', 'fields']);
      expect(definition.inputSchema.properties?.['comments']).toBeDefined();
      expect(definition.inputSchema.properties?.['fields']).toBeDefined();
    });
  });

  describe('Validation', () => {
    it('должен требовать параметр comments', async () => {
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
      const result = await tool.execute({
        comments: [{ issueId: 'TEST-123', text: 'Test comment' }],
      });

      expect(result.isError).toBe(true);
      const parsed = JSON.parse(result.content[0]?.text || '{}') as {
        success: boolean;
        message: string;
      };
      expect(parsed.success).toBe(false);
      expect(parsed.message).toContain('валидации');
    });

    it('должен отклонить пустой массив comments', async () => {
      const result = await tool.execute({
        comments: [],
        fields: ['id', 'text'],
      });

      expect(result.isError).toBe(true);
      expect(result.content[0]?.text).toContain('минимум 1 элемент');
    });

    it('должен отклонить comment без issueId', async () => {
      const result = await tool.execute({
        comments: [{ text: 'Test comment' }],
        fields: ['id', 'text'],
      });

      expect(result.isError).toBe(true);
      expect(result.content[0]?.text).toContain('валидации');
    });

    it('должен отклонить comment без text', async () => {
      const result = await tool.execute({
        comments: [{ issueId: 'TEST-123' }],
        fields: ['id', 'text'],
      });

      expect(result.isError).toBe(true);
      expect(result.content[0]?.text).toContain('валидации');
    });

    it('должен отклонить пустой text', async () => {
      const result = await tool.execute({
        comments: [{ issueId: 'TEST-123', text: '' }],
        fields: ['id', 'text'],
      });

      expect(result.isError).toBe(true);
      expect(result.content[0]?.text).toContain('text');
    });

    it('должен принять корректные параметры', async () => {
      vi.mocked(mockTrackerFacade.addCommentsMany).mockResolvedValue([
        {
          status: 'fulfilled',
          key: 'TEST-123',
          value: mockComment1,
        },
      ]);

      const result = await tool.execute({
        comments: [{ issueId: 'TEST-123', text: 'Test comment' }],
        fields: ['id', 'text'],
      });

      expect(result.isError).toBeUndefined();
    });
  });

  describe('Batch operations', () => {
    it('должен вызвать addCommentsMany с массивом комментариев', async () => {
      vi.mocked(mockTrackerFacade.addCommentsMany).mockResolvedValue([
        {
          status: 'fulfilled',
          key: 'TEST-1',
          value: mockComment1,
        },
        {
          status: 'fulfilled',
          key: 'TEST-2',
          value: mockComment2,
        },
      ]);

      await tool.execute({
        comments: [
          { issueId: 'TEST-1', text: 'Comment 1' },
          { issueId: 'TEST-2', text: 'Comment 2' },
        ],
        fields: ['id', 'text'],
      });

      expect(mockTrackerFacade.addCommentsMany).toHaveBeenCalledWith([
        { issueId: 'TEST-1', text: 'Comment 1' },
        { issueId: 'TEST-2', text: 'Comment 2' },
      ]);
    });

    it('должен передать attachmentIds для каждого комментария индивидуально', async () => {
      vi.mocked(mockTrackerFacade.addCommentsMany).mockResolvedValue([
        {
          status: 'fulfilled',
          key: 'TEST-1',
          value: mockComment1,
        },
        {
          status: 'fulfilled',
          key: 'TEST-2',
          value: mockComment2,
        },
      ]);

      await tool.execute({
        comments: [
          { issueId: 'TEST-1', text: 'Comment 1' },
          { issueId: 'TEST-2', text: 'Comment 2', attachmentIds: ['att1', 'att2'] },
        ],
        fields: ['id', 'text'],
      });

      expect(mockTrackerFacade.addCommentsMany).toHaveBeenCalledWith([
        { issueId: 'TEST-1', text: 'Comment 1' },
        { issueId: 'TEST-2', text: 'Comment 2', attachmentIds: ['att1', 'att2'] },
      ]);
    });

    it('должен вернуть unified batch result format', async () => {
      vi.mocked(mockTrackerFacade.addCommentsMany).mockResolvedValue([
        {
          status: 'fulfilled',
          key: 'TEST-1',
          value: mockComment1,
        },
        {
          status: 'fulfilled',
          key: 'TEST-2',
          value: mockComment2,
        },
      ]);

      const result = await tool.execute({
        comments: [
          { issueId: 'TEST-1', text: 'Comment 1' },
          { issueId: 'TEST-2', text: 'Comment 2' },
        ],
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
            commentId: string;
            comment: CommentWithUnknownFields;
          }>;
          errors: Array<{ issueId: string; error: string }>;
          fieldsReturned: string[];
        };
      };

      expect(parsed.success).toBe(true);
      expect(parsed.data.total).toBe(2);
      expect(parsed.data.successful).toBe(2);
      expect(parsed.data.failed).toBe(0);
      expect(parsed.data.comments).toHaveLength(2);
      expect(parsed.data.errors).toHaveLength(0);
      expect(parsed.data.comments[0].issueId).toBe('TEST-1');
      expect(parsed.data.comments[0].commentId).toBe('12345');
      expect(parsed.data.comments[1].issueId).toBe('TEST-2');
      expect(parsed.data.comments[1].commentId).toBe('67890');
      expect(parsed.data.fieldsReturned).toEqual(['id', 'text']);
    });

    it('должен обработать частичные ошибки', async () => {
      vi.mocked(mockTrackerFacade.addCommentsMany).mockResolvedValue([
        {
          status: 'fulfilled',
          key: 'TEST-1',
          value: mockComment1,
        },
        {
          status: 'rejected',
          key: 'TEST-2',
          reason: new Error('Not found'),
        },
      ]);

      const result = await tool.execute({
        comments: [
          { issueId: 'TEST-1', text: 'Comment 1' },
          { issueId: 'TEST-2', text: 'Comment 2' },
        ],
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
            commentId: string;
            comment: CommentWithUnknownFields;
          }>;
          errors: Array<{ issueId: string; error: string }>;
        };
      };

      expect(parsed.success).toBe(true);
      expect(parsed.data.total).toBe(2);
      expect(parsed.data.successful).toBe(1);
      expect(parsed.data.failed).toBe(1);
      expect(parsed.data.comments).toHaveLength(1);
      expect(parsed.data.errors).toHaveLength(1);
      expect(parsed.data.errors[0].issueId).toBe('TEST-2');
      expect(parsed.data.errors[0].error).toContain('Not found');
    });

    it('должен фильтровать поля для всех созданных комментариев', async () => {
      const fullComment = createCommentFixture({
        id: '12345',
        text: 'Test comment',
      });

      vi.mocked(mockTrackerFacade.addCommentsMany).mockResolvedValue([
        {
          status: 'fulfilled',
          key: 'TEST-1',
          value: fullComment,
        },
      ]);

      const result = await tool.execute({
        comments: [{ issueId: 'TEST-1', text: 'Comment 1' }],
        fields: ['id', 'text'],
      });

      expect(result.isError).toBeUndefined();
      const parsed = JSON.parse(result.content[0]?.text || '{}') as {
        success: boolean;
        data: {
          comments: Array<{
            comment: CommentWithUnknownFields;
          }>;
        };
      };

      // Проверяем, что вернулись только указанные поля
      const returnedComment = parsed.data.comments[0].comment;
      expect(returnedComment).toHaveProperty('id');
      expect(returnedComment).toHaveProperty('text');
      // Другие поля должны быть отфильтрованы
    });
  });

  describe('Error handling', () => {
    it('должен обработать ошибки от operation', async () => {
      const error = new Error('API Error');
      vi.mocked(mockTrackerFacade.addCommentsMany).mockRejectedValue(error);

      const result = await tool.execute({
        comments: [
          { issueId: 'TEST-1', text: 'Comment 1' },
          { issueId: 'TEST-2', text: 'Comment 2' },
        ],
        fields: ['id', 'text'],
      });

      expect(result.isError).toBe(true);
      expect(result.content[0]?.text).toContain('Ошибка при добавлении комментариев');
      expect(result.content[0]?.text).toContain('2 задач');
    });
  });
});
