/**
 * Unit тесты для EditCommentTool
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EditCommentTool } from '#tools/api/comments/edit/index.js';
import type { YandexTrackerFacade } from '#tracker_api/facade/yandex-tracker.facade.js';
import type { Logger } from '@mcp-framework/infrastructure/logging/index.js';
import type { CommentWithUnknownFields } from '#tracker_api/entities/index.js';
import { buildToolName } from '@mcp-framework/core';
import { MCP_TOOL_PREFIX } from '#constants';
import { createEditedCommentFixture } from '#helpers/comment.fixture.js';

describe('EditCommentTool', () => {
  let mockTrackerFacade: YandexTrackerFacade;
  let mockLogger: Logger;
  let tool: EditCommentTool;

  const mockEditedComment: CommentWithUnknownFields = createEditedCommentFixture({
    id: '12345',
    text: 'Updated comment text',
    version: 2,
  });

  beforeEach(() => {
    mockTrackerFacade = {
      editComment: vi.fn(),
    } as unknown as YandexTrackerFacade;

    mockLogger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    } as unknown as Logger;

    tool = new EditCommentTool(mockTrackerFacade, mockLogger);
  });

  describe('getDefinition', () => {
    it('должен иметь корректное имя yandex_tracker_edit_comment', () => {
      const definition = tool.getDefinition();

      expect(definition.name).toBe(buildToolName('edit_comment', MCP_TOOL_PREFIX));
    });

    it('должен иметь корректную категорию', () => {
      expect(EditCommentTool.METADATA.category).toBe('comments');
      expect(EditCommentTool.METADATA.subcategory).toBe('write');
    });

    it('должен иметь корректное описание', () => {
      const definition = tool.getDefinition();

      expect(definition.description).toContain('Редактировать комментарий');
    });

    it('должен иметь корректную схему с обязательными полями', () => {
      const definition = tool.getDefinition();

      expect(definition.inputSchema.type).toBe('object');
      expect(definition.inputSchema.required).toEqual(['issueId', 'commentId', 'text', 'fields']);
      expect(definition.inputSchema.properties?.['issueId']).toBeDefined();
      expect(definition.inputSchema.properties?.['commentId']).toBeDefined();
      expect(definition.inputSchema.properties?.['text']).toBeDefined();
      expect(definition.inputSchema.properties?.['fields']).toBeDefined();
    });
  });

  describe('Validation', () => {
    it('должен требовать параметр issueId', async () => {
      const result = await tool.execute({
        commentId: '12345',
        text: 'Updated',
        fields: ['id', 'text'],
      });

      expect(result.isError).toBe(true);
      const parsed = JSON.parse(result.content[0]?.text || '{}') as {
        success: boolean;
        message: string;
      };
      expect(parsed.success).toBe(false);
      expect(parsed.message).toContain('валидации');
    });

    it('должен требовать параметр commentId', async () => {
      const result = await tool.execute({
        issueId: 'TEST-123',
        text: 'Updated',
        fields: ['id', 'text'],
      });

      expect(result.isError).toBe(true);
      const parsed = JSON.parse(result.content[0]?.text || '{}') as {
        success: boolean;
        message: string;
      };
      expect(parsed.success).toBe(false);
      expect(parsed.message).toContain('валидации');
    });

    it('должен требовать параметр text', async () => {
      const result = await tool.execute({
        issueId: 'TEST-123',
        commentId: '12345',
        fields: ['id', 'text'],
      });

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
        issueId: 'TEST-123',
        commentId: '12345',
        text: 'Updated',
      });

      expect(result.isError).toBe(true);
      const parsed = JSON.parse(result.content[0]?.text || '{}') as {
        success: boolean;
        message: string;
      };
      expect(parsed.success).toBe(false);
      expect(parsed.message).toContain('валидации');
    });

    it('должен отклонить пустой issueId', async () => {
      const result = await tool.execute({
        issueId: '',
        commentId: '12345',
        text: 'Updated',
        fields: ['id', 'text'],
      });

      expect(result.isError).toBe(true);
      expect(result.content[0]?.text).toContain('валидации');
    });

    it('должен отклонить пустой commentId', async () => {
      const result = await tool.execute({
        issueId: 'TEST-123',
        commentId: '',
        text: 'Updated',
        fields: ['id', 'text'],
      });

      expect(result.isError).toBe(true);
      expect(result.content[0]?.text).toContain('Comment ID');
    });

    it('должен отклонить пустой text', async () => {
      const result = await tool.execute({
        issueId: 'TEST-123',
        commentId: '12345',
        text: '',
        fields: ['id', 'text'],
      });

      expect(result.isError).toBe(true);
      expect(result.content[0]?.text).toContain('text');
    });

    it('должен принять корректные параметры', async () => {
      vi.mocked(mockTrackerFacade.editComment).mockResolvedValue(mockEditedComment);

      const result = await tool.execute({
        issueId: 'TEST-123',
        commentId: '12345',
        text: 'Updated comment',
        fields: ['id', 'text'],
      });

      expect(result.isError).toBeUndefined();
    });
  });

  describe('Operation calls', () => {
    it('должен вызвать editComment с корректными параметрами', async () => {
      vi.mocked(mockTrackerFacade.editComment).mockResolvedValue(mockEditedComment);

      await tool.execute({
        issueId: 'TEST-123',
        commentId: '12345',
        text: 'Updated comment text',
        fields: ['id', 'text'],
      });

      expect(mockTrackerFacade.editComment).toHaveBeenCalledWith('TEST-123', '12345', {
        text: 'Updated comment text',
      });
    });

    it('должен вернуть обновленный комментарий', async () => {
      vi.mocked(mockTrackerFacade.editComment).mockResolvedValue(mockEditedComment);

      const result = await tool.execute({
        issueId: 'TEST-123',
        commentId: '12345',
        text: 'Updated comment text',
        fields: ['id', 'text'],
      });

      expect(result.isError).toBeUndefined();
      const parsed = JSON.parse(result.content[0]?.text || '{}') as {
        success: boolean;
        data: {
          commentId: string;
          comment: CommentWithUnknownFields;
          issueId: string;
          fieldsReturned: string[];
        };
      };
      expect(parsed.success).toBe(true);
      expect(parsed.data.commentId).toBe('12345');
      expect(parsed.data.issueId).toBe('TEST-123');
      expect(parsed.data.fieldsReturned).toEqual(['id', 'text']);
      expect(parsed.data.comment).toMatchObject({
        id: '12345',
        text: 'Updated comment text',
      });
    });
  });

  describe('Logging', () => {
    it('должен логировать начало редактирования', async () => {
      vi.mocked(mockTrackerFacade.editComment).mockResolvedValue(mockEditedComment);

      await tool.execute({
        issueId: 'TEST-123',
        commentId: '12345',
        text: 'Updated comment text',
        fields: ['id', 'text'],
      });

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Редактирование комментария',
        expect.objectContaining({
          issueId: 'TEST-123',
          commentId: '12345',
          textLength: 20,
        })
      );
    });

    it('должен логировать успешное обновление', async () => {
      vi.mocked(mockTrackerFacade.editComment).mockResolvedValue(mockEditedComment);

      await tool.execute({
        issueId: 'TEST-123',
        commentId: '12345',
        text: 'Updated comment text',
        fields: ['id', 'text'],
      });

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Комментарий успешно обновлён',
        expect.objectContaining({
          issueId: 'TEST-123',
          commentId: '12345',
          version: 2,
        })
      );
    });
  });

  describe('Error handling', () => {
    it('должен обработать ошибки от operation', async () => {
      const error = new Error('API Error');
      vi.mocked(mockTrackerFacade.editComment).mockRejectedValue(error);

      const result = await tool.execute({
        issueId: 'TEST-123',
        commentId: '12345',
        text: 'Updated comment',
        fields: ['id', 'text'],
      });

      expect(result.isError).toBe(true);
      expect(result.content[0]?.text).toContain('Ошибка при редактировании комментария');
      expect(result.content[0]?.text).toContain('12345');
      expect(result.content[0]?.text).toContain('TEST-123');
    });

    it('должен обработать ошибку несуществующего комментария (404)', async () => {
      const notFoundError = new Error('Comment not found');
      vi.mocked(mockTrackerFacade.editComment).mockRejectedValue(notFoundError);

      const result = await tool.execute({
        issueId: 'TEST-123',
        commentId: 'NONEXISTENT',
        text: 'Updated comment',
        fields: ['id', 'text'],
      });

      expect(result.isError).toBe(true);
      expect(result.content[0]?.text).toContain('Ошибка при редактировании комментария');
    });

    it('должен обработать ошибку доступа (403)', async () => {
      const forbiddenError = new Error('Access denied');
      vi.mocked(mockTrackerFacade.editComment).mockRejectedValue(forbiddenError);

      const result = await tool.execute({
        issueId: 'PRIVATE-123',
        commentId: '12345',
        text: 'Updated comment',
        fields: ['id', 'text'],
      });

      expect(result.isError).toBe(true);
      expect(result.content[0]?.text).toContain('Ошибка при редактировании комментария');
    });
  });
});
