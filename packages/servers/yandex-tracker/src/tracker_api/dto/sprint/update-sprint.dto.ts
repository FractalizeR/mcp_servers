/**
 * DTO для обновления спринта в Яндекс.Трекере
 *
 * `sprintId` и `version` сюда не входят: `sprintId` — отдельный параметр операции
 * (адресует URL, не тело), `version` — отдельный параметр query-строки
 * (`UpdateSprintOperation.execute`). Оба поля, окажись они здесь, ушли бы в тело
 * PATCH через индексную сигнатуру ниже — ровно тот дефект, который чинит этот DTO
 * (живая проба 2026-08-26: `PATCH /v3/sprints/{id}` отвечает `428` без версии в
 * query и `400 version: Incorrect data format`, когда версия попадает в тело).
 */

import type { SprintStatus } from '#tracker_api/entities/index.js';

export interface UpdateSprintDto {
  /** Новое название спринта */
  name?: string | undefined;

  /** Дата начала спринта (формат YYYY-MM-DD) */
  startDate?: string | undefined;

  /** Дата окончания спринта (формат YYYY-MM-DD) */
  endDate?: string | undefined;

  /** Статус спринта */
  status?: SprintStatus | undefined;

  /** Дополнительные поля */
  [key: string]: unknown;
}
