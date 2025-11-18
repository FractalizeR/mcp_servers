/**
 * Фикстуры для Project entity
 *
 * Используются в тестах для создания mock данных проектов.
 */

import type {
  Project,
  ProjectWithUnknownFields,
  ProjectStatus,
  QueueRef,
} from '../../src/tracker_api/entities/index.js';
import { createUserRef } from './common-fixtures.js';

/**
 * Создать QueueRef для тестов
 *
 * @example
 * ```typescript
 * const queueRef = createQueueRef({ key: 'QUEUE1', display: 'My Queue' });
 * ```
 */
export function createQueueRefForProject(overrides?: Partial<QueueRef>): QueueRef {
  return {
    id: '1',
    key: 'QUEUE',
    display: 'Test Queue',
    ...overrides,
  };
}

/**
 * Создать Project для тестов
 *
 * @example
 * ```typescript
 * // Создать проект с дефолтными значениями
 * const project = createProjectFixture();
 *
 * // Создать проект с кастомными значениями
 * const project = createProjectFixture({
 *   key: 'MYPROJ',
 *   name: 'My Custom Project',
 *   status: 'launched'
 * });
 *
 * // Создать проект с полной конфигурацией
 * const project = createProjectFixture({
 *   key: 'PROJ',
 *   queues: [
 *     createQueueRefForProject({ key: 'QUEUE1', display: 'Queue 1' }),
 *     createQueueRefForProject({ key: 'QUEUE2', display: 'Queue 2' })
 *   ]
 * });
 * ```
 */
export function createProjectFixture(overrides?: Partial<Project>): ProjectWithUnknownFields {
  const key = overrides?.key || 'TESTPROJ';
  const id = overrides?.id || 'project123';

  return {
    id,
    self: `https://api.tracker.yandex.net/v2/projects/${id}`,
    key,
    name: 'Test Project',
    lead: createUserRef(),
    status: 'in_progress' as ProjectStatus,
    ...overrides,
  };
}

/**
 * Создать Project с минимальными обязательными полями
 * (полезно для negative testing)
 *
 * @example
 * ```typescript
 * const minimal = createMinimalProjectFixture('PROJ');
 * ```
 */
export function createMinimalProjectFixture(key = 'TESTPROJ'): Project {
  return {
    id: `project-${key.toLowerCase()}`,
    self: `https://api.tracker.yandex.net/v2/projects/project-${key.toLowerCase()}`,
    key,
    name: `${key} Project`,
    lead: createUserRef(),
    status: 'draft' as ProjectStatus,
  };
}

/**
 * Создать Project с полной конфигурацией (включая опциональные поля)
 *
 * @example
 * ```typescript
 * const fullProject = createFullProjectFixture();
 * ```
 */
export function createFullProjectFixture(overrides?: Partial<Project>): ProjectWithUnknownFields {
  return createProjectFixture({
    description: 'Test Project Description',
    teamUsers: [createUserRef(), createUserRef({ id: '2', display: 'User 2' })],
    teamGroups: [
      { id: '1', display: 'Group 1' },
      { id: '2', display: 'Group 2' },
    ],
    startDate: '2024-01-01',
    endDate: '2024-12-31',
    queues: [
      createQueueRefForProject({ id: '1', key: 'QUEUE1', display: 'Queue 1' }),
      createQueueRefForProject({ id: '2', key: 'QUEUE2', display: 'Queue 2' }),
    ],
    ...overrides,
  });
}

/**
 * Создать массив Project для тестов
 *
 * @example
 * ```typescript
 * const projects = createProjectListFixture(3);
 * // Вернёт массив из 3 проектов с уникальными ключами
 * ```
 */
export function createProjectListFixture(
  count: number,
  baseOverrides?: Partial<Project>
): ProjectWithUnknownFields[] {
  return Array.from({ length: count }, (_, index) => {
    const key = `PROJ${index + 1}`;
    return createProjectFixture({
      id: `project${index + 1}`,
      key,
      name: `Project ${index + 1}`,
      ...baseOverrides,
    });
  });
}
