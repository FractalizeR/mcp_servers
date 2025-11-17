/**
 * Интерфейс стратегии поиска
 *
 * Strategy Pattern: позволяет добавлять новые алгоритмы поиска
 * без изменения основного кода
 *
 * Responsibilities:
 * - Определение контракта для стратегий поиска
 * - Унификация API различных алгоритмов
 */

import type { SearchResult, StaticToolIndex } from '../types.js';

/**
 * Интерфейс стратегии поиска
 *
 * Каждая стратегия реализует свой алгоритм поиска
 * и возвращает результаты с оценкой релевантности
 */
export interface ISearchStrategy {
  /**
   * Выполнить поиск
   *
   * @param query - поисковый запрос (текст)
   * @param tools - индексированные инструменты для поиска
   * @returns массив найденных tools с оценкой релевантности (score 0-1)
   */
  search(query: string, tools: StaticToolIndex[]): SearchResult[];
}
