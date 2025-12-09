/**
 * Типы для системы поиска tools
 *
 * Responsibilities:
 * - Типы для статического индекса
 * - Типы для результатов поиска
 * - Типы для параметров поиска
 */

import type { ToolCategory } from '@fractalizer/mcp-core';

/**
 * Статический индекс tool для compile-time генерации
 *
 * Содержит pre-computed данные для быстрого поиска
 */
export interface StaticToolIndex {
  /** Имя инструмента */
  name: string;

  /** Категория */
  category: ToolCategory;

  /** Теги для поиска */
  tags: string[];

  /** Helper или API tool */
  isHelper: boolean;

  /** Pre-computed токены из имени */
  nameTokens: string[];

  /** Pre-computed токены из описания */
  descriptionTokens: string[];

  /** Краткое описание (без inputSchema) */
  descriptionShort: string;
}

/**
 * Результат поиска с оценкой релевантности
 */
export interface SearchResult {
  /** Имя найденного tool */
  toolName: string;

  /** Оценка релевантности (0-1) */
  score: number;

  /** Причина совпадения (для отладки) */
  matchReason?: string;

  /** Тип стратегии, которая нашла результат */
  strategyType?: StrategyType;

  /** Детали совпадения по стратегиям */
  matchDetails?: Partial<Record<StrategyType, number>>;
}

/**
 * Типы стратегий поиска
 */
export type StrategyType = 'name' | 'description' | 'category' | 'tags' | 'fuzzy';

/**
 * Уровень детализации результатов
 */
export type DetailLevel = 'name_only' | 'name_and_description' | 'full';

/**
 * Параметры поиска
 */
export interface SearchParams {
  /** Поисковый запрос */
  query: string;

  /** Уровень детализации результатов */
  detailLevel?: DetailLevel;

  /** Фильтр по категории */
  category?: ToolCategory;

  /** Фильтр по типу (helper/api) */
  isHelper?: boolean;

  /** Лимит результатов */
  limit?: number;
}

/**
 * Ответ поиска
 */
export interface SearchResponse {
  /** Найденные инструменты */
  tools: ToolSearchResultItem[];

  /** Общее количество найденных (до применения limit) */
  totalFound: number;
}

/**
 * Элемент результата поиска
 *
 * Структура зависит от DetailLevel
 */
export type ToolSearchResultItem =
  | ToolSearchResultNameOnly
  | ToolSearchResultWithDescription
  | ToolSearchResultFull;

/**
 * Результат: только имя
 */
export interface ToolSearchResultNameOnly {
  name: string;
}

/**
 * Результат: имя + описание
 */
export interface ToolSearchResultWithDescription {
  name: string;
  description: string;
  category: ToolCategory;
  score?: number;
}

/**
 * Результат: полные метаданные
 */
export interface ToolSearchResultFull {
  name: string;
  description: string;
  category: ToolCategory;
  tags: string[];
  inputSchema?: Record<string, unknown>;
  examples?: string[];
  score?: number;
  matchDetails?: Partial<Record<StrategyType, number>>;
}
