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
  });
});
