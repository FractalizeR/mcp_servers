/**
 * Доменный тип: Поле задачи в Яндекс.Трекере
 *
 * Соответствует API v2:
 * - GET /v2/fields - список всех полей трекера
 * - GET /v2/fields/{fieldId} - получение поля по ID
 * - POST /v2/fields - создание кастомного поля
 * - PATCH /v2/fields/{fieldId} - обновление поля
 * - DELETE /v2/fields/{fieldId} - удаление поля
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
  readonly items?: string;

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
  readonly id?: string;

  /**
   * Ключ опции
   */
  readonly key?: string;

  /**
   * Отображаемое значение
   */
  readonly display?: string;

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
  readonly type?: string;

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
   * @example "https://api.tracker.yandex.net/v2/fields/summary"
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
   * Опции выбора для полей с фиксированным набором значений
   * Используется для полей типа "select", "multiselect" и т.д.
   */
  readonly options?: readonly FieldOption[];

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
