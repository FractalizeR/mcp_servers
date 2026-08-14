/**
 * Тип для ответа API при получении списка спринтов
 */

import type { SprintWithUnknownFields } from '#tracker_api/entities/index.js';

/**
 * Output для списка спринтов
 * API возвращает массив спринтов
 */
export type SprintsListOutput = ReadonlyArray<SprintWithUnknownFields>;
