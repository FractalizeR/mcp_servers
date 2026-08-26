/**
 * Доменный тип: Права доступа к очереди в Яндекс.Трекере
 *
 * Соответствует API v3: `GET/PATCH /v3/queues/{queueId}/permissions`. Форма — объект,
 * ключёванный разрешением (`create`/`write`/`read`/`grant`/`deny`), а НЕ массив прав —
 * снята живой пробой 2026-08-26 на очереди `TESTSWEEPB`
 * (`.agentic-planning/plan_tracker_sweep7_fixes/inventory/queue-permissions-response-2026-08-26.json`).
 * `GET` отвечает полной формой; `PATCH` того же ресурса отвечает ТОЛЬКО `{ self, version }`,
 * без единого разрешения — обе формы легитимны, и тип обязан пережить пустую.
 */

import type { WithUnknownFields } from './types.js';

/**
 * Субъект права доступа: пользователь, группа или встроенная роль задачи.
 * `cloudUid`/`passportUid` наблюдались только у субъектов-пользователей.
 */
export interface QueueAccessSubject {
  readonly self: string;
  readonly id: string;
  readonly display: string;
  readonly cloudUid?: string;
  readonly passportUid?: number;
}

export type QueueAccessSubjectWithUnknownFields = WithUnknownFields<QueueAccessSubject>;

/**
 * Одна запись разрешения. Все три вида субъекта опциональны — очередь может не
 * иметь ни одной записи по какому-то виду (например, `read` в живой пробе нёс
 * только `roles`, без `users`/`groups`).
 */
export interface QueuePermissionEntry {
  readonly self: string;
  readonly users?: readonly QueueAccessSubjectWithUnknownFields[];
  readonly groups?: readonly QueueAccessSubjectWithUnknownFields[];
  readonly roles?: readonly QueueAccessSubjectWithUnknownFields[];
}

export type QueuePermissionEntryWithUnknownFields = WithUnknownFields<QueuePermissionEntry>;

/**
 * Права доступа к очереди целиком.
 *
 * Все пять ключей разрешений опциональны. `deny` живьём НЕ наблюдался — проба
 * 2026-08-26 вернула только `create`/`write`/`read`/`grant`; референсный клиент
 * (`yandex_tracker_client/collections.py`, класс `Permissions`) тоже перечисляет
 * только `self/create/read/write/grant`, без `deny`. Оставлен в типе, потому что
 * документация его объявляет, но помечен как непроверенный, а не наблюдённый факт.
 *
 * Ответ, состоящий из одной версии (`{self, version}`, без единого разрешения) —
 * законная форма, а не ошибка парсинга: смоук-тест референсного клиента мокает
 * ответ `Permissions` ровно так (`{"version": 11}`).
 */
export interface QueuePermissions {
  readonly self: string;
  readonly version: number;
  readonly create?: QueuePermissionEntryWithUnknownFields;
  readonly write?: QueuePermissionEntryWithUnknownFields;
  readonly read?: QueuePermissionEntryWithUnknownFields;
  readonly grant?: QueuePermissionEntryWithUnknownFields;
  /** Не наблюдался живьём — см. комментарий к интерфейсу. */
  readonly deny?: QueuePermissionEntryWithUnknownFields;
}

export type QueuePermissionsWithUnknownFields = WithUnknownFields<QueuePermissions>;
