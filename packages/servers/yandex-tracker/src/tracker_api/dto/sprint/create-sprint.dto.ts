/**
 * DTO для создания спринта в Яндекс.Трекере
 */

import type { SprintStatus } from '#tracker_api/entities/index.js';

export interface CreateSprintDto {
  /** Название спринта */
  name: string;

  /** ID доски, к которой относится спринт */
  board: string;

  /** Дата начала спринта (формат YYYY-MM-DD) */
  startDate?: string | undefined;

  /** Дата окончания спринта (формат YYYY-MM-DD) */
  endDate?: string | undefined;

  /** Статус спринта */
  status?: SprintStatus | undefined;

  /** Дополнительные поля */
  [key: string]: unknown;
}
