// tests/unit/tools/api/page-access/remove-all-page-access.tool.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RemoveAllPageAccessTool } from '../../../../../src/tools/api/page-access/remove-all/remove-all-page-access.tool.js';
import { REMOVE_ALL_PAGE_ACCESS_TOOL_METADATA } from '../../../../../src/tools/api/page-access/remove-all/remove-all-page-access.metadata.js';
import { createMockLogger, createMockFacade } from '#helpers/index.js';
import type { YandexWikiFacade } from '../../../../../src/wiki_api/facade/yandex-wiki.facade.js';

describe('RemoveAllPageAccessTool', () => {
  let tool: RemoveAllPageAccessTool;
  let mockFacade: Partial<YandexWikiFacade>;

  beforeEach(() => {
    mockFacade = createMockFacade();
    tool = new RemoveAllPageAccessTool(mockFacade as YandexWikiFacade, createMockLogger());
  });

  describe('metadata', () => {
    it('должен иметь корректные метаданные', () => {
      expect(RemoveAllPageAccessTool.METADATA).toBe(REMOVE_ALL_PAGE_ACCESS_TOOL_METADATA);
      expect(RemoveAllPageAccessTool.METADATA.name).toBe('yw_remove_all_page_access');
    });
  });

  describe('execute', () => {
    it('должен удалить все доступы страницы', async () => {
      vi.mocked(mockFacade.deleteAllPageAccesses!).mockResolvedValue(undefined);

      const result = await tool.execute({ idx: 123 });

      expect(mockFacade.deleteAllPageAccesses).toHaveBeenCalledWith({ idx: 123 });
      expect(result.isError).toBeFalsy();
    });

    it('должен вернуть ошибку при невалидных параметрах (нет idx)', async () => {
      const result = await tool.execute({});
      expect(result.isError).toBe(true);
    });

    it('должен обработать ошибку от facade', async () => {
      vi.mocked(mockFacade.deleteAllPageAccesses!).mockRejectedValue(new Error('API Error'));

      const result = await tool.execute({ idx: 123 });
      expect(result.isError).toBe(true);
    });
  });
});
