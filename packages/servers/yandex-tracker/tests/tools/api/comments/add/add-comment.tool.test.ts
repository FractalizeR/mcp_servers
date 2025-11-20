/**
 * Unit тесты для AddCommentTool
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AddCommentTool } from '#tools/api/comments/add/index.js';
import type { YandexTrackerFacade } from '#tracker_api/facade/yandex-tracker.facade.js';
import type { Logger } from '@mcp-framework/infrastructure/logging/index.js';
import type { CommentWithUnknownFields } from '#tracker_api/entities/index.js';
import { buildToolName } from '@mcp-framework/core';
import { MCP_TOOL_PREFIX } from '#constants';
import { createCommentFixture } from '#helpers/comment.fixture.js';

describe('AddCommentTool', () => {
  let mockTrackerFacade: YandexTrackerFacade;
  let mockLogger: Logger;
  let tool: AddCommentTool;

  const mockComment: CommentWithUnknownFields = createCommentFixture({
    id: '12345',
    text: 'Test comment text',
  });

  beforeEach(() => {
    mockTrackerFacade = {
      addComment: vi.fn(),
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

      expect(definition.description).toContain('Добавляет комментарий');
    });

    it('должен иметь корректную схему с обязательными полями', () => {
      const definition = tool.getDefinition();

      expect(definition.inputSchema.type).toBe('object');
      expect(definition.inputSchema.required).toEqual(['issueId', 'text', 'fields']);
      expect(definition.inputSchema.properties?.['issueId']).toBeDefined();
      expect(definition.inputSchema.properties?.['text']).toBeDefined();
      expect(definition.inputSchema.properties?.['attachmentIds']).toBeDefined();
      expect(definition.inputSchema.properties?.['fields']).toBeDefined();
    });
  });

  describe('Validation', () => {
    it('должен требовать параметр issueId', async () => {
      const result = await tool.execute({ text: 'Test comment', fields: ['id', 'text'] });

      expect(result.isError).toBe(true);
      const parsed = JSON.parse(result.content[0]?.text || '{}') as {
        success: boolean;
        message: string;
      };
      expect(parsed.success).toBe(false);
      expect(parsed.message).toContain('валидации');
    });

    it('должен требовать параметр text', async () => {
      const result = await tool.execute({ issueId: 'TEST-123', fields: ['id', 'text'] });

      expect(result.isError).toBe(true);
      const parsed = JSON.parse(result.content[0]?.text || '{}') as {
        success: boolean;
        message: string;
      };
      expect(parsed.success).toBe(false);
      expect(parsed.message).toContain('валидации');
    });

    it('должен требовать параметр fields', async () => {
      const result = await tool.execute({ issueId: 'TEST-123', text: 'Test comment' });

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
        text: 'Test comment',
        fields: ['id', 'text'],
      });

      expect(result.isError).toBe(true);
      expect(result.content[0]?.text).toContain('валидации');
    });

    it('должен отклонить пустой text', async () => {
      const result = await tool.execute({
        issueId: 'TEST-123',
        text: '',
        fields: ['id', 'text'],
      });

      expect(result.isError).toBe(true);
      expect(result.content[0]?.text).toContain('text');
    });

    it('должен принять корректные параметры', async () => {
      vi.mocked(mockTrackerFacade.addComment).mockResolvedValue(mockComment);

      const result = await tool.execute({
        issueId: 'TEST-123',
        text: 'Test comment',
        fields: ['id', 'text'],
      });

      expect(result.isError).toBeUndefined();
    });
  });

  describe('Operation calls', () => {
    it('должен вызвать addComment с минимальными параметрами', async () => {
      vi.mocked(mockTrackerFacade.addComment).mockResolvedValue(mockComment);

      await tool.execute({
        issueId: 'TEST-123',
        text: 'Test comment',
        fields: ['id', 'text'],
      });

      expect(mockTrackerFacade.addComment).toHaveBeenCalledWith('TEST-123', {
        text: 'Test comment',
        attachmentIds: undefined,
      });
    });

    it('должен вызвать addComment с attachmentIds', async () => {
      vi.mocked(mockTrackerFacade.addComment).mockResolvedValue(mockComment);

      await tool.execute({
        issueId: 'TEST-123',
        text: 'Test comment',
        attachmentIds: ['att1', 'att2'],
        fields: ['id', 'text'],
      });

      expect(mockTrackerFacade.addComment).toHaveBeenCalledWith('TEST-123', {
        text: 'Test comment',
        attachmentIds: ['att1', 'att2'],
      });
    });

    it('должен вернуть отфильтрованный комментарий с указанными полями', async () => {
      vi.mocked(mockTrackerFacade.addComment).mockResolvedValue(mockComment);

      const result = await tool.execute({
        issueId: 'TEST-123',
        text: 'Test comment',
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
      expect(parsed.data.comment).toHaveProperty('id');
      expect(parsed.data.comment).toHaveProperty('text');
    });
  });

  describe('Logging', () => {
    it('должен логировать начало добавления комментария', async () => {
      vi.mocked(mockTrackerFacade.addComment).mockResolvedValue(mockComment);

      await tool.execute({
        issueId: 'TEST-123',
        text: 'Test comment',
        fields: ['id', 'text'],
      });

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Добавление комментария к задаче',
        expect.objectContaining({
          issueId: 'TEST-123',
          textLength: 12,
          hasAttachments: false,
        })
      );
    });

    it('должен логировать наличие вложений', async () => {
      vi.mocked(mockTrackerFacade.addComment).mockResolvedValue(mockComment);

      await tool.execute({
        issueId: 'TEST-123',
        text: 'Test comment',
        attachmentIds: ['att1'],
        fields: ['id', 'text'],
      });

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Добавление комментария к задаче',
        expect.objectContaining({
          hasAttachments: true,
        })
      );
    });

    it('должен логировать успешное добавление', async () => {
      vi.mocked(mockTrackerFacade.addComment).mockResolvedValue(mockComment);

      await tool.execute({
        issueId: 'TEST-123',
        text: 'Test comment',
        fields: ['id', 'text'],
      });

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Комментарий успешно добавлен',
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
      vi.mocked(mockTrackerFacade.addComment).mockRejectedValue(error);

      const result = await tool.execute({
        issueId: 'TEST-123',
        text: 'Test comment',
        fields: ['id', 'text'],
      });

      expect(result.isError).toBe(true);
      expect(result.content[0]?.text).toContain('Ошибка при добавлении комментария');
      expect(result.content[0]?.text).toContain('TEST-123');
    });

    it('должен обработать ошибку несуществующей задачи (404)', async () => {
      const notFoundError = new Error('Issue not found');
      vi.mocked(mockTrackerFacade.addComment).mockRejectedValue(notFoundError);

      const result = await tool.execute({
        issueId: 'NONEXISTENT-999',
        text: 'Test comment',
        fields: ['id', 'text'],
      });

      expect(result.isError).toBe(true);
      expect(result.content[0]?.text).toContain('Ошибка при добавлении комментария');
      expect(result.content[0]?.text).toContain('NONEXISTENT-999');
    });

    it('должен обработать ошибку доступа (403)', async () => {
      const forbiddenError = new Error('Access denied');
      vi.mocked(mockTrackerFacade.addComment).mockRejectedValue(forbiddenError);

      const result = await tool.execute({
        issueId: 'PRIVATE-123',
        text: 'Test comment',
        fields: ['id', 'text'],
      });

      expect(result.isError).toBe(true);
      expect(result.content[0]?.text).toContain('Ошибка при добавлении комментария');
    });
  });
});
