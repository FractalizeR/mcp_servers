/**
 * Unit тесты для DeleteCommentTool (batch-режим)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DeleteCommentTool } from '#tools/api/comments/delete/index.js';
import type { YandexTrackerFacade } from '#tracker_api/facade/yandex-tracker.facade.js';
import type { Logger } from '@fractalizer/mcp-infrastructure/logging/index.js';
import { buildToolName } from '@fractalizer/mcp-core';
import { MCP_TOOL_PREFIX } from '#constants';

describe('DeleteCommentTool', () => {
  let mockTrackerFacade: YandexTrackerFacade;
  let mockLogger: Logger;
  let tool: DeleteCommentTool;

  beforeEach(() => {
    mockTrackerFacade = {
      deleteCommentsMany: vi.fn(),
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

      expect(definition.description).toContain('Удалить комментарии');
      expect(definition.description).toContain('batch');
    });

    it('должен иметь корректную схему с массивом comments', () => {
      const definition = tool.getDefinition();

      expect(definition.inputSchema.type).toBe('object');
      expect(definition.inputSchema.required).toEqual(['comments']);
      expect(definition.inputSchema.properties?.['comments']).toBeDefined();
    });
  });

  describe('Validation', () => {
    it('должен требовать массив comments', async () => {
      const result = await tool.execute({});

      expect(result.isError).toBe(true);
      const parsed = JSON.parse(result.content[0]?.text || '{}') as {
        success: boolean;
        message: string;
      };
      expect(parsed.success).toBe(false);
      expect(parsed.message).toContain('валидации');
    });

    it('должен отклонить пустой массив comments', async () => {
      const result = await tool.execute({ comments: [] });

      expect(result.isError).toBe(true);
      const parsed = JSON.parse(result.content[0]?.text || '{}') as {
        success: boolean;
        message: string;
      };
      expect(parsed.success).toBe(false);
    });

    it('должен отклонить пустой commentId', async () => {
      const result = await tool.execute({
        comments: [{ issueId: 'TEST-123', commentId: '' }],
      });

      expect(result.isError).toBe(true);
      expect(result.content[0]?.text).toContain('commentId');
    });

    it('должен принять корректные параметры', async () => {
      vi.mocked(mockTrackerFacade.deleteCommentsMany).mockResolvedValue([
        { status: 'fulfilled', key: 'TEST-123:12345', value: undefined },
      ]);

      const result = await tool.execute({
        comments: [{ issueId: 'TEST-123', commentId: '12345' }],
      });

      expect(result.isError).toBeUndefined();
    });
  });

  describe('Operation calls', () => {
    it('должен вызвать deleteCommentsMany с корректными параметрами', async () => {
      vi.mocked(mockTrackerFacade.deleteCommentsMany).mockResolvedValue([
        { status: 'fulfilled', key: 'TEST-123:12345', value: undefined },
      ]);

      await tool.execute({
        comments: [{ issueId: 'TEST-123', commentId: '12345' }],
      });

      expect(mockTrackerFacade.deleteCommentsMany).toHaveBeenCalledWith([
        { issueId: 'TEST-123', commentId: '12345' },
      ]);
    });

    it('должен вернуть успешный результат для batch операции', async () => {
      vi.mocked(mockTrackerFacade.deleteCommentsMany).mockResolvedValue([
        { status: 'fulfilled', key: 'TEST-123:12345', value: undefined },
        { status: 'fulfilled', key: 'TEST-456:67890', value: undefined },
      ]);

      const result = await tool.execute({
        comments: [
          { issueId: 'TEST-123', commentId: '12345' },
          { issueId: 'TEST-456', commentId: '67890' },
        ],
      });

      expect(result.isError).toBeUndefined();
      const parsed = JSON.parse(result.content[0]?.text || '{}') as {
        success: boolean;
        data: {
          total: number;
          successful: Array<{ issueId: string; commentId: string; success: boolean }>;
          failed: Array<{ issueId: string; commentId: string; error: string }>;
        };
      };
      expect(parsed.success).toBe(true);
      expect(parsed.data.total).toBe(2);
      expect(parsed.data.successful).toHaveLength(2);
      expect(parsed.data.failed).toHaveLength(0);
    });
  });

  describe('Logging', () => {
    it('должен логировать начало удаления', async () => {
      vi.mocked(mockTrackerFacade.deleteCommentsMany).mockResolvedValue([
        { status: 'fulfilled', key: 'TEST-123:12345', value: undefined },
      ]);

      await tool.execute({
        comments: [{ issueId: 'TEST-123', commentId: '12345' }],
      });

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Удаление комментариев'),
        expect.any(Object)
      );
    });

    it('должен логировать результаты', async () => {
      vi.mocked(mockTrackerFacade.deleteCommentsMany).mockResolvedValue([
        { status: 'fulfilled', key: 'TEST-123:12345', value: undefined },
      ]);

      await tool.execute({
        comments: [{ issueId: 'TEST-123', commentId: '12345' }],
      });

      // ResultLogger.logBatchResults вызывает info с сообщением о результатах
      expect(mockLogger.info).toHaveBeenCalled();
      // Первый вызов - logOperationStart с "Удаление комментариев: N"
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Удаление комментариев'),
        expect.any(Object)
      );
    });
  });

  describe('Error handling', () => {
    it('должен обработать частичные ошибки в batch', async () => {
      vi.mocked(mockTrackerFacade.deleteCommentsMany).mockResolvedValue([
        { status: 'fulfilled', key: 'TEST-123:12345', value: undefined },
        { status: 'rejected', key: 'TEST-456:67890', reason: new Error('Comment not found') },
      ]);

      const result = await tool.execute({
        comments: [
          { issueId: 'TEST-123', commentId: '12345' },
          { issueId: 'TEST-456', commentId: '67890' },
        ],
      });

      expect(result.isError).toBeUndefined();
      const parsed = JSON.parse(result.content[0]?.text || '{}') as {
        success: boolean;
        data: {
          total: number;
          successful: Array<{ issueId: string; commentId: string; success: boolean }>;
          failed: Array<{ issueId: string; commentId: string; error: string }>;
        };
      };
      expect(parsed.success).toBe(true);
      expect(parsed.data.successful).toHaveLength(1);
      expect(parsed.data.failed).toHaveLength(1);
      expect(parsed.data.failed[0].issueId).toBe('TEST-456');
      expect(parsed.data.failed[0].commentId).toBe('67890');
      expect(parsed.data.failed[0].error).toContain('Comment not found');
    });

    it('должен обработать полную ошибку batch', async () => {
      const error = new Error('API Error');
      vi.mocked(mockTrackerFacade.deleteCommentsMany).mockRejectedValue(error);

      const result = await tool.execute({
        comments: [{ issueId: 'TEST-123', commentId: '12345' }],
      });

      expect(result.isError).toBe(true);
      expect(result.content[0]?.text).toContain('Ошибка при удалении комментариев');
    });

    it('должен обработать ошибку несуществующего комментария (404)', async () => {
      vi.mocked(mockTrackerFacade.deleteCommentsMany).mockResolvedValue([
        { status: 'rejected', key: 'TEST-123:NONEXISTENT', reason: new Error('Comment not found') },
      ]);

      const result = await tool.execute({
        comments: [{ issueId: 'TEST-123', commentId: 'NONEXISTENT' }],
      });

      expect(result.isError).toBeUndefined();
      const parsed = JSON.parse(result.content[0]?.text || '{}') as {
        success: boolean;
        data: {
          failed: Array<{ issueId: string; commentId: string; error: string }>;
        };
      };
      expect(parsed.data.failed).toHaveLength(1);
      expect(parsed.data.failed[0].error).toContain('Comment not found');
    });

    it('должен обработать ошибку доступа (403)', async () => {
      vi.mocked(mockTrackerFacade.deleteCommentsMany).mockResolvedValue([
        { status: 'rejected', key: 'PRIVATE-123:12345', reason: new Error('Access denied') },
      ]);

      const result = await tool.execute({
        comments: [{ issueId: 'PRIVATE-123', commentId: '12345' }],
      });

      expect(result.isError).toBeUndefined();
      const parsed = JSON.parse(result.content[0]?.text || '{}') as {
        success: boolean;
        data: {
          failed: Array<{ issueId: string; commentId: string; error: string }>;
        };
      };
      expect(parsed.data.failed).toHaveLength(1);
      expect(parsed.data.failed[0].error).toContain('Access denied');
    });

    it('должен обработать ошибку попытки удалить чужой комментарий', async () => {
      vi.mocked(mockTrackerFacade.deleteCommentsMany).mockResolvedValue([
        {
          status: 'rejected',
          key: 'TEST-123:12345',
          reason: new Error('Cannot delete comment of another user'),
        },
      ]);

      const result = await tool.execute({
        comments: [{ issueId: 'TEST-123', commentId: '12345' }],
      });

      expect(result.isError).toBeUndefined();
      const parsed = JSON.parse(result.content[0]?.text || '{}') as {
        success: boolean;
        data: {
          failed: Array<{ issueId: string; commentId: string; error: string }>;
        };
      };
      expect(parsed.data.failed).toHaveLength(1);
      expect(parsed.data.failed[0].error).toContain('Cannot delete comment of another user');
    });
  });
});
