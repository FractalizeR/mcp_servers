/**
 * Тип для ответа API при получении доски
 */

import type { BoardWithUnknownFields } from '#tracker_api/entities/index.js';

/**
 * Output для единичной доски
 *
 * ВАЖНО: `WithUnknownFields` — как и остальные `*Output` типы в проекте
 * (см. `queue.output.ts`) — ответ API Трекера может содержать поля сверх
 * типизированного интерфейса `Board`.
 */
export type BoardOutput = BoardWithUnknownFields;
