// tests/unit/tools/api/comments/get-comments.tool.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GetCommentsTool } from '../../../../../src/tools/api/comments/get/get-comments.tool.js';
import { GET_COMMENTS_TOOL_METADATA } from '../../../../../src/tools/api/comments/get/get-comments.metadata.js';
import {
  createMockLogger,
  createMockFacade,
  createCommentsResponseFixture,
} from '#helpers/index.js';
import type { YandexWikiFacade } from '../../../../../src/wiki_api/facade/yandex-wiki.facade.js';
import type { CommentsResponse } from '../../../../../src/wiki_api/entities/index.js';

interface ResourceLinkBlock {
  type: 'resource_link';
  uri: string;
  name: string;
  [key: string]: unknown;
}

function isResourceLinkBlock(block: {
  type: string;
  [key: string]: unknown;
}): block is ResourceLinkBlock {
  return block.type === 'resource_link';
}

describe('GetCommentsTool', () => {
  let tool: GetCommentsTool;
  let mockFacade: Partial<YandexWikiFacade>;

  beforeEach(() => {
    mockFacade = createMockFacade();
    tool = new GetCommentsTool(mockFacade as YandexWikiFacade, createMockLogger());
  });

  describe('metadata', () => {
    it('должен иметь корректные метаданные', () => {
      expect(GetCommentsTool.METADATA).toBe(GET_COMMENTS_TOOL_METADATA);
      expect(GetCommentsTool.METADATA.name).toBe('yw_get_comments');
    });
  });

  describe('execute', () => {
    it('должен получить комментарии с минимальными параметрами', async () => {
      vi.mocked(mockFacade.getComments!).mockResolvedValue(createCommentsResponseFixture());

      const result = await tool.execute({ idx: 123 });

      expect(mockFacade.getComments).toHaveBeenCalledWith({ idx: 123 });
      expect(result.isError).toBeFalsy();
    });

    it('должен вернуть ошибку при невалидных параметрах (нет idx)', async () => {
      const result = await tool.execute({});
      expect(result.isError).toBe(true);
    });

    it('должен обработать ошибку от facade', async () => {
      vi.mocked(mockFacade.getComments!).mockRejectedValue(new Error('API Error'));

      const result = await tool.execute({ idx: 123 });
      expect(result.isError).toBe(true);
    });

    it('в режиме links строит resource_link на wiki://page-comment/{pageId}/{commentId}', async () => {
      vi.mocked(mockFacade.getComments!).mockResolvedValue(createCommentsResponseFixture());

      const result = await tool.execute({ idx: 123, responseMode: 'links' });

      const linkBlocks = result.content.filter(isResourceLinkBlock);
      expect(linkBlocks).toHaveLength(2);
      expect(linkBlocks[0]?.uri).toBe('wiki://page-comment/123/501');
    });

    it('устойчив к некорректному ответу API (results не массив)', async () => {
      vi.mocked(mockFacade.getComments!).mockResolvedValue({
        results: undefined,
      } as unknown as CommentsResponse);

      const result = await tool.execute({ idx: 123 });
      expect(result.isError).toBeFalsy();
    });
  });
});
