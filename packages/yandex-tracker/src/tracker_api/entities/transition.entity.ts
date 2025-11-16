/**
 * Доменный тип: Переход статуса задачи (workflow transition)
 *
 * Соответствует API v3: /v3/issues/{issueKey}/transitions
 */

import type { WithUnknownFields } from './types.js';
import type { Status } from './status.entity.js';

/**
 * Доступный переход статуса
 *
 * ВАЖНО: Типизация основана на Python SDK и API v3.
 * Представляет возможный переход из текущего статуса в другой.
 */
export interface Transition {
  /** Идентификатор перехода */
  readonly id: string;

  /** URL перехода */
  readonly self: string;

  /** Целевой статус, в который будет переведена задача */
  readonly to: Status;

  /** Форма (screen) для заполнения при переходе (если требуется) */
  readonly screen?: {
    readonly id: string;
    readonly self: string;
  };
}

/**
 * Переход с возможными unknown полями из API.
 * Используется при получении данных от API Трекера.
 */
export type TransitionWithUnknownFields = WithUnknownFields<Transition>;
