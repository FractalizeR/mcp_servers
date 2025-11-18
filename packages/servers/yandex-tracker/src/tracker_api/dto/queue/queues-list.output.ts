/**
 * Output DTO для списка очередей
 *
 * ВАЖНО: Используется как возвращаемый тип из GetQueuesOperation.
 */

import type { QueueWithUnknownFields } from '@tracker_api/entities/index.js';

/**
 * Результат операции получения списка очередей
 */
export type QueuesListOutput = ReadonlyArray<QueueWithUnknownFields>;
