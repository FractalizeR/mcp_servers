/**
 * Главный класс поисковой системы tools
 *
 * Responsibilities:
 * - Выполнение поиска через стратегии
 * - Фильтрация по категориям и типам
 * - Кеширование результатов
 * - Форматирование результатов по уровню детализации
 * - Lazy loading полных метаданных
 */

import type { ISearchStrategy } from '../strategies/search-strategy.interface.js';
import type {
  SearchParams,
  SearchResponse,
  SearchResult,
  StaticToolIndex,
  DetailLevel,
  ToolSearchResultItem,
} from '../types.js';
import type { ToolRegistry } from '@mcp-framework/core';
import { DEFAULT_TOOL_SEARCH_LIMIT, DEFAULT_TOOL_SEARCH_DETAIL_LEVEL } from '../constants.js';

/**
 * Поисковый движок для tools
 */
export class ToolSearchEngine {
  private searchStrategy: ISearchStrategy;
  private cache: Map<string, SearchResponse>;
  private lazyIndex: StaticToolIndex[] | null = null;

  /**
   * Максимальный размер кеша (LRU)
   */
  private readonly MAX_CACHE_SIZE = 100;

  constructor(
    private readonly staticIndex: readonly StaticToolIndex[] | null,
    private readonly toolRegistry: ToolRegistry,
    searchStrategy: ISearchStrategy
  ) {
    this.searchStrategy = searchStrategy;
    this.cache = new Map();
  }

  /**
   * Получить индекс (статический или динамический из ToolRegistry)
   */
  private getIndex(): StaticToolIndex[] {
    // Если есть статический индекс, используем его
    if (this.staticIndex) {
      return Array.from(this.staticIndex);
    }

    // Иначе генерируем динамический индекс из ToolRegistry (lazy)
    if (!this.lazyIndex) {
      this.lazyIndex = this.buildIndexFromRegistry();
    }

    return this.lazyIndex;
  }

  /**
   * Построить индекс из ToolRegistry
   */
  private buildIndexFromRegistry(): StaticToolIndex[] {
    const index: StaticToolIndex[] = [];
    const tools = this.toolRegistry.getAllTools();

    for (const tool of tools) {
      const metadata = tool.getMetadata();
      const definition = metadata.definition;

      if (!definition.name || !definition.description || !metadata.category) {
        continue;
      }

      index.push({
        name: definition.name,
        category: metadata.category,
        tags: metadata.tags ? Array.from(metadata.tags) : [],
        isHelper: metadata.isHelper ?? false,
        nameTokens: this.tokenize(definition.name),
        descriptionTokens: this.tokenize(definition.description),
        descriptionShort: this.getShortDescription(definition.description),
      });
    }

    return index;
  }

  /**
   * Токенизация текста
   */
  private tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[_-]/g, ' ')
      .split(/\W+/)
      .filter((token) => token.length > 0);
  }

  /**
   * Получить краткое описание
   */
  private getShortDescription(description: string): string {
    const firstSentence = description.split(/[.!?]/)[0];
    return firstSentence ? firstSentence.trim() : description;
  }

  /**
   * Выполнить поиск с кешированием
   */
  search(params: SearchParams): SearchResponse {
    // Генерируем ключ кеша
    const cacheKey = this.getCacheKey(params);

    // Проверяем кеш
    const cached = this.cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    // Выполняем поиск
    const results = this.performSearch(params);

    // Кешируем результат
    this.cache.set(cacheKey, results);

    // Ограничиваем размер кеша (простая LRU стратегия)
    if (this.cache.size > this.MAX_CACHE_SIZE) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }

    return results;
  }

  /**
   * Выполнить поиск без кеширования
   */
  private performSearch(params: SearchParams): SearchResponse {
    // Фильтруем индекс (статический или динамический)
    const filtered = this.filterIndex(params);

    // Выполняем поиск по стратегиям
    const searchResults = this.searchStrategy.search(params.query, filtered);

    // Применяем лимит
    const totalFound = searchResults.length;
    const limited = searchResults.slice(0, params.limit || DEFAULT_TOOL_SEARCH_LIMIT);

    // Форматируем результаты
    const tools = this.formatResults(
      limited,
      params.detailLevel || DEFAULT_TOOL_SEARCH_DETAIL_LEVEL
    );

    return {
      tools,
      totalFound,
    };
  }

  /**
   * Фильтровать индекс по параметрам
   */
  private filterIndex(params: SearchParams): StaticToolIndex[] {
    let filtered = this.getIndex();

    // Фильтр по категории
    if (params.category) {
      filtered = filtered.filter((t) => t.category === params.category);
    }

    // Фильтр по типу (helper/api)
    if (params.isHelper !== undefined) {
      filtered = filtered.filter((t) => t.isHelper === params.isHelper);
    }

    return filtered;
  }

  /**
   * Форматировать результаты по уровню детализации
   */
  private formatResults(results: SearchResult[], detailLevel: DetailLevel): ToolSearchResultItem[] {
    const index = this.getIndex();

    return results.map((r) => {
      const staticData = index.find((t) => t.name === r.toolName);

      if (!staticData) {
        // Не должно произойти, но на всякий случай
        return { name: r.toolName };
      }

      switch (detailLevel) {
        case 'name_only':
          return {
            name: staticData.name,
          };

        case 'name_and_description':
          return {
            name: staticData.name,
            description: staticData.descriptionShort,
            category: staticData.category,
            score: Math.round(r.score * 100) / 100, // 2 decimal places
          };

        case 'full': {
          // Lazy load полных метаданных из ToolRegistry
          const tool = this.toolRegistry.getTool(staticData.name);
          const fullMetadata = tool?.getMetadata();

          return {
            name: staticData.name,
            description: fullMetadata?.definition.description || staticData.descriptionShort,
            category: staticData.category,
            tags: staticData.tags,
            inputSchema: fullMetadata?.definition.inputSchema,
            examples: fullMetadata?.examples,
            score: Math.round(r.score * 100) / 100,
            matchDetails: r.matchDetails,
          };
        }
      }
    });
  }

  /**
   * Генерировать ключ кеша из параметров поиска
   */
  private getCacheKey(params: SearchParams): string {
    return JSON.stringify({
      q: params.query.toLowerCase().trim(),
      c: params.category,
      h: params.isHelper,
      l: params.limit,
      d: params.detailLevel || 'name_and_description',
    });
  }

  /**
   * Очистить кеш
   *
   * Полезно для тестов и при обновлении индекса
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Получить статистику кеша
   */
  getCacheStats(): { size: number; maxSize: number } {
    return {
      size: this.cache.size,
      maxSize: this.MAX_CACHE_SIZE,
    };
  }
}
