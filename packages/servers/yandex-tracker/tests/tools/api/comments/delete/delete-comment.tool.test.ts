/**
 * Unit тесты для DeleteCommentTool
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DeleteCommentTool } from '#tools/api/comments/delete/index.js';
import type { YandexTrackerFacade } from '#tracker_api/facade/yandex-tracker.facade.js';
import type { Logger } from '@mcp-framework/infrastructure/logging/index.js';
import { buildToolName } from '@mcp-framework/core';
import { MCP_TOOL_PREFIX } from '#constants';

describe('DeleteCommentTool', () => {
  let mockTrackerFacade: YandexTrackerFacade;
  let mockLogger: Logger;
  let tool: DeleteCommentTool;

  beforeEach(() => {
    mockTrackerFacade = {
      deleteComment: vi.fn(),
    } as unknown as YandexTrackerFacade;

    mockLogger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    } as unknown as Logger;

    tool = new DeleteCommentTool(mockTrackerFacade, mockLogger);
  });

  describe('getDefinition', () => {
    it('должен иметь корректное имя yandex_tracker_delete_comment', () => {
      const definition = tool.getDefinition();

      expect(definition.name).toBe(buildToolName('delete_comment', MCP_TOOL_PREFIX));
    });

    it('должен иметь корректную категорию', () => {
      expect(DeleteCommentTool.METADATA.category).toBe('comments');
      expect(DeleteCommentTool.METADATA.subcategory).toBe('write');
    });

    it('должен иметь корректное описание', () => {
      const definition = tool.getDefinition();

      expect(definition.description).toContain('Удалить комментарий');
    });

    it('должен иметь корректную схему с обязательными полями', () => {
      const definition = tool.getDefinition();

      expect(definition.inputSchema.type).toBe('object');
      expect(definition.inputSchema.required).toEqual(['issueId', 'commentId']);
      expect(definition.inputSchema.properties?.['issueId']).toBeDefined();
      expect(definition.inputSchema.properties?.['commentId']).toBeDefined();
    });
  });

  describe('Validation', () => {
    it('должен требовать параметр issueId', async () => {
      const result = await tool.execute({ commentId: '12345' });

      expect(result.isError).toBe(true);
      const parsed = JSON.parse(result.content[0]?.text || '{}') as {
        success: boolean;
        message: string;
      };
      expect(parsed.success).toBe(false);
      expect(parsed.message).toContain('валидации');
    });

    it('должен требовать параметр commentId', async () => {
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
      const result = await tool.execute({
        issueId: '',
        commentId: '12345',
      });

      expect(result.isError).toBe(true);
      expect(result.content[0]?.text).toContain('валидации');
    });

    it('должен отклонить пустой commentId', async () => {
      const result = await tool.execute({
        issueId: 'TEST-123',
        commentId: '',
      });

      expect(result.isError).toBe(true);
      expect(result.content[0]?.text).toContain('Comment ID');
    });

    it('должен принять корректные параметры', async () => {
      vi.mocked(mockTrackerFacade.deleteComment).mockResolvedValue(undefined);

      const result = await tool.execute({
        issueId: 'TEST-123',
        commentId: '12345',
      });

      expect(result.isError).toBeUndefined();
    });
  });

  describe('Operation calls', () => {
    it('должен вызвать deleteComment с корректными параметрами', async () => {
      vi.mocked(mockTrackerFacade.deleteComment).mockResolvedValue(undefined);

      await tool.execute({
        issueId: 'TEST-123',
        commentId: '12345',
      });

      expect(mockTrackerFacade.deleteComment).toHaveBeenCalledWith('TEST-123', '12345');
    });

    it('должен вернуть успешный результат', async () => {
      vi.mocked(mockTrackerFacade.deleteComment).mockResolvedValue(undefined);

      const result = await tool.execute({
        issueId: 'TEST-123',
        commentId: '12345',
      });

      expect(result.isError).toBeUndefined();
      const parsed = JSON.parse(result.content[0]?.text || '{}') as {
        success: boolean;
        data: {
          success: boolean;
          commentId: string;
          issueId: string;
          message: string;
        };
      };
      expect(parsed.success).toBe(true);
      expect(parsed.data.success).toBe(true);
      expect(parsed.data.commentId).toBe('12345');
      expect(parsed.data.issueId).toBe('TEST-123');
      expect(parsed.data.message).toContain('Comment 12345 deleted');
      expect(parsed.data.message).toContain('TEST-123');
    });
  });

  describe('Logging', () => {
    it('должен логировать начало удаления', async () => {
      vi.mocked(mockTrackerFacade.deleteComment).mockResolvedValue(undefined);

      await tool.execute({
        issueId: 'TEST-123',
        commentId: '12345',
      });

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Удаление комментария',
        expect.objectContaining({
          issueId: 'TEST-123',
          commentId: '12345',
        })
      );
    });

    it('должен логировать успешное удаление', async () => {
      vi.mocked(mockTrackerFacade.deleteComment).mockResolvedValue(undefined);

      await tool.execute({
        issueId: 'TEST-123',
        commentId: '12345',
      });

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Комментарий успешно удалён',
        expect.objectContaining({
          issueId: 'TEST-123',
          commentId: '12345',
        })
      );
    });
  });

  describe('Error handling', () => {
    it('должен обработать ошибки от operation', async () => {
      const error = new Error('API Error');
      vi.mocked(mockTrackerFacade.deleteComment).mockRejectedValue(error);

      const result = await tool.execute({
        issueId: 'TEST-123',
        commentId: '12345',
      });

      expect(result.isError).toBe(true);
      expect(result.content[0]?.text).toContain('Ошибка при удалении комментария');
      expect(result.content[0]?.text).toContain('12345');
      expect(result.content[0]?.text).toContain('TEST-123');
    });

    it('должен обработать ошибку несуществующего комментария (404)', async () => {
      const notFoundError = new Error('Comment not found');
      vi.mocked(mockTrackerFacade.deleteComment).mockRejectedValue(notFoundError);

      const result = await tool.execute({
        issueId: 'TEST-123',
        commentId: 'NONEXISTENT',
      });

      expect(result.isError).toBe(true);
      expect(result.content[0]?.text).toContain('Ошибка при удалении комментария');
    });

    it('должен обработать ошибку доступа (403)', async () => {
      const forbiddenError = new Error('Access denied');
      vi.mocked(mockTrackerFacade.deleteComment).mockRejectedValue(forbiddenError);

      const result = await tool.execute({
        issueId: 'PRIVATE-123',
        commentId: '12345',
      });

      expect(result.isError).toBe(true);
      expect(result.content[0]?.text).toContain('Ошибка при удалении комментария');
    });

    it('должен обработать ошибку попытки удалить чужой комментарий', async () => {
      const forbiddenError = new Error('Cannot delete comment of another user');
      vi.mocked(mockTrackerFacade.deleteComment).mockRejectedValue(forbiddenError);

      const result = await tool.execute({
        issueId: 'TEST-123',
        commentId: '12345',
      });

      expect(result.isError).toBe(true);
      expect(result.content[0]?.text).toContain('Ошибка при удалении комментария');
    });
  });
});
