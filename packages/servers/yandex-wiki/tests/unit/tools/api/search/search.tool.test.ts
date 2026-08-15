// tests/unit/tools/api/search/search.tool.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SearchTool } from '../../../../../src/tools/api/search/search.tool.js';
import { SEARCH_TOOL_METADATA } from '../../../../../src/tools/api/search/search.metadata.js';
import { createMockLogger, createMockFacade, createSearchResponseFixture } from '#helpers/index.js';
import type { YandexWikiFacade } from '../../../../../src/wiki_api/facade/yandex-wiki.facade.js';
import type { SearchResponse } from '../../../../../src/wiki_api/entities/index.js';

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

describe('SearchTool', () => {
  let tool: SearchTool;
  let mockFacade: Partial<YandexWikiFacade>;

  beforeEach(() => {
    mockFacade = createMockFacade();
    tool = new SearchTool(mockFacade as YandexWikiFacade, createMockLogger());
  });

  describe('metadata', () => {
    it('должен иметь корректные метаданные', () => {
      expect(SearchTool.METADATA).toBe(SEARCH_TOOL_METADATA);
      expect(SearchTool.METADATA.name).toBe('yw_search');
      expect(SearchTool.METADATA.annotations?.idempotentHint).toBe(true);
      expect(SearchTool.METADATA.annotations?.readOnlyHint).toBe(true);
    });
  });

  describe('execute', () => {
    it('должен выполнить поиск с минимальными параметрами', async () => {
      vi.mocked(mockFacade.search!).mockResolvedValue(createSearchResponseFixture());

      const result = await tool.execute({ query: 'test' });

      expect(mockFacade.search).toHaveBeenCalledWith({ query: 'test' });
      expect(result.isError).toBeFalsy();
    });

    it('должен вернуть ошибку при невалидных параметрах (пустой query)', async () => {
      const result = await tool.execute({ query: '' });
      expect(result.isError).toBe(true);
    });

    it('должен обработать ошибку от facade', async () => {
      vi.mocked(mockFacade.search!).mockRejectedValue(new Error('API Error'));

      const result = await tool.execute({ query: 'fail' });

      expect(result.isError).toBe(true);
    });

    it('в режиме full отдаёт результаты инлайн', async () => {
      vi.mocked(mockFacade.search!).mockResolvedValue(createSearchResponseFixture());

      const result = await tool.execute({ query: 'test', responseMode: 'full' });

      const data = (result['structuredContent'] as { data: Record<string, unknown> }).data;
      expect(data['mode']).toBe('full');
      expect(data['items']).toHaveLength(1);
    });

    it('в режиме links строит resource_link на wiki://page/{slug}', async () => {
      vi.mocked(mockFacade.search!).mockResolvedValue(createSearchResponseFixture());

      const result = await tool.execute({ query: 'test', responseMode: 'links' });

      const linkBlocks = result.content.filter(isResourceLinkBlock);
      expect(linkBlocks).toHaveLength(1);
      expect(linkBlocks[0]?.uri).toBe('wiki://page/users/testuser/found-page');
      expect(linkBlocks[0]?.name).toBe('Found Page');
    });

    it('результат без slug использует url как uri ссылки', async () => {
      vi.mocked(mockFacade.search!).mockResolvedValue({
        results: [{ url: 'https://external.example/file.pdf', title: 'Some File' }],
      } as SearchResponse);

      const result = await tool.execute({ query: 'test', responseMode: 'links' });

      const linkBlocks = result.content.filter(isResourceLinkBlock);
      expect(linkBlocks[0]?.uri).toBe('https://external.example/file.pdf');
    });

    it('устойчив к некорректному ответу API (results не массив)', async () => {
      vi.mocked(mockFacade.search!).mockResolvedValue({
        results: undefined,
      } as unknown as SearchResponse);

      const result = await tool.execute({ query: 'test' });
      expect(result.isError).toBeFalsy();
    });
  });
});
