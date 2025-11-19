/**
 * Тип для ответа API при получении списка спринтов
 */

import type { Sprint } from '@tracker_api/entities/index.js';

/**
 * Output для списка спринтов
 * API возвращает массив спринтов
 */
export type SprintsListOutput = ReadonlyArray<Sprint>;
