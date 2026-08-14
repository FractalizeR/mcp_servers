// tests/unit/tools/api/pages/diff-page.tool.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DiffPageTool } from '../../../../../src/tools/api/pages/diff/diff-page.tool.js';
import { DIFF_PAGE_TOOL_METADATA } from '../../../../../src/tools/api/pages/diff/diff-page.metadata.js';
import { createMockLogger, createMockFacade, createPageFixture } from '#helpers/index.js';
import type { YandexWikiFacade } from '../../../../../src/wiki_api/facade/yandex-wiki.facade.js';

describe('DiffPageTool (пакет 3.1.E)', () => {
  let tool: DiffPageTool;
  let mockFacade: Partial<YandexWikiFacade>;
  let mockLogger: ReturnType<typeof createMockLogger>;

  beforeEach(() => {
    mockFacade = createMockFacade();
    mockLogger = createMockLogger();
    tool = new DiffPageTool(mockFacade as YandexWikiFacade, mockLogger);
  });

  describe('metadata', () => {
    it('должен иметь корректные метаданные', () => {
      expect(DiffPageTool.METADATA).toBe(DIFF_PAGE_TOOL_METADATA);
      expect(DiffPageTool.METADATA.name).toBe('yw_diff_page');
    });
  });

  describe('getDefinition', () => {
    it('readOnlyHint: true — diff ничего не пишет', () => {
      const definition = tool.getDefinition();
      expect(definition.annotations?.readOnlyHint).toBe(true);
      expect(definition.annotations?.destructiveHint).toBe(false);
      expect(definition.outputSchema).toBeDefined();
    });
  });

  describe('execute', () => {
    it('есть изменения: сообщает добавленные/удалённые строки и не пишет', async () => {
      const page = createPageFixture({ content: 'line1\nline2\nline3' });
      vi.mocked(mockFacade.getPageById!).mockResolvedValue(page);

      const result = await tool.execute({
        idx: 12345,
        newContent: 'line1\nline2-changed\nline3\nline4',
      });

      expect(result.isError).toBeFalsy();
      const data = (result.structuredContent as { data: Record<string, unknown> }).data;
      expect(data['hasChanges']).toBe(true);

      const summary = data['summary'] as { linesAdded: number; linesRemoved: number };
      expect(summary.linesAdded).toBeGreaterThan(0);
      expect(summary.linesRemoved).toBeGreaterThan(0);

      // Diff — read-only: никакой write-метод facade не вызван
      expect(mockFacade.updatePage).not.toHaveBeenCalled();
      expect(mockFacade.createPage).not.toHaveBeenCalled();
      expect(mockFacade.deletePage).not.toHaveBeenCalled();
      expect(mockFacade.getPageById).toHaveBeenCalledWith({
        idx: 12345,
        fields: 'content,title,slug',
      });
    });

    it('нет изменений: hasChanges=false, все строки equal', async () => {
      const page = createPageFixture({ content: 'same\ncontent\nhere' });
      vi.mocked(mockFacade.getPageById!).mockResolvedValue(page);

      const result = await tool.execute({
        idx: 999,
        newContent: 'same\ncontent\nhere',
      });

      expect(result.isError).toBeFalsy();
      const data = (result.structuredContent as { data: Record<string, unknown> }).data;
      expect(data['hasChanges']).toBe(false);

      const summary = data['summary'] as { linesAdded: number; linesRemoved: number };
      expect(summary.linesAdded).toBe(0);
      expect(summary.linesRemoved).toBe(0);

      expect(mockFacade.updatePage).not.toHaveBeenCalled();
    });

    it('страница не найдена: возвращает ошибку, не пишет', async () => {
      vi.mocked(mockFacade.getPageById!).mockRejectedValue(new Error('404 Not Found'));

      const result = await tool.execute({
        idx: 404404,
        newContent: 'irrelevant',
      });

      expect(result.isError).toBe(true);
      expect(mockFacade.updatePage).not.toHaveBeenCalled();
    });

    it('должен вернуть ошибку при невалидных параметрах', async () => {
      const result = await tool.execute({
        idx: 1,
        // missing required newContent
      });

      expect(result.isError).toBe(true);
    });
  });
});
