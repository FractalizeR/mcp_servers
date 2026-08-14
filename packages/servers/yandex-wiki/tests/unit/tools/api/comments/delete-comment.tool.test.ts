// tests/unit/tools/api/comments/delete-comment.tool.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DeleteCommentTool } from '../../../../../src/tools/api/comments/delete/delete-comment.tool.js';
import { DELETE_COMMENT_TOOL_METADATA } from '../../../../../src/tools/api/comments/delete/delete-comment.metadata.js';
import { createMockLogger, createMockFacade } from '#helpers/index.js';
import type { YandexWikiFacade } from '../../../../../src/wiki_api/facade/yandex-wiki.facade.js';

describe('DeleteCommentTool', () => {
  let tool: DeleteCommentTool;
  let mockFacade: Partial<YandexWikiFacade>;

  beforeEach(() => {
    mockFacade = createMockFacade();
    tool = new DeleteCommentTool(mockFacade as YandexWikiFacade, createMockLogger());
  });

  describe('metadata', () => {
    it('должен иметь корректные метаданные', () => {
      expect(DeleteCommentTool.METADATA).toBe(DELETE_COMMENT_TOOL_METADATA);
      expect(DeleteCommentTool.METADATA.name).toBe('yw_delete_comment');
    });
  });

  describe('execute', () => {
    it('должен удалить комментарий', async () => {
      vi.mocked(mockFacade.deleteComment!).mockResolvedValue({ comments_count: 3 });

      const result = await tool.execute({ idx: 123, comment_id: 501 });

      expect(mockFacade.deleteComment).toHaveBeenCalledWith(123, 501);
      expect(result.isError).toBeFalsy();
      const data = (result.structuredContent as { data: Record<string, unknown> }).data;
      expect(data['comments_count']).toBe(3);
    });

    it('должен вернуть ошибку при невалидных параметрах (нет comment_id)', async () => {
      const result = await tool.execute({ idx: 123 });
      expect(result.isError).toBe(true);
    });

    it('должен обработать ошибку от facade', async () => {
      vi.mocked(mockFacade.deleteComment!).mockRejectedValue(new Error('API Error'));

      const result = await tool.execute({ idx: 123, comment_id: 501 });
      expect(result.isError).toBe(true);
    });
  });
});
