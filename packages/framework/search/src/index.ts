/**
 * Модуль поиска tools
 *
 * Экспортирует:
 * - Типы для поиска
 * - Стратегии поиска
 * - Поисковый движок
 * - Веса стратегий
 */

// Типы
export type {
  StaticToolIndex,
  SearchResult,
  SearchParams,
  SearchResponse,
  ToolSearchResultItem,
  StrategyType,
  DetailLevel,
} from './types.js';

// Веса
export { STRATEGY_WEIGHTS } from './scoring/strategy-weights.js';

// Стратегии
export type { ISearchStrategy } from './strategies/index.js';
export {
  NameSearchStrategy,
  DescriptionSearchStrategy,
  CategorySearchStrategy,
  FuzzySearchStrategy,
  WeightedCombinedStrategy,
} from './strategies/index.js';

// Поисковый движок
export { ToolSearchEngine } from './engine/tool-search-engine.js';

// Tools (SearchToolsTool)
export * from './tools/search-tools.tool.js';
export * from './tools/search-tools.definition.js';
export * from './tools/search-tools.schema.js';

// Constants
export * from './constants.js';

// Generated index
export { TOOL_SEARCH_INDEX } from './generated-index.js';
