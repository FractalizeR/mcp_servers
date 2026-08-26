/**
 * Output DTO для результата управления доступом к очереди
 *
 * ВАЖНО: Используется как возвращаемый тип из ManageQueueAccessOperation.
 * Форма — объект, ключёванный разрешением (`{self, version, create?, write?, ...}`),
 * а НЕ массив прав — см. `#tracker_api/entities/queue-permission.entity.js`.
 */

import type { QueuePermissionsWithUnknownFields } from '#tracker_api/entities/index.js';

/**
 * Результат операции управления доступом к очереди
 */
export type QueuePermissionsOutput = QueuePermissionsWithUnknownFields;
