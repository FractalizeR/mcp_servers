// tests/unit/tools/api/page-access/remove-page-access.tool.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RemovePageAccessTool } from '../../../../../src/tools/api/page-access/remove/remove-page-access.tool.js';
import { REMOVE_PAGE_ACCESS_TOOL_METADATA } from '../../../../../src/tools/api/page-access/remove/remove-page-access.metadata.js';
import { createMockLogger, createMockFacade } from '#helpers/index.js';
import type { YandexWikiFacade } from '../../../../../src/wiki_api/facade/yandex-wiki.facade.js';

describe('RemovePageAccessTool', () => {
  let tool: RemovePageAccessTool;
  let mockFacade: Partial<YandexWikiFacade>;

  beforeEach(() => {
    mockFacade = createMockFacade();
    tool = new RemovePageAccessTool(mockFacade as YandexWikiFacade, createMockLogger());
  });

  describe('metadata', () => {
    it('должен иметь корректные метаданные', () => {
      expect(RemovePageAccessTool.METADATA).toBe(REMOVE_PAGE_ACCESS_TOOL_METADATA);
      expect(RemovePageAccessTool.METADATA.name).toBe('yw_remove_page_access');
    });
  });

  describe('execute', () => {
    it('должен удалить доступ', async () => {
      vi.mocked(mockFacade.deletePageAccess!).mockResolvedValue(undefined);

      const result = await tool.execute({ idx: 123, access_id: 'a1' });

      expect(mockFacade.deletePageAccess).toHaveBeenCalledWith({ idx: 123, access_id: 'a1' });
      expect(result.isError).toBeFalsy();
    });

    it('должен вернуть ошибку при невалидных параметрах (нет access_id)', async () => {
      const result = await tool.execute({ idx: 123 });
      expect(result.isError).toBe(true);
    });

    it('должен обработать ошибку от facade', async () => {
      vi.mocked(mockFacade.deletePageAccess!).mockRejectedValue(new Error('API Error'));

      const result = await tool.execute({ idx: 123, access_id: 'a1' });
      expect(result.isError).toBe(true);
    });
  });
});
