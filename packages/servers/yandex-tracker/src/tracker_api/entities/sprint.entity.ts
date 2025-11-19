/**
 * Доменный тип: Спринт в Яндекс.Трекере
 *
 * Соответствует API v2: /v2/sprints/{sprintId}
 * Также: /v2/boards/{boardId}/sprints/
 */

import type { WithUnknownFields } from './types.js';
import type { UserRef } from './common/user-ref.entity.js';

/**
 * Статус спринта в Яндекс.Трекере
 *
 * - draft - Черновик (спринт создан, но еще не начат)
 * - in_progress - В процессе (спринт активен)
 * - released - Завершен (спринт закрыт)
 */
export type SprintStatus = 'draft' | 'in_progress' | 'released';

/**
 * Референс на доску (упрощенная версия Board)
 */
export interface BoardRef {
  /** Идентификатор доски */
  readonly id: string;

  /** URL ссылка на доску в API */
  readonly self: string;

  /** Отображаемое имя доски */
  readonly display: string;
}

/**
 * Спринт в Яндекс.Трекере
 *
 * ВАЖНО: Типизация основана на официальном Python SDK и реальных ответах API v2.
 * Обязательные поля (без ?) всегда присутствуют в ответе GET /v2/sprints/{sprintId}.
 * Опциональные поля могут отсутствовать в зависимости от настроек спринта.
 */
export interface Sprint {
  /** Идентификатор спринта (всегда присутствует) */
  readonly id: string;

  /** URL ссылка на спринт в API (всегда присутствует) */
  readonly self: string;

  /** Версия спринта (для оптимистичных блокировок) (всегда присутствует) */
  readonly version: number;

  /** Название спринта (всегда присутствует) */
  readonly name: string;

  /** Доска, к которой относится спринт (может отсутствовать) */
  readonly board?: BoardRef;

  /** Статус спринта (может отсутствовать) */
  readonly status?: SprintStatus;

  /** Спринт архивирован (может отсутствовать) */
  readonly archived?: boolean;

  /** Пользователь, создавший спринт (может отсутствовать) */
  readonly createdBy?: UserRef;

  /** Дата и время создания спринта в формате ISO 8601 (может отсутствовать) */
  readonly createdAt?: string;

  /** Дата начала спринта (формат YYYY-MM-DD) (может отсутствовать) */
  readonly startDate?: string;

  /** Дата окончания спринта (формат YYYY-MM-DD) (может отсутствовать) */
  readonly endDate?: string;

  /** Дата и время начала спринта в формате ISO 8601 (может отсутствовать) */
  readonly startDateTime?: string;

  /** Дата и время окончания спринта в формат��� ISO 8601 (может отсутствовать) */
  readonly endDateTime?: string;
}

/**
 * Спринт с возможными unknown полями из API.
 * Используется при получении данных от API Трекера.
 */
export type SprintWithUnknownFields = WithUnknownFields<Sprint>;
