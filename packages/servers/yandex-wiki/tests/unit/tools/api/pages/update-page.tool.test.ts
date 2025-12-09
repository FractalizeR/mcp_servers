// tests/unit/tools/api/pages/update-page.tool.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UpdatePageTool } from '../../../../../src/tools/api/pages/update/update-page.tool.js';
import { UPDATE_PAGE_TOOL_METADATA } from '../../../../../src/tools/api/pages/update/update-page.metadata.js';
import { createMockLogger, createMockFacade, createPageFixture } from '#helpers/index.js';
import type { YandexWikiFacade } from '../../../../../src/wiki_api/facade/yandex-wiki.facade.js';

describe('UpdatePageTool', () => {
  let tool: UpdatePageTool;
  let mockFacade: Partial<YandexWikiFacade>;
  let mockLogger: ReturnType<typeof createMockLogger>;

  beforeEach(() => {
    mockFacade = createMockFacade();
    mockLogger = createMockLogger();
    tool = new UpdatePageTool(mockFacade as YandexWikiFacade, mockLogger);
  });

  describe('metadata', () => {
    it('должен иметь корректные метаданные', () => {
      expect(UpdatePageTool.METADATA).toBe(UPDATE_PAGE_TOOL_METADATA);
      expect(UpdatePageTool.METADATA.name).toBe('yw_update_page');
    });
  });

  describe('execute', () => {
    it('должен обновить страницу с валидными параметрами', async () => {
      const expectedPage = createPageFixture();
      vi.mocked(mockFacade.updatePage!).mockResolvedValue(expectedPage);

      const result = await tool.execute({
        idx: 123,
        title: 'Updated Title',
      });

      expect(mockFacade.updatePage).toHaveBeenCalledWith({
        idx: 123,
        data: {
          title: 'Updated Title',
        },
      });
      expect(result.isError).toBeFalsy();
    });

    it('должен обновить страницу с контентом', async () => {
      const expectedPage = createPageFixture();
      vi.mocked(mockFacade.updatePage!).mockResolvedValue(expectedPage);

      await tool.execute({
        idx: 456,
        title: 'Test',
        content: '# Updated',
      });

      expect(mockFacade.updatePage).toHaveBeenCalledWith({
        idx: 456,
        data: {
          title: 'Test',
          content: '# Updated',
        },
      });
    });

    it('должен вернуть ошибку при невалидных параметрах', async () => {
      const result = await tool.execute({
        // missing required idx
        title: 'Test',
      });

      expect(result.isError).toBe(true);
    });

    it('должен обработать ошибку от facade', async () => {
      vi.mocked(mockFacade.updatePage!).mockRejectedValue(new Error('API Error'));

      const result = await tool.execute({
        idx: 789,
        title: 'Test',
      });

      expect(result.isError).toBe(true);
    });
  });
});
