/**
 * DTO для создания записи Entity API (Goal/Project/Portfolio)
 *
 * ПОДТВЕРЖДЕНО ЖИВОЙ ПРОБОЙ 2026-08-16: тело create — `{ fields: {...} }`, где
 * `fields` — объект кастомных полей записи. `summary` — обязательное поле
 * внутри `fields` (без него API отвечает 422 «summary: Требуется параметр»).
 * Поля `name`/`description` в Entity API НЕ существуют (422 «поля [name] не
 * существуют») — прежняя гипотеза о них была неверна и убрана.
 */

import type { EntityApiType } from '#tracker_api/entities/index.js';

export interface CreateEntityDto {
  /** Тип создаваемой записи Entity API */
  entityType: EntityApiType;

  /**
   * Кастомные поля записи, которые будут отправлены в `{ fields: {...} }`.
   * Для всех entityType обязательно поле `summary` (строка).
   */
  extraFields: Record<string, unknown>;
}
