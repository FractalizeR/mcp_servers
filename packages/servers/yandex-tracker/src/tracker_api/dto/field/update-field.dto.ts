/**
 * DTO для обновления поля в Яндекс.Трекере
 *
 * API: PATCH /v2/fields/{fieldId}
 *
 * ВАЖНО:
 * - Все поля опциональны (частичное обновление)
 * - Тип поля (schema.type) нельзя изменить после создания
 * - Можно обновить только кастомные поля (системные поля защищены)
 */

import type { FieldOption, FieldOptionsProvider } from '@tracker_api/entities/index.js';

export interface UpdateFieldDto {
  /**
   * Название поля
   * @example "Updated Field Name"
   */
  name?: string | undefined;

  /**
   * Описание поля
   * @example "Updated field description"
   */
  description?: string | undefined;

  /**
   * Является ли поле только для чтения
   */
  readonly?: boolean | undefined;

  /**
   * Опции выбора для полей с фиксированным набором значений
   *
   * ВАЖНО: Замещает существующий список опций полностью
   */
  options?: readonly FieldOption[] | undefined;

  /**
   * Включить автоподстановку значений
   */
  suggest?: boolean | undefined;

  /**
   * Провайдер опций для динамических полей
   */
  optionsProvider?: FieldOptionsProvider | undefined;

  /** Дополнительные поля */
  [key: string]: unknown;
}
