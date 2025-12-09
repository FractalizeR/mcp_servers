/**
 * Unit тесты для EditCommentTool (batch-режим)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EditCommentTool } from '#tools/api/comments/edit/index.js';
import type { YandexTrackerFacade } from '#tracker_api/facade/yandex-tracker.facade.js';
import type { Logger } from '@fractalizer/mcp-infrastructure/logging/index.js';
import { buildToolName } from '@fractalizer/mcp-core';
import { MCP_TOOL_PREFIX } from '#constants';
import { createEditedCommentFixture } from '#helpers/comment.fixture.js';

describe('EditCommentTool', () => {
  let mockTrackerFacade: YandexTrackerFacade;
  let mockLogger: Logger;
  let tool: EditCommentTool;

  beforeEach(() => {
    mockTrackerFacade = {
      editCommentsMany: vi.fn(),
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

      expect(definition.description).toContain('Редактировать комментарии');
      expect(definition.description).toContain('batch');
    });

    it('должен иметь корректную схему с массивом comments', () => {
      const definition = tool.getDefinition();

      expect(definition.inputSchema.type).toBe('object');
      expect(definition.inputSchema.required).toEqual(['comments', 'fields']);
      expect(definition.inputSchema.properties?.['comments']).toBeDefined();
      expect(definition.inputSchema.properties?.['fields']).toBeDefined();
    });
  });

  describe('Validation', () => {
    it('должен требовать массив comments', async () => {
      const result = await tool.execute({ fields: ['id', 'text'] });

      expect(result.isError).toBe(true);
      const parsed = JSON.parse(result.content[0]?.text || '{}') as {
        success: boolean;
        message: string;
      };
      expect(parsed.success).toBe(false);
      expect(parsed.message).toContain('валидации');
    });

    it('должен отклонить пустой массив comments', async () => {
      const result = await tool.execute({ comments: [], fields: ['id', 'text'] });

      expect(result.isError).toBe(true);
      const parsed = JSON.parse(result.content[0]?.text || '{}') as {
        success: boolean;
        message: string;
      };
      expect(parsed.success).toBe(false);
    });

    it('должен отклонить пустой commentId', async () => {
      const result = await tool.execute({
        comments: [{ issueId: 'TEST-123', commentId: '', text: 'Updated' }],
        fields: ['id', 'text'],
      });

      expect(result.isError).toBe(true);
      expect(result.content[0]?.text).toContain('commentId');
    });

    it('должен отклонить пустой text', async () => {
      const result = await tool.execute({
        comments: [{ issueId: 'TEST-123', commentId: '12345', text: '' }],
        fields: ['id', 'text'],
      });

      expect(result.isError).toBe(true);
      expect(result.content[0]?.text).toContain('text');
    });

    it('должен принять корректные параметры', async () => {
      vi.mocked(mockTrackerFacade.editCommentsMany).mockResolvedValue([
        {
          status: 'fulfilled',
          key: 'TEST-123:12345',
          value: createEditedCommentFixture({ id: '12345', text: 'Updated' }),
        },
      ]);

      const result = await tool.execute({
        comments: [{ issueId: 'TEST-123', commentId: '12345', text: 'Updated comment' }],
        fields: ['id', 'text'],
      });

      expect(result.isError).toBeUndefined();
    });
  });

  describe('Operation calls', () => {
    it('должен вызвать editCommentsMany с корректными параметрами', async () => {
      vi.mocked(mockTrackerFacade.editCommentsMany).mockResolvedValue([
        {
          status: 'fulfilled',
          key: 'TEST-123:12345',
          value: createEditedCommentFixture({ id: '12345', text: 'Updated' }),
        },
      ]);

      await tool.execute({
        comments: [{ issueId: 'TEST-123', commentId: '12345', text: 'Updated comment text' }],
        fields: ['id', 'text'],
      });

      expect(mockTrackerFacade.editCommentsMany).toHaveBeenCalledWith([
        { issueId: 'TEST-123', commentId: '12345', text: 'Updated comment text' },
      ]);
    });

    it('должен вернуть успешный результат для batch операции', async () => {
      vi.mocked(mockTrackerFacade.editCommentsMany).mockResolvedValue([
        {
          status: 'fulfilled',
          key: 'TEST-123:12345',
          value: createEditedCommentFixture({ id: '12345', text: 'Updated 1' }),
        },
        {
          status: 'fulfilled',
          key: 'TEST-456:67890',
          value: createEditedCommentFixture({ id: '67890', text: 'Updated 2' }),
        },
      ]);

      const result = await tool.execute({
        comments: [
          { issueId: 'TEST-123', commentId: '12345', text: 'Updated 1' },
          { issueId: 'TEST-456', commentId: '67890', text: 'Updated 2' },
        ],
        fields: ['id', 'text'],
      });

      expect(result.isError).toBeUndefined();
      const parsed = JSON.parse(result.content[0]?.text || '{}') as {
        success: boolean;
        data: {
          total: number;
          successful: Array<{ issueId: string; commentId: string; comment: unknown }>;
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
    it('должен логировать начало редактирования', async () => {
      vi.mocked(mockTrackerFacade.editCommentsMany).mockResolvedValue([
        {
          status: 'fulfilled',
          key: 'TEST-123:12345',
          value: createEditedCommentFixture({ id: '12345', text: 'Updated' }),
        },
      ]);

      await tool.execute({
        comments: [{ issueId: 'TEST-123', commentId: '12345', text: 'Updated comment text' }],
        fields: ['id', 'text'],
      });

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Редактирование комментариев'),
        expect.any(Object)
      );
    });

    it('должен логировать результаты', async () => {
      vi.mocked(mockTrackerFacade.editCommentsMany).mockResolvedValue([
        {
          status: 'fulfilled',
          key: 'TEST-123:12345',
          value: createEditedCommentFixture({ id: '12345', text: 'Updated' }),
        },
      ]);

      await tool.execute({
        comments: [{ issueId: 'TEST-123', commentId: '12345', text: 'Updated comment text' }],
        fields: ['id', 'text'],
      });

      expect(mockLogger.info).toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Редактирование комментариев'),
        expect.any(Object)
      );
    });
  });

  describe('Error handling', () => {
    it('должен обработать частичные ошибки в batch', async () => {
      vi.mocked(mockTrackerFacade.editCommentsMany).mockResolvedValue([
        {
          status: 'fulfilled',
          key: 'TEST-123:12345',
          value: createEditedCommentFixture({ id: '12345', text: 'Updated' }),
        },
        { status: 'rejected', key: 'TEST-456:67890', reason: new Error('Comment not found') },
      ]);

      const result = await tool.execute({
        comments: [
          { issueId: 'TEST-123', commentId: '12345', text: 'Updated 1' },
          { issueId: 'TEST-456', commentId: '67890', text: 'Updated 2' },
        ],
        fields: ['id', 'text'],
      });

      expect(result.isError).toBeUndefined();
      const parsed = JSON.parse(result.content[0]?.text || '{}') as {
        success: boolean;
        data: {
          total: number;
          successful: Array<{ issueId: string; commentId: string; comment: unknown }>;
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
      vi.mocked(mockTrackerFacade.editCommentsMany).mockRejectedValue(error);

      const result = await tool.execute({
        comments: [{ issueId: 'TEST-123', commentId: '12345', text: 'Updated' }],
        fields: ['id', 'text'],
      });

      expect(result.isError).toBe(true);
      expect(result.content[0]?.text).toContain('Ошибка при редактировании комментариев');
    });

    it('должен обработать ошибку несуществующего комментария (404)', async () => {
      vi.mocked(mockTrackerFacade.editCommentsMany).mockResolvedValue([
        { status: 'rejected', key: 'TEST-123:NONEXISTENT', reason: new Error('Comment not found') },
      ]);

      const result = await tool.execute({
        comments: [{ issueId: 'TEST-123', commentId: 'NONEXISTENT', text: 'Updated' }],
        fields: ['id', 'text'],
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
      vi.mocked(mockTrackerFacade.editCommentsMany).mockResolvedValue([
        { status: 'rejected', key: 'PRIVATE-123:12345', reason: new Error('Access denied') },
      ]);

      const result = await tool.execute({
        comments: [{ issueId: 'PRIVATE-123', commentId: '12345', text: 'Updated' }],
        fields: ['id', 'text'],
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
  });
});
