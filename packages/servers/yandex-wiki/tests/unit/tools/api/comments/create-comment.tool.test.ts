// tests/unit/tools/api/comments/create-comment.tool.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CreateCommentTool } from '../../../../../src/tools/api/comments/create/create-comment.tool.js';
import { CREATE_COMMENT_TOOL_METADATA } from '../../../../../src/tools/api/comments/create/create-comment.metadata.js';
import { createMockLogger, createMockFacade, createCommentFixture } from '#helpers/index.js';
import type { YandexWikiFacade } from '../../../../../src/wiki_api/facade/yandex-wiki.facade.js';

describe('CreateCommentTool', () => {
  let tool: CreateCommentTool;
  let mockFacade: Partial<YandexWikiFacade>;

  beforeEach(() => {
    mockFacade = createMockFacade();
    tool = new CreateCommentTool(mockFacade as YandexWikiFacade, createMockLogger());
  });

  describe('metadata', () => {
    it('должен иметь корректные метаданные', () => {
      expect(CreateCommentTool.METADATA).toBe(CREATE_COMMENT_TOOL_METADATA);
      expect(CreateCommentTool.METADATA.name).toBe('yw_create_comment');
    });
  });

  describe('execute', () => {
    it('должен создать комментарий с минимальными параметрами', async () => {
      vi.mocked(mockFacade.createComment!).mockResolvedValue(createCommentFixture());

      const result = await tool.execute({ idx: 123, body: 'Hello' });

      expect(mockFacade.createComment).toHaveBeenCalledWith(123, { body: 'Hello' });
      expect(result.isError).toBeFalsy();
    });

    it('должен передать parent_id/thread_id/inline_text', async () => {
      vi.mocked(mockFacade.createComment!).mockResolvedValue(createCommentFixture());

      await tool.execute({
        idx: 123,
        body: 'Reply',
        inline_text: 'quoted',
        parent_id: 501,
        thread_id: 999,
      });

      expect(mockFacade.createComment).toHaveBeenCalledWith(123, {
        body: 'Reply',
        inline_text: 'quoted',
        parent_id: 501,
        thread_id: 999,
      });
    });

    it('должен вернуть ошибку при невалидных параметрах (пустой body)', async () => {
      const result = await tool.execute({ idx: 123, body: '' });
      expect(result.isError).toBe(true);
    });

    it('должен обработать ошибку от facade', async () => {
      vi.mocked(mockFacade.createComment!).mockRejectedValue(new Error('API Error'));

      const result = await tool.execute({ idx: 123, body: 'x' });
      expect(result.isError).toBe(true);
    });
  });
});
