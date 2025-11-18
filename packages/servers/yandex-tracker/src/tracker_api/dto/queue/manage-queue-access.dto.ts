/**
 * DTO для управления доступом к очереди в Яндекс.Трекере
 */

import type { QueueRole } from '@tracker_api/entities/index.js';

/**
 * Действие для управления доступом
 */
export type AccessAction = 'add' | 'remove';

/**
 * DTO для управления правами доступа к очереди
 */
export interface ManageQueueAccessDto {
  /** Роль в очереди */
  role: QueueRole;

  /** Массив ID пользователей или групп */
  subjects: string[];

  /** Действие: добавить или удалить */
  action: AccessAction;
}
