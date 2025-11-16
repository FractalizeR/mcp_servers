/**
 * Unit тесты для SearchToolsTool
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SearchToolsTool } from '@mcp/tools/helpers/search/search-tools.tool.js';
import type { ToolSearchEngine } from '@mcp/search/tool-search-engine.js';
import type { Logger } from '@infrastructure/logging/logger.js';
import type { SearchResponse } from '@mcp/search/types.js';
import { ToolCategory } from '@mcp/tools/base/tool-metadata.js';

describe('SearchToolsTool', () => {
  let tool: SearchToolsTool;
  let mockSearchEngine: ToolSearchEngine;
  let mockLogger: Logger;

  beforeEach(() => {
    mockSearchEngine = {
      search: vi.fn(),
    } as unknown as ToolSearchEngine;

    mockLogger = {
      info: vi.fn(),
      debug: vi.fn(),
      error: vi.fn(),
    } as unknown as Logger;

    tool = new SearchToolsTool(mockSearchEngine, mockLogger);
  });

  describe('getDefinition', () => {
    it('должен вернуть корректное определение инструмента', () => {
      const definition = tool.getDefinition();

      expect(definition.name).toBe('fractalizer_mcp_yandex_tracker_search_tools');
      expect(definition.description).toContain('Поиск доступных MCP инструментов');
      expect(definition.inputSchema.type).toBe('object');
      expect(definition.inputSchema.required).toEqual(['query']);
      expect(definition.inputSchema.properties?.['query']).toBeDefined();
      expect(definition.inputSchema.properties?.['limit']).toBeDefined();
      expect(definition.inputSchema.properties?.['detailLevel']).toBeDefined();
    });
  });

  describe('getMetadata', () => {
    it('должен вернуть корректные метаданные', () => {
      const metadata = tool.getMetadata();

      expect(metadata.category).toBe(ToolCategory.SEARCH);
      expect(metadata.isHelper).toBe(true);
      expect(metadata.tags).toContain('search');
      expect(metadata.tags).toContain('tools');
      expect(metadata.tags).toContain('discovery');
      expect(metadata.examples).toBeDefined();
      expect(metadata.examples?.length).toBeGreaterThan(0);
    });
  });

  describe('execute', () => {
    describe('Валидация параметров (Zod)', () => {
      it('должен вернуть ошибку если query не указан', async () => {
        const result = await tool.execute({});

        expect(result.isError).toBe(true);
        const parsed = JSON.parse(result.content[0]?.text || '{}') as {
          success: boolean;
          message: string;
        };
        expect(parsed.success).toBe(false);
        expect(parsed.message).toContain('валидации');
      });

      it('должен вернуть ошибку если query пустая строка', async () => {
        const result = await tool.execute({ query: '' });

        expect(result.isError).toBe(true);
        const parsed = JSON.parse(result.content[0]?.text || '{}') as {
          success: boolean;
          message: string;
        };
        expect(parsed.success).toBe(false);
        expect(parsed.message).toContain('валидации');
      });

      it('должен вернуть ошибку если query только пробелы', async () => {
        const result = await tool.execute({ query: '   ' });

        expect(result.isError).toBe(true);
        const parsed = JSON.parse(result.content[0]?.text || '{}') as {
          success: boolean;
          message: string;
        };
        expect(parsed.success).toBe(false);
        expect(parsed.message).toContain('валидации');
      });

      it('должен вернуть ошибку для отрицательного limit', async () => {
        const result = await tool.execute({ query: 'test', limit: -1 });

        expect(result.isError).toBe(true);
        const parsed = JSON.parse(result.content[0]?.text || '{}') as {
          success: boolean;
          message: string;
        };
        expect(parsed.success).toBe(false);
        expect(parsed.message).toContain('валидации');
      });

      it('должен вернуть ошибку для нулевого limit', async () => {
        const result = await tool.execute({ query: 'test', limit: 0 });

        expect(result.isError).toBe(true);
        const parsed = JSON.parse(result.content[0]?.text || '{}') as {
          success: boolean;
          message: string;
        };
        expect(parsed.success).toBe(false);
        expect(parsed.message).toContain('валидации');
      });

      it('должен вернуть ошибку для не целого limit', async () => {
        const result = await tool.execute({ query: 'test', limit: 5.5 });

        expect(result.isError).toBe(true);
        const parsed = JSON.parse(result.content[0]?.text || '{}') as {
          success: boolean;
          message: string;
        };
        expect(parsed.success).toBe(false);
        expect(parsed.message).toContain('валидации');
      });

      it('должен принять корректный limit', async () => {
        const mockResponse: SearchResponse = {
          tools: [
            {
              name: 'fractalizer_mcp_yandex_tracker_get_issues',
              description: 'Get issues',
              category: ToolCategory.ISSUES,
              score: 0.95,
            },
          ],
          totalFound: 1,
        };
        vi.mocked(mockSearchEngine.search).mockReturnValue(mockResponse);

        const result = await tool.execute({ query: 'get issues', limit: 5 });

        expect(result.isError).toBe(false);
        expect(mockSearchEngine.search).toHaveBeenCalledWith(
          expect.objectContaining({
            query: 'get issues',
            limit: 5,
          })
        );
      });
    });

    describe('Функциональность поиска', () => {
      it('должен вызвать SearchEngine.search с корректными параметрами', async () => {
        const mockResponse: SearchResponse = {
          tools: [],
          totalFound: 0,
        };
        vi.mocked(mockSearchEngine.search).mockReturnValue(mockResponse);

        await tool.execute({ query: 'test query' });

        expect(mockSearchEngine.search).toHaveBeenCalledWith(
          expect.objectContaining({
            query: 'test query',
            detailLevel: 'name_and_description', // default
            limit: 10, // default
          })
        );
      });

      it('должен вернуть отсортированные результаты', async () => {
        const mockResponse: SearchResponse = {
          tools: [
            {
              name: 'fractalizer_mcp_yandex_tracker_get_issues',
              description: 'Get issues',
              category: ToolCategory.ISSUES,
              score: 0.95,
            },
            {
              name: 'fractalizer_mcp_yandex_tracker_find_issues',
              description: 'Find issues',
              category: ToolCategory.ISSUES,
              score: 0.85,
            },
          ],
          totalFound: 2,
        };
        vi.mocked(mockSearchEngine.search).mockReturnValue(mockResponse);

        const result = await tool.execute({ query: 'issues' });

        expect(result.isError).toBe(false);
        const parsed = JSON.parse(result.content[0]?.text || '{}') as {
          success: boolean;
          data: {
            totalFound: number;
            returned: number;
            tools: Array<{
              name: string;
              description: string;
              category: string;
              score: number;
            }>;
          };
        };
        expect(parsed.success).toBe(true);
        expect(parsed.data.totalFound).toBe(2);
        expect(parsed.data.returned).toBe(2);
        expect(parsed.data.tools).toHaveLength(2);
        expect(parsed.data.tools[0]?.name).toBe('fractalizer_mcp_yandex_tracker_get_issues');
        expect(parsed.data.tools[1]?.name).toBe('fractalizer_mcp_yandex_tracker_find_issues');
      });

      it('должен включить метаданные инструментов в результаты', async () => {
        const mockResponse: SearchResponse = {
          tools: [
            {
              name: 'fractalizer_mcp_yandex_tracker_get_issues',
              description: 'Get issues by keys',
              category: ToolCategory.ISSUES,
              score: 0.95,
            },
          ],
          totalFound: 1,
        };
        vi.mocked(mockSearchEngine.search).mockReturnValue(mockResponse);

        const result = await tool.execute({ query: 'get issues' });

        expect(result.isError).toBe(false);
        const parsed = JSON.parse(result.content[0]?.text || '{}') as {
          success: boolean;
          data: {
            tools: Array<{
              name: string;
              description: string;
              category: string;
              score: number;
            }>;
          };
        };
        expect(parsed.data.tools[0]?.name).toBe('fractalizer_mcp_yandex_tracker_get_issues');
        expect(parsed.data.tools[0]?.description).toBe('Get issues by keys');
        expect(parsed.data.tools[0]?.category).toBe('issues');
        expect(parsed.data.tools[0]?.score).toBe(0.95);
      });

      it('должен обрабатывать пустой запрос корректно', async () => {
        // Пустой запрос уже отклоняется валидацией, но если бы прошёл
        const mockResponse: SearchResponse = {
          tools: [],
          totalFound: 0,
        };
        vi.mocked(mockSearchEngine.search).mockReturnValue(mockResponse);

        const result = await tool.execute({ query: 't' }); // минимально валидный

        expect(result.isError).toBe(false);
        const parsed = JSON.parse(result.content[0]?.text || '{}') as {
          success: boolean;
          data: { totalFound: number; returned: number };
        };
        expect(parsed.success).toBe(true);
        expect(parsed.data.totalFound).toBe(0);
        expect(parsed.data.returned).toBe(0);
      });

      it('должен обрабатывать случай когда ничего не найдено', async () => {
        const mockResponse: SearchResponse = {
          tools: [],
          totalFound: 0,
        };
        vi.mocked(mockSearchEngine.search).mockReturnValue(mockResponse);

        const result = await tool.execute({ query: 'nonexistent-tool' });

        expect(result.isError).toBe(false);
        const parsed = JSON.parse(result.content[0]?.text || '{}') as {
          success: boolean;
          data: {
            query: string;
            totalFound: number;
            returned: number;
            tools: unknown[];
          };
        };
        expect(parsed.success).toBe(true);
        expect(parsed.data.query).toBe('nonexistent-tool');
        expect(parsed.data.totalFound).toBe(0);
        expect(parsed.data.returned).toBe(0);
        expect(parsed.data.tools).toEqual([]);
      });

      it('должен передать category фильтр в SearchEngine', async () => {
        const mockResponse: SearchResponse = {
          tools: [],
          totalFound: 0,
        };
        vi.mocked(mockSearchEngine.search).mockReturnValue(mockResponse);

        const result = await tool.execute({ query: 'test', category: ToolCategory.ISSUES });

        expect(result.isError).toBe(false);
        expect(mockSearchEngine.search).toHaveBeenCalledWith(
          expect.objectContaining({
            query: 'test',
            category: ToolCategory.ISSUES,
          })
        );
      });

      it('должен передать isHelper фильтр в SearchEngine', async () => {
        const mockResponse: SearchResponse = {
          tools: [],
          totalFound: 0,
        };
        vi.mocked(mockSearchEngine.search).mockReturnValue(mockResponse);

        await tool.execute({ query: 'test', isHelper: true });

        expect(mockSearchEngine.search).toHaveBeenCalledWith(
          expect.objectContaining({
            query: 'test',
            isHelper: true,
          })
        );
      });

      it('должен передать detailLevel в SearchEngine', async () => {
        const mockResponse: SearchResponse = {
          tools: [],
          totalFound: 0,
        };
        vi.mocked(mockSearchEngine.search).mockReturnValue(mockResponse);

        await tool.execute({ query: 'test', detailLevel: 'full' });

        expect(mockSearchEngine.search).toHaveBeenCalledWith(
          expect.objectContaining({
            query: 'test',
            detailLevel: 'full',
          })
        );
      });

      it('должен использовать defaults если параметры не указаны', async () => {
        const mockResponse: SearchResponse = {
          tools: [],
          totalFound: 0,
        };
        vi.mocked(mockSearchEngine.search).mockReturnValue(mockResponse);

        await tool.execute({ query: 'test' });

        expect(mockSearchEngine.search).toHaveBeenCalledWith(
          expect.objectContaining({
            query: 'test',
            detailLevel: 'name_and_description',
            limit: 10,
          })
        );
        expect(mockSearchEngine.search).toHaveBeenCalledWith(
          expect.not.objectContaining({
            category: expect.anything(),
            isHelper: expect.anything(),
          })
        );
      });
    });

    describe('Логирование', () => {
      it('должен логировать начало операции поиска', async () => {
        const mockResponse: SearchResponse = {
          tools: [],
          totalFound: 0,
        };
        vi.mocked(mockSearchEngine.search).mockReturnValue(mockResponse);

        await tool.execute({ query: 'test query', limit: 5 });

        expect(mockLogger.info).toHaveBeenCalledWith(
          'Поиск MCP инструментов',
          expect.objectContaining({
            query: 'test query',
            limit: 5,
          })
        );
      });

      it('должен логировать результаты поиска', async () => {
        const mockResponse: SearchResponse = {
          tools: [
            {
              name: 'tool1',
              description: 'desc1',
              category: ToolCategory.ISSUES,
              score: 0.9,
            },
            {
              name: 'tool2',
              description: 'desc2',
              category: ToolCategory.SEARCH,
              score: 0.8,
            },
          ],
          totalFound: 5,
        };
        vi.mocked(mockSearchEngine.search).mockReturnValue(mockResponse);

        await tool.execute({ query: 'test' });

        expect(mockLogger.info).toHaveBeenCalledWith(
          'Поиск завершён',
          expect.objectContaining({
            totalFound: 5,
            returned: 2,
            query: 'test',
          })
        );
      });
    });

    describe('Обработка ошибок', () => {
      it('должен обработать ошибку SearchEngine', async () => {
        const searchError = new Error('Search engine failed');
        vi.mocked(mockSearchEngine.search).mockImplementation(() => {
          throw searchError;
        });

        const result = await tool.execute({ query: 'test' });

        expect(result.isError).toBe(true);
        const parsed = JSON.parse(result.content[0]?.text || '{}') as {
          success: boolean;
          message: string;
          error: string;
        };
        expect(parsed.success).toBe(false);
        expect(parsed.message).toContain('Ошибка при поиске инструментов');
        expect(parsed.message).toContain('test');
        expect(parsed.error).toBe('Search engine failed');
      });

      it('должен логировать ошибки', async () => {
        const searchError = new Error('Search engine crashed');
        vi.mocked(mockSearchEngine.search).mockImplementation(() => {
          throw searchError;
        });

        await tool.execute({ query: 'test' });

        expect(mockLogger.error).toHaveBeenCalledWith(
          expect.stringContaining('Ошибка при поиске инструментов'),
          searchError
        );
      });

      it('должен обработать неизвестную ошибку', async () => {
        vi.mocked(mockSearchEngine.search).mockImplementation(() => {
          throw 'string error'; // eslint-disable-line @typescript-eslint/only-throw-error
        });

        const result = await tool.execute({ query: 'test' });

        expect(result.isError).toBe(true);
        const parsed = JSON.parse(result.content[0]?.text || '{}') as {
          success: boolean;
        };
        expect(parsed.success).toBe(false);
      });
    });
  });
});
