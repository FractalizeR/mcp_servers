// tests/unit/tools/api/pages/get-descendants.tool.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GetDescendantsTool } from '../../../../../src/tools/api/pages/descendants/get-descendants.tool.js';
import { GET_DESCENDANTS_TOOL_METADATA } from '../../../../../src/tools/api/pages/descendants/get-descendants.metadata.js';
import {
  createMockLogger,
  createMockFacade,
  createDescendantsResponseFixture,
} from '#helpers/index.js';
import type { YandexWikiFacade } from '../../../../../src/wiki_api/facade/yandex-wiki.facade.js';
import type { PageDescendantsResponse } from '../../../../../src/wiki_api/entities/index.js';

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

describe('GetDescendantsTool', () => {
  let tool: GetDescendantsTool;
  let mockFacade: Partial<YandexWikiFacade>;

  beforeEach(() => {
    mockFacade = createMockFacade();
    tool = new GetDescendantsTool(mockFacade as YandexWikiFacade, createMockLogger());
  });

  describe('metadata', () => {
    it('должен иметь корректные метаданные', () => {
      expect(GetDescendantsTool.METADATA).toBe(GET_DESCENDANTS_TOOL_METADATA);
      expect(GetDescendantsTool.METADATA.name).toBe('yw_get_descendants');
    });
  });

  describe('execute', () => {
    it('должен обойти поддерево по slug', async () => {
      const expected = createDescendantsResponseFixture();
      vi.mocked(mockFacade.getDescendantsBySlug!).mockResolvedValue(expected);

      const result = await tool.execute({ slug: 'users/testuser/section' });

      expect(mockFacade.getDescendantsBySlug).toHaveBeenCalledWith({
        slug: 'users/testuser/section',
      });
      expect(result.isError).toBeFalsy();
    });

    it('должен вернуть ошибку при невалидных параметрах (отсутствует slug)', async () => {
      const result = await tool.execute({});
      expect(result.isError).toBe(true);
    });

    it('должен обработать ошибку от facade', async () => {
      vi.mocked(mockFacade.getDescendantsBySlug!).mockRejectedValue(new Error('API Error'));

      const result = await tool.execute({ slug: 'users/testuser/section' });

      expect(result.isError).toBe(true);
    });

    it('в режиме links строит resource_link на wiki://page/{slug} для каждого потомка', async () => {
      vi.mocked(mockFacade.getDescendantsBySlug!).mockResolvedValue(
        createDescendantsResponseFixture()
      );

      const result = await tool.execute({ slug: 'users/testuser/section', responseMode: 'links' });

      const linkBlocks = result.content.filter(isResourceLinkBlock);
      expect(linkBlocks).toHaveLength(2);
      expect(linkBlocks[0]?.uri).toBe('wiki://page/users/testuser/section/child-1');
      expect(linkBlocks[0]?.name).toBe('users/testuser/section/child-1');
    });

    it('передаёт actuality/cursor/include_self/page_size/show_all в facade', async () => {
      vi.mocked(mockFacade.getDescendantsBySlug!).mockResolvedValue(
        createDescendantsResponseFixture()
      );

      await tool.execute({
        slug: 'users/testuser/section',
        actuality: 'actual',
        cursor: 'c1',
        include_self: true,
        page_size: 30,
        show_all: true,
      });

      expect(mockFacade.getDescendantsBySlug).toHaveBeenCalledWith({
        slug: 'users/testuser/section',
        actuality: 'actual',
        cursor: 'c1',
        include_self: true,
        page_size: 30,
        show_all: true,
      });
    });

    it('устойчив к некорректному ответу API (results не массив)', async () => {
      vi.mocked(mockFacade.getDescendantsBySlug!).mockResolvedValue({
        results: undefined,
      } as unknown as PageDescendantsResponse);

      const result = await tool.execute({ slug: 'users/testuser/section' });
      expect(result.isError).toBeFalsy();
    });
  });
});
