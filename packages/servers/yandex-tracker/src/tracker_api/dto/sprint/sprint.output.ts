/**
 * Тип для ответа API при получении спринта
 */

import type { SprintWithUnknownFields } from '#tracker_api/entities/index.js';

/**
 * Output для единичного спринта
 *
 * ВАЖНО: `WithUnknownFields` — как и остальные `*Output` типы в проекте
 * (см. `queue.output.ts`) — ответ API Трекера может содержать поля сверх
 * типизированного интерфейса `Sprint`.
 */
export type SprintOutput = SprintWithUnknownFields;
