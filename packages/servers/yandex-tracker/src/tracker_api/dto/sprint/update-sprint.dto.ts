/**
 * DTO для обновления спринта в Яндекс.Трекере
 */

import type { SprintStatus } from '@tracker_api/entities/index.js';

export interface UpdateSprintDto {
  /** ID спринта для обновления */
  sprintId: string;

  /** Новое название спринта */
  name?: string | undefined;

  /** Версия спринта (для оптимистичной блокировки) */
  version?: number | undefined;

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

  /** Архивировать спринт */
  archived?: boolean | undefined;

  /** Дополнительные поля */
  [key: string]: unknown;
}
