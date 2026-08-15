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

    // Дефект 7.1.B №5: redirect существовал в UpdatePageDto, но схема
    // инструмента его не объявляла — параметр был физически недостижим.
    it('должен передать redirect в data (дефект 7.1.B №5)', async () => {
      const expectedPage = createPageFixture();
      vi.mocked(mockFacade.updatePage!).mockResolvedValue(expectedPage);

      await tool.execute({
        idx: 321,
        redirect: { page: { slug: 'users/target' } },
      });

      expect(mockFacade.updatePage).toHaveBeenCalledWith({
        idx: 321,
        data: {
          redirect: { page: { slug: 'users/target' } },
        },
      });
    });
  });

  // Пакет 7.1.D: перезапись content — единственная операция без
  // recovery_token, поэтому update_page обязан заметить и сообщить о потере
  // структурной разметки (таблиц YFM, блоков), а не молча записать.
  describe('предупреждение о потере структурной разметки (пакет 7.1.D)', () => {
    it('должен предупредить, если таблица #| ... |# исчезает из нового содержимого', async () => {
      vi.mocked(mockFacade.getPageById!).mockResolvedValue(
        createPageFixture({
          content: 'Текст до\n#|\n|| a | b ||\n|#\nТекст после',
        })
      );
      vi.mocked(mockFacade.updatePage!).mockResolvedValue(createPageFixture());

      const result = await tool.execute({
        idx: 111,
        content: 'Текст до\nТекст после',
      });

      expect(result.isError).toBeFalsy();
      const payload = result['structuredContent'] as { data: { warnings?: string[] } };
      expect(payload.data.warnings).toBeDefined();
      expect(payload.data.warnings?.length).toBeGreaterThan(0);
      expect(payload.data.warnings?.[0]).toContain('yw_diff_page');
    });

    it('НЕ должен предупреждать, если правка не затрагивает разметку', async () => {
      vi.mocked(mockFacade.getPageById!).mockResolvedValue(
        createPageFixture({
          content: 'Текст до\n#|\n|| a | b ||\n|#\nТекст после',
        })
      );
      vi.mocked(mockFacade.updatePage!).mockResolvedValue(createPageFixture());

      const result = await tool.execute({
        idx: 112,
        content: 'Изменённый текст до\n#|\n|| a | b ||\n|#\nТекст после',
      });

      expect(result.isError).toBeFalsy();
      const payload = result['structuredContent'] as { data: { warnings?: string[] } };
      expect(payload.data.warnings).toBeUndefined();
    });

    it('НЕ должен запрашивать текущее содержимое, если content не меняется', async () => {
      vi.mocked(mockFacade.updatePage!).mockResolvedValue(createPageFixture());

      await tool.execute({ idx: 113, title: 'Только заголовок' });

      expect(mockFacade.getPageById).not.toHaveBeenCalled();
    });
  });
});
