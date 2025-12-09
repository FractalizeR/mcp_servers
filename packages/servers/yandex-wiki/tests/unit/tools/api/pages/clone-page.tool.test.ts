// tests/unit/tools/api/pages/clone-page.tool.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ClonePageTool } from '../../../../../src/tools/api/pages/clone/clone-page.tool.js';
import { CLONE_PAGE_TOOL_METADATA } from '../../../../../src/tools/api/pages/clone/clone-page.metadata.js';
import { createMockLogger, createMockFacade, createAsyncOperationFixture } from '#helpers/index.js';
import type { YandexWikiFacade } from '../../../../../src/wiki_api/facade/yandex-wiki.facade.js';

describe('ClonePageTool', () => {
  let tool: ClonePageTool;
  let mockFacade: Partial<YandexWikiFacade>;
  let mockLogger: ReturnType<typeof createMockLogger>;

  beforeEach(() => {
    mockFacade = createMockFacade();
    mockLogger = createMockLogger();
    tool = new ClonePageTool(mockFacade as YandexWikiFacade, mockLogger);
  });

  describe('metadata', () => {
    it('должен иметь корректные метаданные', () => {
      expect(ClonePageTool.METADATA).toBe(CLONE_PAGE_TOOL_METADATA);
      expect(ClonePageTool.METADATA.name).toBe('yw_clone_page');
    });
  });

  describe('execute', () => {
    it('должен клонировать страницу с валидными параметрами', async () => {
      const expectedResult = createAsyncOperationFixture();
      vi.mocked(mockFacade.clonePage!).mockResolvedValue(expectedResult);

      const result = await tool.execute({
        idx: 123,
        target: 'users/cloned-page',
      });

      expect(mockFacade.clonePage).toHaveBeenCalledWith(123, {
        target: 'users/cloned-page',
      });
      expect(result.isError).toBeFalsy();
    });

    it('должен клонировать страницу с заголовком', async () => {
      const expectedResult = createAsyncOperationFixture();
      vi.mocked(mockFacade.clonePage!).mockResolvedValue(expectedResult);

      await tool.execute({
        idx: 456,
        target: 'users/cloned',
        title: 'Cloned Page',
      });

      expect(mockFacade.clonePage).toHaveBeenCalledWith(456, {
        target: 'users/cloned',
        title: 'Cloned Page',
      });
    });

    it('должен вернуть ошибку при невалидных параметрах', async () => {
      const result = await tool.execute({
        // missing required fields
        idx: 123,
      });

      expect(result.isError).toBe(true);
    });

    it('должен обработать ошибку от facade', async () => {
      vi.mocked(mockFacade.clonePage!).mockRejectedValue(new Error('API Error'));

      const result = await tool.execute({
        idx: 789,
        target: 'users/clone',
      });

      expect(result.isError).toBe(true);
    });
  });
});
