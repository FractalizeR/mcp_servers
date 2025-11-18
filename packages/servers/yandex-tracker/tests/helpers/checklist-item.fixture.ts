/**
 * Фикстуры для ChecklistItem entity
 *
 * Используются в тестах для создания mock данных элементов чеклиста.
 */

import type { ChecklistItem } from '../../src/tracker_api/entities/checklist-item.entity.js';
import { createUserRef } from './common-fixtures.js';

/**
 * Создать ChecklistItem для тестов
 *
 * @example
 * ```typescript
 * // Создать элемент с дефолтными значениями
 * const item = createChecklistItemFixture();
 *
 * // Создать выполненный элемент
 * const completedItem = createChecklistItemFixture({
 *   checked: true
 * });
 *
 * // Создать элемент с assignee и deadline
 * const assignedItem = createChecklistItemFixture({
 *   assignee: createUserRef({ id: 'user123', display: 'John Doe' }),
 *   deadline: '2025-12-31T23:59:59.000Z'
 * });
 * ```
 */
export function createChecklistItemFixture(overrides?: Partial<ChecklistItem>): ChecklistItem {
  return {
    id: 'checklist-item-123',
    text: 'Test checklist item',
    checked: false,
    ...overrides,
  };
}

/**
 * Создать выполненный ChecklistItem для тестов
 *
 * @example
 * ```typescript
 * const completedItem = createCompletedChecklistItemFixture();
 * ```
 */
export function createCompletedChecklistItemFixture(
  overrides?: Partial<ChecklistItem>
): ChecklistItem {
  return createChecklistItemFixture({
    checked: true,
    ...overrides,
  });
}

/**
 * Создать ChecklistItem с assignee для тестов
 *
 * @example
 * ```typescript
 * const assignedItem = createAssignedChecklistItemFixture();
 * // Или с кастомным assignee
 * const customAssigned = createAssignedChecklistItemFixture({
 *   assignee: createUserRef({ id: 'user456', display: 'Jane Smith' })
 * });
 * ```
 */
export function createAssignedChecklistItemFixture(
  overrides?: Partial<ChecklistItem>
): ChecklistItem {
  return createChecklistItemFixture({
    assignee: createUserRef(),
    ...overrides,
  });
}

/**
 * Создать ChecklistItem с deadline для тестов
 *
 * @example
 * ```typescript
 * const itemWithDeadline = createChecklistItemWithDeadlineFixture();
 * // Или с кастомным deadline
 * const customDeadline = createChecklistItemWithDeadlineFixture({
 *   deadline: '2025-06-30T23:59:59.000Z'
 * });
 * ```
 */
export function createChecklistItemWithDeadlineFixture(
  overrides?: Partial<ChecklistItem>
): ChecklistItem {
  return createChecklistItemFixture({
    deadline: new Date('2025-12-31T23:59:59.000Z').toISOString(),
    ...overrides,
  });
}

/**
 * Создать ChecklistItem с assignee и deadline для тестов
 *
 * @example
 * ```typescript
 * const fullItem = createFullChecklistItemFixture();
 * ```
 */
export function createFullChecklistItemFixture(overrides?: Partial<ChecklistItem>): ChecklistItem {
  return createChecklistItemFixture({
    assignee: createUserRef(),
    deadline: new Date('2025-12-31T23:59:59.000Z').toISOString(),
    ...overrides,
  });
}

/**
 * Создать массив ChecklistItem для тестов
 *
 * @example
 * ```typescript
 * const items = createChecklistItemListFixture(5);
 * // Вернёт массив из 5 элементов чеклиста с уникальными id
 *
 * // Можно задать базовые параметры
 * const checkedItems = createChecklistItemListFixture(3, { checked: true });
 * ```
 */
export function createChecklistItemListFixture(
  count: number,
  baseOverrides?: Partial<ChecklistItem>
): ChecklistItem[] {
  return Array.from({ length: count }, (_, index) =>
    createChecklistItemFixture({
      id: `checklist-item-${100 + index}`,
      text: `Checklist item ${index + 1}`,
      ...baseOverrides,
    })
  );
}

/**
 * Создать ChecklistItem с минимальными обязательными полями
 * (полезно для negative testing)
 *
 * @example
 * ```typescript
 * const minimal = createMinimalChecklistItemFixture();
 * ```
 */
export function createMinimalChecklistItemFixture(id = 'checklist-item-minimal'): ChecklistItem {
  return {
    id,
    text: 'Minimal checklist item',
    checked: false,
  };
}
