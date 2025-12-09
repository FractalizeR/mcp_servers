// tests/unit/tools/api/pages/delete-page.tool.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DeletePageTool } from '../../../../../src/tools/api/pages/delete/delete-page.tool.js';
import { DELETE_PAGE_TOOL_METADATA } from '../../../../../src/tools/api/pages/delete/delete-page.metadata.js';
import { createMockLogger, createMockFacade, createDeleteResultFixture } from '#helpers/index.js';
import type { YandexWikiFacade } from '../../../../../src/wiki_api/facade/yandex-wiki.facade.js';

describe('DeletePageTool', () => {
  let tool: DeletePageTool;
  let mockFacade: Partial<YandexWikiFacade>;
  let mockLogger: ReturnType<typeof createMockLogger>;

  beforeEach(() => {
    mockFacade = createMockFacade();
    mockLogger = createMockLogger();
    tool = new DeletePageTool(mockFacade as YandexWikiFacade, mockLogger);
  });

  describe('metadata', () => {
    it('должен иметь корректные метаданные', () => {
      expect(DeletePageTool.METADATA).toBe(DELETE_PAGE_TOOL_METADATA);
      expect(DeletePageTool.METADATA.name).toBe('yw_delete_page');
    });
  });

  describe('execute', () => {
    it('должен удалить страницу с валидными параметрами', async () => {
      const expectedResult = createDeleteResultFixture();
      vi.mocked(mockFacade.deletePage!).mockResolvedValue(expectedResult);

      const result = await tool.execute({
        idx: 123,
      });

      expect(mockFacade.deletePage).toHaveBeenCalledWith(123);
      expect(result.isError).toBeFalsy();
    });

    it('должен вернуть ошибку при невалидных параметрах', async () => {
      const result = await tool.execute({
        // missing required idx
      });

      expect(result.isError).toBe(true);
    });

    it('должен обработать ошибку от facade', async () => {
      vi.mocked(mockFacade.deletePage!).mockRejectedValue(new Error('API Error'));

      const result = await tool.execute({
        idx: 456,
      });

      expect(result.isError).toBe(true);
    });
  });
});
