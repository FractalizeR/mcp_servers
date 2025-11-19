/**
 * Тип для ответа API при получении списка досок
 */

import type { Board } from '@tracker_api/entities/index.js';

/**
 * Output для списка досок
 * API возвращает массив досок
 */
export type BoardsListOutput = ReadonlyArray<Board>;
