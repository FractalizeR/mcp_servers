/**
 * Тип для ответа API при получении списка досок
 */

import type { BoardWithUnknownFields } from '#tracker_api/entities/index.js';

/**
 * Output для списка досок
 * API возвращает массив досок
 */
export type BoardsListOutput = ReadonlyArray<BoardWithUnknownFields>;
