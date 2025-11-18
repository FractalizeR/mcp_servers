/**
 * Output DTO для одной очереди
 *
 * ВАЖНО: Используется как возвращаемый тип из Operations.
 */

import type { QueueWithUnknownFields } from '@tracker_api/entities/index.js';

/**
 * Результат операции получения/создания/обновления очереди
 */
export type QueueOutput = QueueWithUnknownFields;
