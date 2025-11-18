/**
 * Фикстуры для Link entity
 *
 * Используются в тестах для создания mock данных связей между задачами.
 */

import type {
  Link,
  LinkWithUnknownFields,
  LinkType,
} from '../../src/tracker_api/entities/index.js';
import { createUserRef } from './common-fixtures.js';

/**
 * Создать LinkType для тестов
 *
 * @example
 * ```typescript
 * const linkType = createLinkType({ id: 'subtask' });
 * ```
 */
export function createLinkType(overrides?: Partial<LinkType>): LinkType {
  return {
    id: 'subtask',
    inward: 'является подзадачей',
    outward: 'имеет подзадачу',
    ...overrides,
  };
}

/**
 * Создать Link для тестов
 *
 * @example
 * ```typescript
 * // Создать связь с дефолтными значениями
 * const link = createLinkFixture();
 *
 * // Создать связь типа "relates"
 * const relatesLink = createLinkFixture({
 *   type: { id: 'relates', inward: 'связана с', outward: 'связана с' }
 * });
 *
 * // Создать связь с кастомной задачей
 * const link = createLinkFixture({
 *   object: {
 *     id: 'custom123',
 *     key: 'PROJ-999',
 *     display: 'Custom issue'
 *   }
 * });
 * ```
 */
export function createLinkFixture(overrides?: Partial<Link>): LinkWithUnknownFields {
  const id = overrides?.id || 'link123';
  const issueKey = 'TEST-1';

  return {
    id,
    self: `https://api.tracker.yandex.net/v3/issues/${issueKey}/links/${id}`,
    type: createLinkType(),
    direction: 'outward',
    object: {
      id: 'issue456',
      key: 'TEST-456',
      display: 'Test subtask',
    },
    createdBy: createUserRef(),
    createdAt: '2025-01-18T10:00:00.000+0000',
    ...overrides,
  };
}

/**
 * Создать связь типа "subtask" (подзадача)
 *
 * @example
 * ```typescript
 * const subtaskLink = createSubtaskLinkFixture();
 * // TEST-1 имеет подзадачу TEST-456
 * ```
 */
export function createSubtaskLinkFixture(overrides?: Partial<Link>): LinkWithUnknownFields {
  return createLinkFixture({
    type: {
      id: 'subtask',
      inward: 'является подзадачей',
      outward: 'имеет подзадачу',
    },
    direction: 'outward',
    ...overrides,
  });
}

/**
 * Создать связь типа "relates" (связана с)
 *
 * @example
 * ```typescript
 * const relatesLink = createRelatesLinkFixture();
 * // TEST-1 связана с TEST-456
 * ```
 */
export function createRelatesLinkFixture(overrides?: Partial<Link>): LinkWithUnknownFields {
  return createLinkFixture({
    type: {
      id: 'relates',
      inward: 'связана с',
      outward: 'связана с',
    },
    direction: 'outward',
    ...overrides,
  });
}

/**
 * Создать связь типа "depends" (зависимость)
 *
 * @example
 * ```typescript
 * const dependsLink = createDependsLinkFixture();
 * // TEST-1 зависит от TEST-456
 * ```
 */
export function createDependsLinkFixture(overrides?: Partial<Link>): LinkWithUnknownFields {
  return createLinkFixture({
    type: {
      id: 'depends',
      inward: 'зависит от',
      outward: 'блокирует',
    },
    direction: 'inward',
    ...overrides,
  });
}

/**
 * Создать связь типа "duplicate" (дубликат)
 *
 * @example
 * ```typescript
 * const duplicateLink = createDuplicateLinkFixture();
 * // TEST-1 дублирует TEST-456
 * ```
 */
export function createDuplicateLinkFixture(overrides?: Partial<Link>): LinkWithUnknownFields {
  return createLinkFixture({
    type: {
      id: 'duplicate',
      inward: 'дублируется',
      outward: 'дублирует',
    },
    direction: 'outward',
    ...overrides,
  });
}

/**
 * Создать связь типа "epic" (epic)
 *
 * @example
 * ```typescript
 * const epicLink = createEpicLinkFixture();
 * // TEST-1 входит в epic TEST-456
 * ```
 */
export function createEpicLinkFixture(overrides?: Partial<Link>): LinkWithUnknownFields {
  return createLinkFixture({
    type: {
      id: 'epic',
      inward: 'входит в epic',
      outward: 'является epic для',
    },
    direction: 'inward',
    ...overrides,
  });
}

/**
 * Создать массив Links для тестов
 *
 * @example
 * ```typescript
 * const links = createLinkListFixture(3);
 * // Вернёт массив из 3 связей с уникальными id
 * ```
 */
export function createLinkListFixture(
  count: number,
  baseOverrides?: Partial<Link>
): LinkWithUnknownFields[] {
  return Array.from({ length: count }, (_, index) =>
    createLinkFixture({
      id: `link${123 + index}`,
      object: {
        id: `issue${456 + index}`,
        key: `TEST-${456 + index}`,
        display: `Test issue ${index + 1}`,
      },
      ...baseOverrides,
    })
  );
}

/**
 * Создать Link с минимальными обязательными полями
 * (полезно для negative testing)
 *
 * @example
 * ```typescript
 * const minimal = createMinimalLinkFixture();
 * ```
 */
export function createMinimalLinkFixture(
  id = 'link123',
  issueKey = 'TEST-1'
): LinkWithUnknownFields {
  return {
    id,
    self: `https://api.tracker.yandex.net/v3/issues/${issueKey}/links/${id}`,
    type: createLinkType(),
    direction: 'outward',
    object: {
      id: 'issue456',
      key: 'TEST-456',
      display: 'Test issue',
    },
    createdBy: createUserRef(),
    createdAt: '2025-01-18T10:00:00.000+0000',
  };
}
