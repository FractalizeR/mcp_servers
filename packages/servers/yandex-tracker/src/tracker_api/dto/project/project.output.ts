/**
 * Output DTO для одного проекта
 *
 * ВАЖНО: Используется как возвращаемый тип из Operations.
 */

import type { ProjectWithUnknownFields } from '@tracker_api/entities/index.js';

/**
 * Результат операции получения/создания/обновления проекта
 */
export type ProjectOutput = ProjectWithUnknownFields;
