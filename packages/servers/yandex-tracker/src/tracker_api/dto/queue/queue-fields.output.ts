/**
 * Output DTO для списка полей очереди
 *
 * ВАЖНО: Используется как возвращаемый тип из GetQueueFieldsOperation.
 */

import type { QueueFieldWithUnknownFields } from '@tracker_api/entities/index.js';

/**
 * Результат операции получения полей очереди
 */
export type QueueFieldsOutput = ReadonlyArray<QueueFieldWithUnknownFields>;
