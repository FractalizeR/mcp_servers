// tests/unit/tools/api/comments/get-comment-thread.tool.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GetCommentThreadTool } from '../../../../../src/tools/api/comments/thread/get-comment-thread.tool.js';
import { GET_COMMENT_THREAD_TOOL_METADATA } from '../../../../../src/tools/api/comments/thread/get-comment-thread.metadata.js';
import {
  createMockLogger,
  createMockFacade,
  createCommentsResponseFixture,
} from '#helpers/index.js';
import type { YandexWikiFacade } from '../../../../../src/wiki_api/facade/yandex-wiki.facade.js';

describe('GetCommentThreadTool', () => {
  let tool: GetCommentThreadTool;
  let mockFacade: Partial<YandexWikiFacade>;

  beforeEach(() => {
    mockFacade = createMockFacade();
    tool = new GetCommentThreadTool(mockFacade as YandexWikiFacade, createMockLogger());
  });

  describe('metadata', () => {
    it('должен иметь корректные метаданные', () => {
      expect(GetCommentThreadTool.METADATA).toBe(GET_COMMENT_THREAD_TOOL_METADATA);
      expect(GetCommentThreadTool.METADATA.name).toBe('yw_get_comment_thread');
    });
  });

  describe('execute', () => {
    it('должен получить тред комментария', async () => {
      vi.mocked(mockFacade.getCommentThread!).mockResolvedValue(createCommentsResponseFixture());

      const result = await tool.execute({ idx: 123, comment_id: 501 });

      expect(mockFacade.getCommentThread).toHaveBeenCalledWith({ idx: 123, comment_id: 501 });
      expect(result.isError).toBeFalsy();
    });

    it('должен вернуть ошибку при невалидных параметрах (нет comment_id)', async () => {
      const result = await tool.execute({ idx: 123 });
      expect(result.isError).toBe(true);
    });

    it('должен обработать ошибку от facade', async () => {
      vi.mocked(mockFacade.getCommentThread!).mockRejectedValue(new Error('API Error'));

      const result = await tool.execute({ idx: 123, comment_id: 501 });
      expect(result.isError).toBe(true);
    });
  });
});
