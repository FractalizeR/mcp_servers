// tests/unit/tools/api/pages/append-content.tool.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AppendContentTool } from '../../../../../src/tools/api/pages/append/append-content.tool.js';
import { APPEND_CONTENT_TOOL_METADATA } from '../../../../../src/tools/api/pages/append/append-content.metadata.js';
import { createMockLogger, createMockFacade, createPageFixture } from '#helpers/index.js';
import type { YandexWikiFacade } from '../../../../../src/wiki_api/facade/yandex-wiki.facade.js';

describe('AppendContentTool', () => {
  let tool: AppendContentTool;
  let mockFacade: Partial<YandexWikiFacade>;
  let mockLogger: ReturnType<typeof createMockLogger>;

  beforeEach(() => {
    mockFacade = createMockFacade();
    mockLogger = createMockLogger();
    tool = new AppendContentTool(mockFacade as YandexWikiFacade, mockLogger);
  });

  describe('metadata', () => {
    it('должен иметь корректные метаданные', () => {
      expect(AppendContentTool.METADATA).toBe(APPEND_CONTENT_TOOL_METADATA);
      expect(AppendContentTool.METADATA.name).toBe('yw_append_content');
    });
  });

  describe('execute', () => {
    it('должен добавить контент к странице с валидными параметрами', async () => {
      const expectedPage = createPageFixture();
      vi.mocked(mockFacade.appendContent!).mockResolvedValue(expectedPage);

      const result = await tool.execute({
        idx: 123,
        content: '## New Section',
      });

      expect(mockFacade.appendContent).toHaveBeenCalledWith({
        idx: 123,
        data: {
          content: '## New Section',
        },
      });
      expect(result.isError).toBeFalsy();
    });

    it('должен вернуть ошибку при невалидных параметрах', async () => {
      const result = await tool.execute({
        // missing required fields
        idx: 123,
      });

      expect(result.isError).toBe(true);
    });

    it('должен обработать ошибку от facade', async () => {
      vi.mocked(mockFacade.appendContent!).mockRejectedValue(new Error('API Error'));

      const result = await tool.execute({
        idx: 456,
        content: 'Test',
      });

      expect(result.isError).toBe(true);
    });

    // Дефект 7.1.B №6: раньше `if (section_id !== undefined && section_location)`
    // в tool.ts тихо не срабатывал при частичном заполнении пары —
    // таргетинг терялся без единой ошибки валидации. Перенесено в схему.
    it('должен отклонить section_id без section_location', async () => {
      const result = await tool.execute({
        idx: 123,
        content: 'Text',
        section_id: 5,
      });

      expect(result.isError).toBe(true);
    });

    it('должен отклонить section_location без section_id', async () => {
      const result = await tool.execute({
        idx: 123,
        content: 'Text',
        section_location: 'top',
      });

      expect(result.isError).toBe(true);
    });

    it('должен принять section_id и section_location вместе', async () => {
      const expectedPage = createPageFixture();
      vi.mocked(mockFacade.appendContent!).mockResolvedValue(expectedPage);

      const result = await tool.execute({
        idx: 123,
        content: 'Text',
        section_id: 5,
        section_location: 'top',
      });

      expect(mockFacade.appendContent).toHaveBeenCalledWith({
        idx: 123,
        data: {
          content: 'Text',
          section: { id: 5, location: 'top' },
        },
      });
      expect(result.isError).toBeFalsy();
    });
  });
});
