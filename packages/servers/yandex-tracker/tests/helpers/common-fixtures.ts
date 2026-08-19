/**
 * Фикстуры для общих типов (common entities)
 *
 * Используются в тестах для создания mock данных.
 */

import type {
  PaginationParams,
  TimestampFields,
} from '../../src/tracker_api/entities/common/index.js';
import type { User, UserWithUnknownFields } from '../../src/tracker_api/entities/user.entity.js';

/**
 * Фабрики ref-ов живут в одном месте — `entity.factories`. Здесь только реэкспорт:
 * форма ref-а обязана правиться ровно в одной точке, иначе расхождение двух копий
 * воспроизводит ровно тот класс дефекта, ради которого эти типы и чинились.
 */
export { createUserRef, createQueueRef } from '#tracker_api/entities/entity.factories.js';

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

export function createUserFixture(
  overrides?: Partial<User> & Record<string, unknown>
): UserWithUnknownFields {
  return {
    uid: 1234567890,
    display: 'Test User',
    login: 'test.user',
    dismissed: false,
    ...overrides,
  };
}
