/**
 * DTO для обновления проекта в Яндекс.Трекере
 *
 * ВАЖНО: Все поля опциональны - обновляются только переданные.
 */

import type { ProjectStatus } from '@tracker_api/entities/index.js';

export interface UpdateProjectDto {
  /** Название проекта */
  name?: string;

  /** ID или login руководителя проекта */
  lead?: string;

  /** Статус проекта */
  status?: ProjectStatus;

  /** Описание проекта */
  description?: string;

  /** Дата начала проекта (формат: YYYY-MM-DD) */
  startDate?: string;

  /** Дата окончания проекта (формат: YYYY-MM-DD) */
  endDate?: string;

  /**
   * Массив ключей очередей, связанных с проектом
   * @example ['QUEUE1', 'QUEUE2']
   */
  queueIds?: string[];

  /**
   * Массив ID или login участников проекта
   * @example ['user1', 'user2']
   */
  teamUserIds?: string[];

  /** Дополнительные поля */
  [key: string]: unknown;
}
