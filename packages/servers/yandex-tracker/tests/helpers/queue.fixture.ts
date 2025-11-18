/**
 * Фикстуры для Queue entity
 *
 * Используются в тестах для создания mock данных очередей.
 */

import type {
  Queue,
  QueueWithUnknownFields,
  QueueDictionaryRef,
  QueueIssueTypeConfig,
} from '../../src/tracker_api/entities/queue.entity.js';
import { createUserRef } from './common-fixtures.js';

/**
 * Создать QueueDictionaryRef для тестов
 *
 * @example
 * ```typescript
 * const typeRef = createQueueDictionaryRef({ key: 'task', display: 'Task' });
 * ```
 */
export function createQueueDictionaryRef(
  overrides?: Partial<QueueDictionaryRef>
): QueueDictionaryRef {
  return {
    id: '1',
    key: 'task',
    display: 'Task',
    ...overrides,
  };
}

/**
 * Создать QueueIssueTypeConfig для тестов
 *
 * @example
 * ```typescript
 * const config = createQueueIssueTypeConfig({ issueType: { id: '2' } });
 * ```
 */
export function createQueueIssueTypeConfig(
  overrides?: Partial<QueueIssueTypeConfig>
): QueueIssueTypeConfig {
  return {
    issueType: { id: '1' },
    workflow: { id: '1' },
    resolutions: [{ id: '1' }, { id: '2' }],
    ...overrides,
  };
}

/**
 * Создать Queue для тестов
 *
 * @example
 * ```typescript
 * // Создать очередь с дефолтными значениями
 * const queue = createQueueFixture();
 *
 * // Создать очередь с кастомными значениями
 * const queue = createQueueFixture({
 *   key: 'MYQUEUE',
 *   name: 'My Custom Queue',
 *   description: 'Custom queue description'
 * });
 *
 * // Создать очередь с полной конфигурацией
 * const queue = createQueueFixture({
 *   key: 'PROJ',
 *   issueTypes: [
 *     createQueueDictionaryRef({ key: 'task', display: 'Task' }),
 *     createQueueDictionaryRef({ key: 'bug', display: 'Bug' })
 *   ]
 * });
 * ```
 */
export function createQueueFixture(overrides?: Partial<Queue>): QueueWithUnknownFields {
  const key = overrides?.key || 'TEST';
  const id = overrides?.id || 'queue123';

  return {
    id,
    self: `https://api.tracker.yandex.net/v3/queues/${key}`,
    key,
    version: 1,
    name: 'Test Queue',
    lead: createUserRef(),
    assignAuto: false,
    defaultType: createQueueDictionaryRef({ id: '1', key: 'task', display: 'Task' }),
    defaultPriority: createQueueDictionaryRef({ id: '3', key: 'normal', display: 'Normal' }),
    ...overrides,
  };
}

/**
 * Создать Queue с минимальными обязательными полями
 * (полезно для negative testing)
 *
 * @example
 * ```typescript
 * const minimal = createMinimalQueueFixture('PROJ');
 * ```
 */
export function createMinimalQueueFixture(key = 'TEST'): Queue {
  return {
    id: `queue-${key.toLowerCase()}`,
    self: `https://api.tracker.yandex.net/v3/queues/${key}`,
    key,
    version: 1,
    name: `${key} Queue`,
    lead: createUserRef(),
    assignAuto: false,
    defaultType: createQueueDictionaryRef({ id: '1', key: 'task', display: 'Task' }),
    defaultPriority: createQueueDictionaryRef({ id: '3', key: 'normal', display: 'Normal' }),
  };
}

/**
 * Создать Queue с полной конфигурацией (включая опциональные поля)
 *
 * @example
 * ```typescript
 * const fullQueue = createFullQueueFixture();
 * ```
 */
export function createFullQueueFixture(overrides?: Partial<Queue>): QueueWithUnknownFields {
  return createQueueFixture({
    description: 'Test Queue Description',
    issueTypes: [
      createQueueDictionaryRef({ id: '1', key: 'task', display: 'Task' }),
      createQueueDictionaryRef({ id: '2', key: 'bug', display: 'Bug' }),
      createQueueDictionaryRef({ id: '3', key: 'story', display: 'Story' }),
    ],
    workflows: {
      '1': [
        { id: 'open', display: 'Open' },
        { id: 'inProgress', display: 'In Progress' },
        { id: 'resolved', display: 'Resolved' },
      ],
    },
    denyVoting: false,
    issueTypesConfig: [
      createQueueIssueTypeConfig({
        issueType: { id: '1' },
        workflow: { id: '1' },
        resolutions: [{ id: '1' }, { id: '2' }],
      }),
    ],
    ...overrides,
  });
}

/**
 * Создать массив Queue для тестов
 *
 * @example
 * ```typescript
 * const queues = createQueueListFixture(3);
 * // Вернёт массив из 3 очередей с уникальными ключами
 * ```
 */
export function createQueueListFixture(
  count: number,
  baseOverrides?: Partial<Queue>
): QueueWithUnknownFields[] {
  return Array.from({ length: count }, (_, index) => {
    const key = `Q${index + 1}`;
    return createQueueFixture({
      id: `queue${index + 1}`,
      key,
      name: `Queue ${index + 1}`,
      ...baseOverrides,
    });
  });
}
