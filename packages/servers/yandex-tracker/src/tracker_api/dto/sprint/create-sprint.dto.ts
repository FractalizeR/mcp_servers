/**
 * DTO для создания спринта в Яндекс.Трекере
 */

import type { SprintStatus } from '@tracker_api/entities/index.js';

export interface CreateSprintDto {
  /** Название спринта */
  name: string;

  /** ID доски, к которой относится спринт */
  board: string;

  /** Дата начала спринта (формат YYYY-MM-DD) */
  startDate?: string | undefined;

  /** Дата окончания спринта (формат YYYY-MM-DD) */
  endDate?: string | undefined;

  /** Дата и время начала спринта в формате ISO 8601 */
  startDateTime?: string | undefined;

  /** Дата и время окончания спринта в формате ISO 8601 */
  endDateTime?: string | undefined;

  /** Статус спринта */
  status?: SprintStatus | undefined;

  /** Дополнительные поля */
  [key: string]: unknown;
}
