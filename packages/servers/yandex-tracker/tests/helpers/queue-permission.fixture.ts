/**
 * Фикстуры для QueuePermission entity
 *
 * Используются в тестах для создания mock данных прав доступа к очереди.
 */

import type {
  QueuePermission,
  QueuePermissionWithUnknownFields,
  QueueRole,
} from '../../src/tracker_api/entities/queue-permission.entity.js';

/**
 * Создать QueuePermission для тестов
 *
 * @example
 * ```typescript
 * // Создать право доступа с дефолтными значениями
 * const permission = createQueuePermissionFixture();
 *
 * // Создать право доступа для конкретного пользователя
 * const permission = createQueuePermissionFixture({
 *   id: 'user-123',
 *   display: 'John Doe'
 * });
 * ```
 */
export function createQueuePermissionFixture(
  overrides?: Partial<QueuePermission>
): QueuePermissionWithUnknownFields {
  const id = overrides?.id || 'user-1234567890';
  const display = overrides?.display || 'Test User';

  return {
    id,
    self: `https://api.tracker.yandex.net/v3/users/${id}`,
    display,
    ...overrides,
  };
}

/**
 * Создать массив QueuePermission для тестов
 *
 * @example
 * ```typescript
 * const permissions = createQueuePermissionListFixture(3);
 * // Вернёт массив из 3 прав доступа с уникальными пользователями
 * ```
 */
export function createQueuePermissionListFixture(
  count: number,
  baseOverrides?: Partial<QueuePermission>
): QueuePermissionWithUnknownFields[] {
  return Array.from({ length: count }, (_, index) => {
    const userId = `user-${1000 + index}`;
    return createQueuePermissionFixture({
      id: userId,
      display: `Test User ${index + 1}`,
      ...baseOverrides,
    });
  });
}

/**
 * Создать права доступа для конкретной роли (для documentation)
 *
 * @example
 * ```typescript
 * const leadPermission = createQueuePermissionForRole('queue-lead', {
 *   id: 'user-123',
 *   display: 'Queue Lead User'
 * });
 * ```
 */
export function createQueuePermissionForRole(
  _role: QueueRole,
  overrides?: Partial<QueuePermission>
): QueuePermissionWithUnknownFields {
  // Примечание: API возвращает одинаковую структуру для всех ролей
  // Роль указывается только в запросе, не в ответе
  return createQueuePermissionFixture(overrides);
}

/**
 * Создать минимальное право доступа
 *
 * @example
 * ```typescript
 * const minimal = createMinimalQueuePermissionFixture('user-999');
 * ```
 */
export function createMinimalQueuePermissionFixture(userId = 'user-1234567890'): QueuePermission {
  return {
    id: userId,
    self: `https://api.tracker.yandex.net/v3/users/${userId}`,
    display: 'Minimal User',
  };
}

/**
 * Создать стандартный набор прав доступа для разных ролей
 * (для документации и примеров)
 *
 * @example
 * ```typescript
 * const standardPermissions = createStandardPermissionsSet('TEST');
 * ```
 */
export function createStandardPermissionsSet(
  queueKey = 'TEST'
): Record<QueueRole, QueuePermissionWithUnknownFields[]> {
  return {
    'queue-lead': [
      createQueuePermissionFixture({
        id: 'user-lead-1',
        display: 'Queue Lead',
      }),
    ],
    'team-member': [
      createQueuePermissionFixture({
        id: 'user-member-1',
        display: 'Team Member 1',
      }),
      createQueuePermissionFixture({
        id: 'user-member-2',
        display: 'Team Member 2',
      }),
    ],
    follower: [
      createQueuePermissionFixture({
        id: 'user-follower-1',
        display: 'Follower 1',
      }),
    ],
    access: [
      createQueuePermissionFixture({
        id: 'user-access-1',
        display: 'Access User 1',
      }),
      createQueuePermissionFixture({
        id: 'user-access-2',
        display: 'Access User 2',
      }),
    ],
  };
}
