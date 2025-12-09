// tests/unit/tools/helpers/ping.tool.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PingTool } from '#tools/helpers/ping/ping.tool.js';
import { PING_TOOL_METADATA } from '#tools/helpers/ping/ping.metadata.js';
import { createMockFacade, createMockLogger, createPageFixture } from '#helpers/index.js';
import type { YandexWikiFacade } from '#wiki_api/facade/index.js';

describe('PingTool', () => {
  let tool: PingTool;
  let mockFacade: Partial<YandexWikiFacade>;
  let mockLogger: ReturnType<typeof createMockLogger>;

  beforeEach(() => {
    mockFacade = createMockFacade();
    mockLogger = createMockLogger();
    tool = new PingTool(mockFacade as YandexWikiFacade, mockLogger);
  });

  describe('metadata', () => {
    it('должен иметь корректные метаданные', () => {
      expect(PingTool.METADATA).toBe(PING_TOOL_METADATA);
      expect(PingTool.METADATA.name).toBe('yw_ping');
      expect(PingTool.METADATA.description).toBeDefined();
      expect(PingTool.METADATA.tags).toContain('ping');
      expect(PingTool.METADATA.tags).toContain('health');
    });
  });

  describe('execute', () => {
    it('должен вернуть успешный ответ при доступном API', async () => {
      const mockPage = createPageFixture({ slug: 'homepage' });
      vi.mocked(mockFacade.getPage!).mockResolvedValue(mockPage);

      const result = await tool.execute({});

      expect(mockFacade.getPage).toHaveBeenCalledWith({ slug: 'homepage' });
      expect(result.isError).toBeFalsy();
    });

    it('должен вернуть успешный ответ при 404 ошибке (API отвечает)', async () => {
      const notFoundError = new Error('Page not found (404)');
      vi.mocked(mockFacade.getPage!).mockRejectedValue(notFoundError);

      const result = await tool.execute({});

      expect(mockFacade.getPage).toHaveBeenCalledWith({ slug: 'homepage' });
      expect(result.isError).toBeFalsy();
    });

    it('должен вернуть успешный ответ при ошибке "not found"', async () => {
      const notFoundError = new Error('Resource not found');
      vi.mocked(mockFacade.getPage!).mockRejectedValue(notFoundError);

      const result = await tool.execute({});

      expect(result.isError).toBeFalsy();
    });

    it('должен вернуть ошибку при сетевых проблемах', async () => {
      const networkError = new Error('Network error');
      vi.mocked(mockFacade.getPage!).mockRejectedValue(networkError);

      const result = await tool.execute({});

      expect(result.isError).toBe(true);
    });

    it('должен вернуть ошибку при недоступности API', async () => {
      const timeoutError = new Error('Request timeout');
      vi.mocked(mockFacade.getPage!).mockRejectedValue(timeoutError);

      const result = await tool.execute({});

      expect(result.isError).toBe(true);
      expect(mockFacade.getPage).toHaveBeenCalledWith({ slug: 'homepage' });
    });

    it('должен корректно обрабатывать различные варианты 404 сообщений', async () => {
      const error404 = new Error('404 Not Found');
      vi.mocked(mockFacade.getPage!).mockRejectedValue(error404);
      const result1 = await tool.execute({});
      expect(result1.isError).toBeFalsy();

      const errorPageNotFound = new Error('Page not found');
      vi.mocked(mockFacade.getPage!).mockRejectedValue(errorPageNotFound);
      const result2 = await tool.execute({});
      expect(result2.isError).toBeFalsy();

      const errorResourceNotFound = new Error('Resource not found');
      vi.mocked(mockFacade.getPage!).mockRejectedValue(errorResourceNotFound);
      const result3 = await tool.execute({});
      expect(result3.isError).toBeFalsy();
    });

    it('должен отличать настоящие ошибки от 404', async () => {
      const realErrors = [
        new Error('Connection refused'),
        new Error('Timeout'),
        new Error('Internal server error'),
        new Error('Unauthorized'),
      ];

      for (const error of realErrors) {
        vi.mocked(mockFacade.getPage!).mockRejectedValue(error);

        const result = await tool.execute({});

        expect(result.isError).toBe(true);
      }
    });
  });
});
