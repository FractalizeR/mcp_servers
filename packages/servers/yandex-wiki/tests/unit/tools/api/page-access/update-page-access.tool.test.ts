// tests/unit/tools/api/page-access/update-page-access.tool.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UpdatePageAccessTool } from '../../../../../src/tools/api/page-access/update/update-page-access.tool.js';
import { UPDATE_PAGE_ACCESS_TOOL_METADATA } from '../../../../../src/tools/api/page-access/update/update-page-access.metadata.js';
import { createMockLogger, createMockFacade, createPageAccessFixture } from '#helpers/index.js';
import type { YandexWikiFacade } from '../../../../../src/wiki_api/facade/yandex-wiki.facade.js';

describe('UpdatePageAccessTool', () => {
  let tool: UpdatePageAccessTool;
  let mockFacade: Partial<YandexWikiFacade>;

  beforeEach(() => {
    mockFacade = createMockFacade();
    tool = new UpdatePageAccessTool(mockFacade as YandexWikiFacade, createMockLogger());
  });

  describe('metadata', () => {
    it('должен иметь корректные метаданные', () => {
      expect(UpdatePageAccessTool.METADATA).toBe(UPDATE_PAGE_ACCESS_TOOL_METADATA);
      expect(UpdatePageAccessTool.METADATA.name).toBe('yw_update_page_access');
    });
  });

  describe('execute', () => {
    it('должен изменить роль доступа', async () => {
      vi.mocked(mockFacade.updatePageAccess!).mockResolvedValue(
        createPageAccessFixture({ role: 'editor' })
      );

      const result = await tool.execute({ idx: 123, access_id: 'a1', role: 'editor' });

      expect(mockFacade.updatePageAccess).toHaveBeenCalledWith({
        idx: 123,
        access_id: 'a1',
        data: { role: 'editor' },
      });
      expect(result.isError).toBeFalsy();
    });

    it('должен передать prevent_selflock и inheritance', async () => {
      vi.mocked(mockFacade.updatePageAccess!).mockResolvedValue(createPageAccessFixture());

      await tool.execute({
        idx: 123,
        access_id: 'a1',
        role: 'author',
        inheritance: 'inherited',
        prevent_selflock: true,
      });

      expect(mockFacade.updatePageAccess).toHaveBeenCalledWith({
        idx: 123,
        access_id: 'a1',
        data: { role: 'author', inheritance: 'inherited' },
        prevent_selflock: true,
      });
    });

    it('должен вернуть ошибку при невалидных параметрах (нет access_id)', async () => {
      const result = await tool.execute({ idx: 123, role: 'reader' });
      expect(result.isError).toBe(true);
    });

    it('должен обработать ошибку от facade', async () => {
      vi.mocked(mockFacade.updatePageAccess!).mockRejectedValue(new Error('API Error'));

      const result = await tool.execute({ idx: 123, access_id: 'a1', role: 'reader' });
      expect(result.isError).toBe(true);
    });
  });
});
