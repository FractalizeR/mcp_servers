// tests/unit/tools/api/pages/get-page.tool.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GetPageTool } from '../../../../../src/tools/api/pages/get/get-page.tool.js';
import { GET_PAGE_TOOL_METADATA } from '../../../../../src/tools/api/pages/get/get-page.metadata.js';
import { createMockLogger, createMockFacade, createPageFixture } from '#helpers/index.js';
import type { YandexWikiFacade } from '../../../../../src/wiki_api/facade/yandex-wiki.facade.js';

describe('GetPageTool', () => {
  let tool: GetPageTool;
  let mockFacade: Partial<YandexWikiFacade>;
  let mockLogger: ReturnType<typeof createMockLogger>;

  beforeEach(() => {
    mockFacade = createMockFacade();
    mockLogger = createMockLogger();
    tool = new GetPageTool(mockFacade as YandexWikiFacade, mockLogger);
  });

  describe('metadata', () => {
    it('должен иметь корректные метаданные', () => {
      expect(GetPageTool.METADATA).toBe(GET_PAGE_TOOL_METADATA);
      expect(GetPageTool.METADATA.name).toBe('yw_get_page');
      expect(GetPageTool.METADATA.description).toBeDefined();
    });
  });

  describe('execute', () => {
    it('должен получить страницу с валидными параметрами', async () => {
      const expectedPage = createPageFixture();
      vi.mocked(mockFacade.getPage!).mockResolvedValue(expectedPage);

      const result = await tool.execute({
        slug: 'users/test-page',
      });

      expect(mockFacade.getPage).toHaveBeenCalledWith({
        slug: 'users/test-page',
      });
      expect(result.isError).toBeFalsy();
    });

    it('должен вернуть ошибку при невалидных параметрах', async () => {
      const result = await tool.execute({
        // missing required slug
      });

      expect(result.isError).toBe(true);
    });

    it('должен обработать ошибку от facade', async () => {
      vi.mocked(mockFacade.getPage!).mockRejectedValue(new Error('API Error'));

      const result = await tool.execute({
        slug: 'users/test',
      });

      expect(result.isError).toBe(true);
    });
  });
});
