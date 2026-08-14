/**
 * Доменный тип: Сохранённый фильтр в Яндекс.Трекере
 *
 * Соответствует API v3: /v3/filters/{id}
 */

import type { WithUnknownFields } from './types.js';

/**
 * Правило сортировки сохранённого фильтра
 */
export interface FilterSort {
  /** Поле сортировки */
  readonly field: string;

  /** Направление сортировки: true = по возрастанию */
  readonly isAscending: boolean;
}

/**
 * Сохранённый фильтр в Яндекс.Трекере
 *
 * ВАЖНО: Типизация основана на референсном клиенте (`collections.py:Filters`)
 * и официальной документации (`api-ref/filters/*`). Обязательные поля (без ?)
 * всегда присутствуют в ответе GET /v3/filters/{id}.
 */
export interface SavedFilter {
  /** Идентификатор фильтра (всегда присутствует) */
  readonly id: string;

  /** URL ссылка на фильтр в API (всегда присутствует) */
  readonly self: string;

  /** Название фильтра (всегда присутствует) */
  readonly name: string;

  /** Правила сортировки (может отсутствовать) */
  readonly sorts?: readonly FilterSort[];

  /** Условия фильтрации (взаимоисключимо с query, может отсутствовать) */
  readonly filter?: Record<string, unknown>;

  /** Условия фильтрации в виде query-строки (взаимоисключимо с filter) */
  readonly query?: string;

  /** Поле группировки (может отсутствовать) */
  readonly groupBy?: unknown;
}

/**
 * Сохранённый фильтр с возможными unknown полями из API.
 * Используется при получении данных от API Трекера.
 */
export type SavedFilterWithUnknownFields = WithUnknownFields<SavedFilter>;
