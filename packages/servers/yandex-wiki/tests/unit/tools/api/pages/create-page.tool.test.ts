// tests/unit/tools/api/pages/create-page.tool.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CreatePageTool } from '../../../../../src/tools/api/pages/create/create-page.tool.js';
import { CREATE_PAGE_TOOL_METADATA } from '../../../../../src/tools/api/pages/create/create-page.metadata.js';
import { createMockLogger, createMockFacade, createPageFixture } from '#helpers/index.js';
import type { YandexWikiFacade } from '../../../../../src/wiki_api/facade/yandex-wiki.facade.js';

describe('CreatePageTool', () => {
  let tool: CreatePageTool;
  let mockFacade: Partial<YandexWikiFacade>;
  let mockLogger: ReturnType<typeof createMockLogger>;

  beforeEach(() => {
    mockFacade = createMockFacade();
    mockLogger = createMockLogger();
    tool = new CreatePageTool(mockFacade as YandexWikiFacade, mockLogger);
  });

  describe('metadata', () => {
    it('должен иметь корректные метаданные', () => {
      expect(CreatePageTool.METADATA).toBe(CREATE_PAGE_TOOL_METADATA);
      expect(CreatePageTool.METADATA.name).toBe('yw_create_page');
    });
  });

  describe('execute', () => {
    it('должен создать страницу с валидными параметрами', async () => {
      const expectedPage = createPageFixture();
      vi.mocked(mockFacade.createPage!).mockResolvedValue(expectedPage);

      const result = await tool.execute({
        page_type: 'page',
        slug: 'users/test-page',
        title: 'Test Page',
      });

      expect(mockFacade.createPage).toHaveBeenCalledWith({
        data: {
          page_type: 'page',
          slug: 'users/test-page',
          title: 'Test Page',
        },
      });
      expect(result.isError).toBeFalsy();
    });

    it('должен создать страницу с контентом', async () => {
      const expectedPage = createPageFixture();
      vi.mocked(mockFacade.createPage!).mockResolvedValue(expectedPage);

      await tool.execute({
        page_type: 'page',
        slug: 'users/test',
        title: 'Test',
        content: '# Hello',
      });

      expect(mockFacade.createPage).toHaveBeenCalledWith({
        data: {
          page_type: 'page',
          slug: 'users/test',
          title: 'Test',
          content: '# Hello',
        },
      });
    });

    it('должен вернуть ошибку при невалидных параметрах', async () => {
      const result = await tool.execute({
        // missing required fields
      });

      expect(result.isError).toBe(true);
    });

    it('должен обработать ошибку от facade', async () => {
      vi.mocked(mockFacade.createPage!).mockRejectedValue(new Error('API Error'));

      const result = await tool.execute({
        page_type: 'page',
        slug: 'users/test',
        title: 'Test',
      });

      expect(result.isError).toBe(true);
    });
  });
});
