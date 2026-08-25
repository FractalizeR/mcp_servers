/**
 * DTO для обновления проекта в Яндекс.Трекере
 *
 * ВАЖНО: Все поля опциональны - обновляются только переданные.
 */

import type { ProjectStatus } from '#tracker_api/entities/index.js';

export interface UpdateProjectDto {
  /** Название проекта */
  name?: string | undefined;

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

  /**
   * Массив ключей очередей, связанных с проектом
   * @example ['QUEUE1', 'QUEUE2']
   */
  queues?: string | undefined;

  /**
   * Массив ID или login участников проекта
   * @example ['user1', 'user2']
   */
  teamUserIds?: string[] | undefined;

  /** Дополнительные поля */
  [key: string]: unknown;
}
