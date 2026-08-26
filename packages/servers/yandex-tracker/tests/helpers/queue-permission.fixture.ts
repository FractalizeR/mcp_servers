/**
 * Фикстуры для формы ответа `GET/PATCH /v3/queues/{queueId}/permissions`
 * (`QueuePermissions` entity) — объект, ключёванный разрешением, а не массив.
 * Форма снята живой пробой 2026-08-26:
 * `.agentic-planning/plan_tracker_sweep7_fixes/inventory/queue-permissions-response-2026-08-26.json`.
 */

import type {
  QueueAccessSubject,
  QueueAccessSubjectWithUnknownFields,
  QueuePermissionEntry,
  QueuePermissionEntryWithUnknownFields,
  QueuePermissions,
  QueuePermissionsWithUnknownFields,
} from '../../src/tracker_api/entities/queue-permission.entity.js';

/**
 * Создать субъект права доступа (элемент `users`/`groups`/`roles`) для тестов.
 *
 * @example
 * ```typescript
 * const subject = createQueueAccessSubjectFixture({ id: 'user1', display: 'User 1' });
 * ```
 */
export function createQueueAccessSubjectFixture(
  overrides?: Partial<QueueAccessSubject>
): QueueAccessSubjectWithUnknownFields {
  const id = overrides?.id ?? 'user-1234567890';

  return {
    id,
    self: `https://api.tracker.yandex.net/v3/users/${id}`,
    display: 'Test User',
    ...overrides,
  };
}

/**
 * Создать одну запись разрешения (`create`/`write`/`read`/`grant`/`deny`).
 *
 * @example
 * ```typescript
 * const write = createQueuePermissionEntryFixture('write', {
 *   users: [createQueueAccessSubjectFixture({ id: 'user1' })],
 * });
 * ```
 */
export function createQueuePermissionEntryFixture(
  permission: string,
  overrides?: Partial<QueuePermissionEntry>
): QueuePermissionEntryWithUnknownFields {
  return {
    self: `https://api.tracker.yandex.net/v3/queues/TEST/permissions/${permission}`,
    users: [createQueueAccessSubjectFixture()],
    ...overrides,
  };
}

/**
 * Создать полный ответ `QueuePermissions` для тестов — по умолчанию несёт запись
 * `write` с одним пользователем; `overrides` заменяют/добавляют любые ключи, включая
 * полное отсутствие записей (объект `{self, version}` — законная форма, см.
 * комментарий к `QueuePermissions`).
 *
 * @example
 * ```typescript
 * // Полный ответ с одной записью write
 * const response = createQueuePermissionsFixture();
 *
 * // Ответ без единого разрешения ({self, version})
 * const empty = createQueuePermissionsFixture({ write: undefined });
 * ```
 */
export function createQueuePermissionsFixture(
  overrides?: Partial<QueuePermissions>
): QueuePermissionsWithUnknownFields {
  const base: QueuePermissions = {
    self: 'https://api.tracker.yandex.net/v3/queues/TEST/permissions',
    version: 1,
    write: createQueuePermissionEntryFixture('write'),
  };

  return { ...base, ...overrides };
}

/**
 * Ответ, состоящий из одной версии, без единого разрешения — форма, которую живьём
 * отдаёт `PATCH .../permissions` (см. `queue-permission.entity.ts`). Смоук-тест
 * референсного клиента (`yandex_tracker_client`, `Permissions`) мокает ответ ещё
 * скупее — `{"version": 11}`, без `self`; здесь `self` добавлен, потому что
 * `QueuePermissions.self` обязателен по типу.
 */
export function createVersionOnlyQueuePermissionsFixture(
  version = 11
): QueuePermissionsWithUnknownFields {
  return {
    self: 'https://api.tracker.yandex.net/v3/queues/TEST/permissions',
    version,
  };
}
