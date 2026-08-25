/**
 * Доменный тип: Поле задачи в Яндекс.Трекере
 *
 * Соответствует API v3:
 * - GET /v3/fields - список всех полей трекера
 * - GET /v3/fields/{fieldId} - получение поля по ID
 * - POST /v3/fields - создание кастомного поля
 * - PATCH /v3/fields/{fieldId} - обновление поля
 * - DELETE /v3/fields/{fieldId} - удаление поля
 *
 * Поля (Fields) - это атрибуты задач в Яндекс.Трекере.
 * Существуют системные поля (summary, description, assignee и т.д.)
 * и кастомные поля, создаваемые пользователями.
 */

import type { WithUnknownFields } from './types.js';

/**
 * Схема поля (тип данных)
 *
 * Определяет тип данных, который может храниться в поле.
 */
export interface FieldSchema {
  /**
   * Тип схемы
   * @example "string", "array", "user", "date"
   */
  readonly type: string;

  /**
   * Элементы массива (для type: "array")
   * @example "string" - массив строк
   */
  readonly items?: string | undefined;

  /**
   * Дополнительные параметры схемы
   */
  [key: string]: unknown;
}

/**
 * Опция выбора для полей с фиксированным набором значений
 *
 * Используется для полей типа "select", "multiselect" и т.д.
 */
export interface FieldOption {
  /**
   * Идентификатор опции
   */
  readonly id?: string | undefined;

  /**
   * Ключ опции
   */
  readonly key?: string | undefined;

  /**
   * Отображаемое значение
   */
  readonly display?: string | undefined;

  /**
   * Дополнительные параметры опции
   */
  [key: string]: unknown;
}

/**
 * Провайдер опций для динамических полей
 *
 * Определяет источник значений для поля с динамическим списком опций.
 */
export interface FieldOptionsProvider {
  /**
   * Тип провайдера
   * @example "UserProvider", "QueueProvider"
   */
  readonly type?: string | undefined;

  /**
   * Дополнительные параметры провайдера
   */
  [key: string]: unknown;
}

/**
 * Поле задачи в Яндекс.Трекере
 *
 * ВАЖНО: Типизация основана на официальном Python SDK от Яндекс.
 * Обязательные поля (без ?) всегда присутствуют в ответе API.
 * Опциональные поля могут отсутствовать в зависимости от типа поля.
 */
export interface Field {
  /**
   * Идентификатор поля (всегда присутствует)
   * @example "1", "customField123"
   */
  readonly id: string;

  /**
   * URL поля в API (всегда присутствует)
   * @example "https://api.tracker.yandex.net/v3/fields/summary"
   */
  readonly self: string;

  /**
   * Название поля (всегда присутствует)
   * @example "Summary", "Assignee", "Custom Field"
   */
  readonly name: string;

  /**
   * Описание поля
   * @example "Brief description of the issue"
   */
  readonly description?: string;

  /**
   * Схема поля (тип данных)
   */
  readonly schema?: FieldSchema;

  /**
   * Является ли поле только для чтения
   * @default false
   */
  readonly readonly?: boolean;

  /**
   * Есть ли у поля список опций выбора (select/multiselect)
   *
   * Булев флаг, а не список опций: подтверждено боевым `GET` (§4.1 плана
   * миграции v3, `inventory/live-version-probe-2026-08-23.md`). Не путать с
   * входным `options` инструментов `create_global_field`/`update_global_field`
   * (`FieldOptionValueSchema[]`, тело запроса) — там `options` задаёт сами
   * значения выбора при создании/изменении поля; здесь — только факт их
   * наличия в ответе на чтение.
   */
  readonly options?: boolean;

  /**
   * Настройки автоподстановки значений
   */
  readonly suggest?: boolean;

  /**
   * Провайдер опций для динамических полей
   * Определяет источник значений для поля с динамическим списком
   */
  readonly optionsProvider?: FieldOptionsProvider;
}

/**
 * Поле с возможными unknown полями из API.
 * Используется при получении данных от API Трекера.
 */
export type FieldWithUnknownFields = WithUnknownFields<Field>;
