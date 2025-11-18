/**
 * Output DTO для результата управления доступом к очереди
 *
 * ВАЖНО: Используется как возвращаемый тип из ManageQueueAccessOperation.
 */

import type { QueuePermissionWithUnknownFields } from '@tracker_api/entities/index.js';

/**
 * Результат операции управления доступом к очереди
 */
export type QueuePermissionsOutput = ReadonlyArray<QueuePermissionWithUnknownFields>;
