/**
 * Доменный тип: Проект в Яндекс.Трекере
 *
 * Соответствует API v2: /v2/projects/{projectId}
 */

import type { WithUnknownFields } from './types.js';
import type { UserRef } from './common/user-ref.entity.js';
import type { QueueRef } from './common/queue-ref.entity.js';

/**
 * Статус проекта в Яндекс.Трекере
 *
 * - draft - Черновик
 * - in_progress - В работе
 * - launched - Запущен
 * - postponed - Отложен
 * - at_risk - Под угрозой срыва
 */
export type ProjectStatus = 'draft' | 'in_progress' | 'launched' | 'postponed' | 'at_risk';

/**
 * Проект в Яндекс.Трекере
 *
 * ВАЖНО: Типизация основана на реальных ответах API v2.
 * Обязательные поля (без ?) всегда присутствуют в ответе GET /v2/projects/{projectId}.
 * Опциональные поля могут отсутствовать в зависимости от настроек проекта.
 */
export interface Project {
  /** Идентификатор проекта (всегда присутствует) */
  readonly id: string;

  /** URL ссылка на проект в API (всегда присутствует) */
  readonly self: string;

  /** Ключ проекта (уникальный идентификатор) (всегда присутствует) */
  readonly key: string;

  /** Название проекта (всегда присутствует) */
  readonly name: string;

  /** Руководитель проекта (всегда присутствует) */
  readonly lead: UserRef;

  /** Статус проекта (всегда присутствует) */
  readonly status: ProjectStatus;

  /** Описание проекта (может отсутствовать) */
  readonly description?: string;

  /** Участники проекта (может отсутствовать) */
  readonly teamUsers?: ReadonlyArray<UserRef>;

  /** Группы участников проекта (может отсутствовать) */
  readonly teamGroups?: ReadonlyArray<{
    readonly id: string;
    readonly display: string;
  }>;

  /** Дата начала проекта в формате ISO 8601 (может отсутствовать) */
  readonly startDate?: string;

  /** Дата окончания проекта в формате ISO 8601 (может отсутствовать) */
  readonly endDate?: string;

  /**
   * Очереди, связанные с проектом (может отсутствовать)
   *
   * НЕ ПОДТВЕРЖДЕНО живой пробой: у доступных проектов поле не пришло даже с
   * `expand=queues` (проверялось 2026-08-19). Форма взята по правилу, снятому с
   * подтверждённых `Issue.queue` и `Component.queue`. Если API отдаст здесь ref без
   * `self` — вернуть проектам отдельный тип.
   */
  readonly queues?: ReadonlyArray<QueueRef>;
}

/**
 * Проект с возможными unknown полями из API.
 * Используется при получении данных от API Трекера.
 */
export type ProjectWithUnknownFields = WithUnknownFields<Project>;
