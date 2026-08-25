/**
 * DTO для создания проекта в Яндекс.Трекере
 *
 * `POST /v3/projects` не принимает `key` (назначается сервером) и `teamUserIds`;
 * вместо массива `queueIds` — ключ одной очереди строкой, `queues` (D8,
 * `0_CONTRACTS.md`).
 */

import type { ProjectStatus } from '#tracker_api/entities/index.js';

export interface CreateProjectDto {
  /** Название проекта */
  name: string;

  /** Ключ очереди, в портфель которой добавляется проект */
  queues: string;

  /** ID или login руководителя проекта */
  lead?: string | undefined;

  /** Статус проекта */
  status?: ProjectStatus | undefined;

  /** Описание проекта */
  description?: string | undefined;

  /** Дата начала проекта (формат: YYYY-MM-DD) */
  startDate?: string | undefined;

  /** Дата окончания проекта (формат: YYYY-MM-DD) */
  endDate?: string | undefined;

  /** Дополнительные поля */
  [key: string]: unknown;
}
