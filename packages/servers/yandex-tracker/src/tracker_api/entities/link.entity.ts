/**
 * Доменный тип: Связь между задачами в Яндекс.Трекере
 *
 * Соответствует API v3: /v3/issues/{issueId}/links
 *
 * ВАЖНО: API возвращает связь в формате:
 * ```json
 * {
 *   "id": "67890",
 *   "self": "https://api.tracker.yandex.net/v3/issues/TEST-123/links/67890",
 *   "type": {
 *     "id": "subtask",
 *     "inward": "является подзадачей",
 *     "outward": "имеет подзадачу"
 *   },
 *   "direction": "outward",
 *   "object": {
 *     "id": "abc123",
 *     "key": "TEST-456",
 *     "display": "Task title"
 *   },
 *   "createdBy": { "self": "...", "id": "1", "display": "User" },
 *   "createdAt": "2023-01-15T10:30:00.000+0000",
 *   "updatedBy": { "self": "...", "id": "1", "display": "User" },
 *   "updatedAt": "2023-01-16T12:00:00.000+0000"
 * }
 * ```
 */

import type { WithUnknownFields } from './types.js';
import type { UserRef } from './common/user-ref.entity.js';
import type { LinkType } from './link-type.entity.js';

/**
 * Связь между задачами
 *
 * Представляет различные типы связей:
 * - subtask (является подзадачей / имеет подзадачу)
 * - depends (зависит от / блокирует)
 * - relates (связана с)
 * - duplicates (дублирует / дублируется)
 * - epic (является epic / входит в epic)
 *
 * ВАЖНО: Все обязательные поля всегда присутствуют в ответе API.
 */
export interface Link {
  /**
   * Идентификатор связи (всегда присутствует)
   * @example "67890"
   */
  readonly id: string;

  /**
   * URL связи в API (всегда присутствует)
   * @example "https://api.tracker.yandex.net/v3/issues/TEST-123/links/67890"
   */
  readonly self: string;

  /**
   * Тип связи (всегда присутствует)
   */
  readonly type: LinkType;

  /**
   * Направление связи относительно текущей задачи
   * - "inward" - входящая связь (другая задача ссылается на текущую)
   * - "outward" - исходящая связь (текущая задача ссылается на другую)
   * @example "outward"
   */
  readonly direction: 'inward' | 'outward';

  /**
   * Связанная задача (объект связи)
   */
  readonly object: {
    /** Идентификатор связанной задачи */
    readonly id: string;
    /** Ключ связанной задачи (например, TEST-456) */
    readonly key: string;
    /** Отображаемое название задачи */
    readonly display: string;
  };

  /**
   * Пользователь, создавший связь (всегда присутствует)
   */
  readonly createdBy: UserRef;

  /**
   * Дата создания связи (ISO 8601) (всегда присутствует)
   * @example "2023-01-15T10:30:00.000+0000"
   */
  readonly createdAt: string;

  /**
   * Пользователь, изменивший связь (может отсутствовать)
   */
  readonly updatedBy?: UserRef;

  /**
   * Дата последнего обновления связи (ISO 8601) (может отсутствовать)
   * @example "2023-01-16T12:00:00.000+0000"
   */
  readonly updatedAt?: string;
}

/**
 * Link с возможными unknown полями из API.
 * Используется при получении данных от API Трекера.
 */
export type LinkWithUnknownFields = WithUnknownFields<Link>;

/**
 * Типы отношений между задачами (для создания связей)
 *
 * Используется при создании новых связей через API.
 * Каждый тип имеет два направления (inward/outward).
 *
 * @example
 * ```typescript
 * // Создать связь "TEST-123 имеет подзадачу TEST-456"
 * const relationship: LinkRelationship = 'has subtasks';
 * ```
 */
export type LinkRelationship =
  | 'relates' // связана с (двунаправленная)
  | 'is duplicated by' // дублируется задачей
  | 'duplicates' // дублирует задачу
  | 'is subtask of' // является подзадачей
  | 'has subtasks' // имеет подзадачи
  | 'depends on' // зависит от
  | 'is dependent by' // блокирует (от нее зависят)
  | 'is epic of' // является epic для
  | 'has epic'; // входит в epic
