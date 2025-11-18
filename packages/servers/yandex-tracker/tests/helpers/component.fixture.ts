/**
 * Фикстуры для Component entity
 *
 * Используются в тестах для создания mock данных компонентов.
 */

import type {
  Component,
  ComponentWithUnknownFields,
  QueueRef,
} from '../../src/tracker_api/entities/component.entity.js';
import { createUserRef } from './common-fixtures.js';

/**
 * Создать QueueRef для тестов
 *
 * @example
 * ```typescript
 * const queueRef = createQueueRef({ key: 'MYQUEUE', display: 'My Queue' });
 * ```
 */
export function createQueueRef(overrides?: Partial<QueueRef>): QueueRef {
  return {
    id: '1',
    key: 'TEST',
    display: 'Test Queue',
    ...overrides,
  };
}

/**
 * Создать Component для тестов
 *
 * @example
 * ```typescript
 * // Создать компонент с дефолтными значениями
 * const component = createComponentFixture();
 *
 * // Создать компонент с кастомными значениями
 * const component = createComponentFixture({
 *   name: 'Backend',
 *   description: 'Backend services',
 *   assignAuto: true
 * });
 *
 * // Создать компонент с руководителем
 * const component = createComponentFixture({
 *   lead: createUserRef({ id: '123', display: 'John Doe' })
 * });
 * ```
 */
export function createComponentFixture(overrides?: Partial<Component>): ComponentWithUnknownFields {
  const id = overrides?.id || '1';
  const name = overrides?.name || 'Test Component';

  return {
    id,
    self: `https://api.tracker.yandex.net/v2/components/${id}`,
    name,
    queue: overrides?.queue || createQueueRef(),
    assignAuto: overrides?.assignAuto !== undefined ? overrides.assignAuto : false,
    description: overrides?.description,
    lead: overrides?.lead,
    ...overrides,
  };
}

/**
 * Создать компонент с руководителем
 *
 * @example
 * ```typescript
 * const component = createComponentWithLead({
 *   name: 'Frontend',
 *   lead: createUserRef({ display: 'Jane Smith' })
 * });
 * ```
 */
export function createComponentWithLead(
  overrides?: Partial<Component>
): ComponentWithUnknownFields {
  return createComponentFixture({
    lead: createUserRef({ id: 'user123', display: 'Component Lead' }),
    ...overrides,
  });
}

/**
 * Создать компонент с автоназначением
 *
 * @example
 * ```typescript
 * const component = createComponentWithAssignAuto({
 *   name: 'Mobile',
 *   lead: createUserRef({ display: 'Mobile Lead' })
 * });
 * ```
 */
export function createComponentWithAssignAuto(
  overrides?: Partial<Component>
): ComponentWithUnknownFields {
  return createComponentFixture({
    assignAuto: true,
    lead: createUserRef({ id: 'user456', display: 'Auto Assignee' }),
    ...overrides,
  });
}
