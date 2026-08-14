// tests/unit/tools/api/page-access/add-page-access.tool.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AddPageAccessTool } from '../../../../../src/tools/api/page-access/add/add-page-access.tool.js';
import { ADD_PAGE_ACCESS_TOOL_METADATA } from '../../../../../src/tools/api/page-access/add/add-page-access.metadata.js';
import { createMockLogger, createMockFacade, createPageAccessFixture } from '#helpers/index.js';
import type { YandexWikiFacade } from '../../../../../src/wiki_api/facade/yandex-wiki.facade.js';

describe('AddPageAccessTool', () => {
  let tool: AddPageAccessTool;
  let mockFacade: Partial<YandexWikiFacade>;

  beforeEach(() => {
    mockFacade = createMockFacade();
    tool = new AddPageAccessTool(mockFacade as YandexWikiFacade, createMockLogger());
  });

  describe('metadata', () => {
    it('должен иметь корректные метаданные', () => {
      expect(AddPageAccessTool.METADATA).toBe(ADD_PAGE_ACCESS_TOOL_METADATA);
      expect(AddPageAccessTool.METADATA.name).toBe('yw_add_page_access');
    });
  });

  describe('execute', () => {
    it('должен добавить доступ пользователю', async () => {
      vi.mocked(mockFacade.createPageAccess!).mockResolvedValue(createPageAccessFixture());

      const result = await tool.execute({
        idx: 123,
        role: 'reader',
        target: { user: { uid: 'u1' } },
      });

      expect(mockFacade.createPageAccess).toHaveBeenCalledWith(123, {
        role: 'reader',
        user: { uid: 'u1' },
      });
      expect(result.isError).toBeFalsy();
    });

    it('должен добавить доступ группе', async () => {
      vi.mocked(mockFacade.createPageAccess!).mockResolvedValue(createPageAccessFixture());

      await tool.execute({
        idx: 123,
        role: 'editor',
        target: { group: { src: 'staff', id: 'g1' } },
        inheritance: 'not_inherited',
      });

      expect(mockFacade.createPageAccess).toHaveBeenCalledWith(123, {
        role: 'editor',
        group: { src: 'staff', id: 'g1' },
        inheritance: 'not_inherited',
      });
    });

    it('должен вернуть ошибку при невалидных параметрах (нет target)', async () => {
      const result = await tool.execute({ idx: 123, role: 'reader' });
      expect(result.isError).toBe(true);
    });

    it('должен обработать ошибку от facade', async () => {
      vi.mocked(mockFacade.createPageAccess!).mockRejectedValue(new Error('API Error'));

      const result = await tool.execute({
        idx: 123,
        role: 'reader',
        target: { user: { uid: 'u1' } },
      });
      expect(result.isError).toBe(true);
    });
  });
});
