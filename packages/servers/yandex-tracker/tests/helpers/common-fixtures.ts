/**
 * Фикстуры для общих типов (common entities)
 *
 * Используются в тестах для создания mock данных.
 */

import type {
  UserRef,
  PaginationParams,
  TimestampFields,
} from '../../src/tracker_api/entities/common/index.js';
import type { User, UserWithUnknownFields } from '../../src/tracker_api/entities/user.entity.js';

/**
 * Создать UserRef для тестов
 *
 * @example
 * ```typescript
 * const userRef = createUserRef({ id: '123', display: 'John Doe' });
 * ```
 */
export function createUserRef(overrides?: Partial<UserRef>): UserRef {
  return {
    self: 'https://api.tracker.yandex.net/v3/users/1234567890',
    id: '1234567890',
    display: 'Test User',
    ...overrides,
  };
}

/**
 * Создать PaginationParams для тестов
 *
 * @example
 * ```typescript
 * const params = createPaginationParams({ perPage: 100 });
 * ```
 */
export function createPaginationParams(overrides?: Partial<PaginationParams>): PaginationParams {
  return {
    perPage: 50,
    ...overrides,
  };
}

/**
 * Создать TimestampFields для тестов
 *
 * @example
 * ```typescript
 * const timestamps = createTimestampFields();
 * // или с кастомными датами
 * const timestamps = createTimestampFields({
 *   createdAt: '2024-01-01T00:00:00.000Z'
 * });
 * ```
 */
export function createTimestampFields(overrides?: Partial<TimestampFields>): TimestampFields {
  const now = new Date('2024-01-15T10:00:00.000Z').toISOString();

  return {
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

/** Пользователь в полях сущностей (`createdBy`, `updatedBy`) — не `UserRef`. */
export function createUserFixture(
  overrides?: Partial<User> & Record<string, unknown>
): UserWithUnknownFields {
  return {
    uid: '1234567890',
    display: 'Test User',
    login: 'test.user',
    isActive: true,
    ...overrides,
  };
}
