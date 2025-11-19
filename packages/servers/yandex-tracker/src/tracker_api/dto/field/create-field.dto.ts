/**
 * DTO для создания кастомного поля в Яндекс.Трекере
 *
 * API: POST /v2/fields
 *
 * ВАЖНО:
 * - Создаются только кастомные поля (системные поля нельзя создавать)
 * - После создания нельзя изменить тип поля (schema.type)
 * - Поле доступно во всей организации
 */

import type { FieldSchema, FieldOption, FieldOptionsProvider } from '@tracker_api/entities/index.js';

export interface CreateFieldDto {
  /**
   * Название поля
   * @example "Customer Priority", "Sprint Name"
   */
  name: string;

  /**
   * Описание поля
   * @example "Priority level defined by the customer"
   */
  description?: string | undefined;

  /**
   * Схема поля (тип данных)
   *
   * ВАЖНО: После создания тип поля нельзя изменить!
   *
   * Примеры типов:
   * - { type: "string" } - текстовое поле
   * - { type: "number" } - числовое поле
   * - { type: "date" } - дата
   * - { type: "array", items: "string" } - массив строк
   * - { type: "user" } - пользователь
   */
  schema: FieldSchema;

  /**
   * Является ли поле только для чтения
   * @default false
   */
  readonly?: boolean | undefined;

  /**
   * Опции выбора для полей с фиксированным набором значений
   *
   * Используется для полей типа "select", "multiselect" и т.д.
   */
  options?: readonly FieldOption[] | undefined;

  /**
   * Включить автоподстановку значений
   * @default false
   */
  suggest?: boolean | undefined;

  /**
   * Провайдер опций для динамических полей
   *
   * Определяет источник значений для поля с динамическим списком.
   * Например: UserProvider, QueueProvider
   */
  optionsProvider?: FieldOptionsProvider | undefined;

  /** Дополнительные поля */
  [key: string]: unknown;
}
