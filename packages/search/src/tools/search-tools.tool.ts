/**
 * MCP Helper Tool для поиска других инструментов
 *
 * Helper Tool (не требует API):
 * - Поиск tools по запросу
 * - Фильтрация по категориям и типам
 * - Lazy loading метаданных
 *
 * Ответственность (SRP):
 * - Координация поиска через ToolSearchEngine
 * - Валидация параметров через Zod
 * - Форматирование результатов
 * - Логирование операций
 */

import type { Logger, ToolCallParams, ToolResult } from '@mcp-framework/infrastructure';
import type { ToolDefinition } from '@mcp-framework/core';
import type { ToolMetadata, StaticToolMetadata } from '@mcp-framework/core';
import { ToolCategory } from '@mcp-framework/core';
import type { ToolSearchEngine } from '../engine/tool-search-engine.js';
import { SearchToolsDefinition } from './search-tools.definition.js';
import { SearchToolsParamsSchema } from './search-tools.schema.js';

import { buildToolName } from '@mcp-framework/core';
import { DEFAULT_TOOL_SEARCH_LIMIT, DEFAULT_TOOL_SEARCH_DETAIL_LEVEL } from '../constants.js';

/**
 * Инструмент для поиска других MCP tools
 *
 * Отличия от BaseTool:
 * - НЕ наследует BaseTool (не требует YandexTrackerFacade)
 * - Использует ToolSearchEngine вместо trackerFacade
 * - Следует тем же паттернам: METADATA, validateParams, formatSuccess/Error
 */
export class SearchToolsTool {
  /**
   * Статические метаданные для compile-time индексации
   */
  static readonly METADATA: StaticToolMetadata = {
    name: buildToolName('search_tools'),
    description:
      'Поиск доступных MCP инструментов по запросу. ' +
      'Поддерживает поиск по названию, описанию, категориям и тегам. ' +
      'Используйте для обнаружения нужных инструментов перед их вызовом.',
    category: ToolCategory.SEARCH,
    tags: ['search', 'tools', 'discovery', 'find', 'helper'],
    isHelper: true,
    examples: [
      'query: "issue" - найти все инструменты для работы с задачами',
      'query: "ping" - найти инструмент проверки подключения',
      'query: "url", category: "url-generation" - найти инструменты генерации URL',
      'query: "задачи", isHelper: false - найти только API операции с задачами',
    ],
  } as const;

  private readonly definition = new SearchToolsDefinition();

  constructor(
    private readonly searchEngine: ToolSearchEngine,
    private readonly logger: Logger
  ) {}

  /**
   * Получить определение инструмента
   */
  getDefinition(): ToolDefinition {
    return this.definition.build();
  }

  /**
   * Получить метаданные (runtime)
   */
  getMetadata(): ToolMetadata {
    return {
      definition: this.getDefinition(),
      category: SearchToolsTool.METADATA.category,
      tags: SearchToolsTool.METADATA.tags,
      isHelper: SearchToolsTool.METADATA.isHelper,
      ...(SearchToolsTool.METADATA.examples && { examples: SearchToolsTool.METADATA.examples }),
    };
  }

  /**
   * Выполнить поиск tools
   */
  async execute(params: ToolCallParams): Promise<ToolResult> {
    // 1. Валидация параметров
    const validationResult = SearchToolsParamsSchema.safeParse(params);

    if (!validationResult.success) {
      const errorMessage = validationResult.error.issues
        .map((e: { message: string }) => e.message)
        .join('; ');
      return this.formatError('Ошибка валидации параметров поиска', new Error(errorMessage));
    }

    const { query, detailLevel, category, isHelper, limit } = validationResult.data;

    try {
      // 2. Логирование начала операции
      this.logger.info('Поиск MCP инструментов', {
        query,
        detailLevel: detailLevel ?? DEFAULT_TOOL_SEARCH_DETAIL_LEVEL,
        category,
        isHelper,
        limit: limit ?? DEFAULT_TOOL_SEARCH_LIMIT,
      });

      // 3. Выполнение поиска через ToolSearchEngine (wrapped in Promise для async)
      const searchResponse = await Promise.resolve(
        this.searchEngine.search({
          query,
          detailLevel: detailLevel ?? DEFAULT_TOOL_SEARCH_DETAIL_LEVEL,
          ...(category !== undefined && { category }),
          ...(isHelper !== undefined && { isHelper }),
          limit: limit ?? DEFAULT_TOOL_SEARCH_LIMIT,
        })
      );

      // 4. Логирование результатов
      this.logger.info('Поиск завершён', {
        totalFound: searchResponse.totalFound,
        returned: searchResponse.tools.length,
        query,
      });

      // 5. Форматирование успешного ответа
      return this.formatSuccess({
        query,
        totalFound: searchResponse.totalFound,
        returned: searchResponse.tools.length,
        tools: searchResponse.tools,
      });
    } catch (error: unknown) {
      return this.formatError(
        `Ошибка при поиске инструментов по запросу "${query}"`,
        error as Error
      );
    }
  }

  /**
   * Форматирование успешного результата
   */
  private formatSuccess(data: unknown): ToolResult {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              success: true,
              data,
            },
            null,
            2
          ),
        },
      ],
      isError: false,
    };
  }

  /**
   * Форматирование ошибки
   */
  private formatError(message: string, error?: Error): ToolResult {
    this.logger.error(message, error);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              success: false,
              message,
              error: error?.message,
            },
            null,
            2
          ),
        },
      ],
      isError: true,
    };
  }
}
