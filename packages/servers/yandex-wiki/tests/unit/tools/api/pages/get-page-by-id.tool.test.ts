// tests/unit/tools/api/pages/get-page-by-id.tool.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GetPageByIdTool } from '../../../../../src/tools/api/pages/get-by-id/get-page-by-id.tool.js';
import { GET_PAGE_BY_ID_TOOL_METADATA } from '../../../../../src/tools/api/pages/get-by-id/get-page-by-id.metadata.js';
import { createMockLogger, createMockFacade, createPageFixture } from '#helpers/index.js';
import type { YandexWikiFacade } from '../../../../../src/wiki_api/facade/yandex-wiki.facade.js';

describe('GetPageByIdTool', () => {
  let tool: GetPageByIdTool;
  let mockFacade: Partial<YandexWikiFacade>;
  let mockLogger: ReturnType<typeof createMockLogger>;

  beforeEach(() => {
    mockFacade = createMockFacade();
    mockLogger = createMockLogger();
    tool = new GetPageByIdTool(mockFacade as YandexWikiFacade, mockLogger);
  });

  describe('metadata', () => {
    it('должен иметь корректные метаданные', () => {
      expect(GetPageByIdTool.METADATA).toBe(GET_PAGE_BY_ID_TOOL_METADATA);
      expect(GetPageByIdTool.METADATA.name).toBe('yw_get_page_by_id');
    });
  });

  describe('execute', () => {
    it('должен получить страницу по ID с валидными параметрами', async () => {
      const expectedPage = createPageFixture();
      vi.mocked(mockFacade.getPageById!).mockResolvedValue(expectedPage);

      const result = await tool.execute({
        idx: 123,
      });

      expect(mockFacade.getPageById).toHaveBeenCalledWith({ idx: 123 });
      expect(result.isError).toBeFalsy();
    });

    it('должен вернуть ошибку при невалидных параметрах', async () => {
      const result = await tool.execute({
        // missing required idx
      });

      expect(result.isError).toBe(true);
    });

    it('должен обработать ошибку от facade', async () => {
      vi.mocked(mockFacade.getPageById!).mockRejectedValue(new Error('API Error'));

      const result = await tool.execute({
        idx: 456,
      });

      expect(result.isError).toBe(true);
    });
  });
});
