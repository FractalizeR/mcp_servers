/**
 * Стратегии поиска tools
 *
 * Экспортирует все реализации стратегий поиска
 */

export type { ISearchStrategy } from './search-strategy.interface.js';
export { NameSearchStrategy } from './name-search.strategy.js';
export { DescriptionSearchStrategy } from './description-search.strategy.js';
export { CategorySearchStrategy } from './category-search.strategy.js';
export { FuzzySearchStrategy } from './fuzzy-search.strategy.js';
export { WeightedCombinedStrategy } from './weighted-combined.strategy.js';
