/**
 * DTO для создания глобального кастомного поля в Яндекс.Трекере
 *
 * API: POST /v3/fields
 *
 * ВАЖНО:
 * - Создаются только кастомные поля (системные поля нельзя создавать)
 * - После создания нельзя изменить тип поля (`type`)
 * - Поле доступно во всей организации
 */

import type { FieldOptionsProvider } from '#tracker_api/entities/index.js';

export interface CreateFieldDto {
  /**
   * Короткий идентификатор поля
   * @example "customPriority"
   */
  id: string;

  /**
   * Локализованное название поля
   * @example { en: "Customer Priority", ru: "Приоритет клиента" }
   */
  name: {
    en: string;
    ru: string;
  };

  /**
   * Идентификатор категории поля (см. GET /v3/fields/categories)
   */
  category: string;

  /**
   * Тип поля
   *
   * ВАЖНО: После создания тип поля нельзя изменить!
   *
   * @example "ru.yandex.startrek.core.fields.StringFieldType"
   */
  type: string;

  /**
   * Порядок отображения поля
   */
  order?: number | undefined;

  /**
   * Описание поля
   * @example "Priority level defined by the customer"
   */
  description?: string | undefined;

  /**
   * Является ли поле только для чтения
   * @default false
   */
  readonly?: boolean | undefined;

  /**
   * Видимость поля
   */
  visible?: boolean | undefined;

  /**
   * Скрыто ли поле
   */
  hidden?: boolean | undefined;

  /**
   * Является ли поле контейнером (массивом значений)
   */
  container?: boolean | undefined;

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
