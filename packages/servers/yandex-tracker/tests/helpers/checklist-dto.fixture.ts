/**
 * Фикстуры для Checklist DTO (Input/Output)
 *
 * Используются в тестах для создания mock данных DTO чеклистов.
 */

import type { AddChecklistItemInput } from '../../src/tracker_api/dto/checklist/add-checklist-item.input.js';
import type { UpdateChecklistItemInput } from '../../src/tracker_api/dto/checklist/update-checklist-item.input.js';
import type {
  ChecklistItemOutput,
  ChecklistOutput,
} from '../../src/tracker_api/dto/checklist/checklist.output.js';
import {
  createChecklistItemFixture,
  createChecklistItemListFixture,
} from './checklist-item.fixture.js';

/**
 * Создать AddChecklistItemInput для тестов
 *
 * @example
 * ```typescript
 * // Создать базовый input
 * const input = createAddChecklistItemInputFixture();
 *
 * // Создать input с assignee и deadline
 * const fullInput = createAddChecklistItemInputFixture({
 *   text: 'Important task',
 *   checked: false,
 *   assignee: 'user123',
 *   deadline: '2025-12-31T23:59:59.000Z'
 * });
 * ```
 */
export function createAddChecklistItemInputFixture(
  overrides?: Partial<AddChecklistItemInput>
): AddChecklistItemInput {
  return {
    text: 'New checklist item',
    checked: false,
    ...overrides,
  };
}

/**
 * Создать AddChecklistItemInput с assignee
 *
 * @example
 * ```typescript
 * const input = createAddChecklistItemInputWithAssigneeFixture();
 * ```
 */
export function createAddChecklistItemInputWithAssigneeFixture(
  overrides?: Partial<AddChecklistItemInput>
): AddChecklistItemInput {
  return createAddChecklistItemInputFixture({
    assignee: 'user123',
    ...overrides,
  });
}

/**
 * Создать AddChecklistItemInput с deadline
 *
 * @example
 * ```typescript
 * const input = createAddChecklistItemInputWithDeadlineFixture();
 * ```
 */
export function createAddChecklistItemInputWithDeadlineFixture(
  overrides?: Partial<AddChecklistItemInput>
): AddChecklistItemInput {
  return createAddChecklistItemInputFixture({
    deadline: new Date('2025-12-31T23:59:59.000Z').toISOString(),
    ...overrides,
  });
}

/**
 * Создать полный AddChecklistItemInput (все поля)
 *
 * @example
 * ```typescript
 * const input = createFullAddChecklistItemInputFixture();
 * ```
 */
export function createFullAddChecklistItemInputFixture(
  overrides?: Partial<AddChecklistItemInput>
): AddChecklistItemInput {
  return createAddChecklistItemInputFixture({
    checked: false,
    assignee: 'user123',
    deadline: new Date('2025-12-31T23:59:59.000Z').toISOString(),
    ...overrides,
  });
}

/**
 * Создать UpdateChecklistItemInput для тестов
 *
 * @example
 * ```typescript
 * // Обновить только текст
 * const input = createUpdateChecklistItemInputFixture();
 *
 * // Обновить статус checked
 * const checkedInput = createUpdateChecklistItemInputFixture({
 *   checked: true
 * });
 *
 * // Обновить assignee и deadline
 * const fullInput = createUpdateChecklistItemInputFixture({
 *   assignee: 'user456',
 *   deadline: '2025-06-30T23:59:59.000Z'
 * });
 * ```
 */
export function createUpdateChecklistItemInputFixture(
  overrides?: Partial<UpdateChecklistItemInput>
): UpdateChecklistItemInput {
  return {
    text: 'Updated checklist item text',
    ...overrides,
  };
}

/**
 * Создать UpdateChecklistItemInput для отметки выполнения
 *
 * @example
 * ```typescript
 * const input = createCheckChecklistItemInputFixture();
 * ```
 */
export function createCheckChecklistItemInputFixture(checked = true): UpdateChecklistItemInput {
  return {
    checked,
  };
}

/**
 * Создать ChecklistItemOutput для тестов
 *
 * @example
 * ```typescript
 * const output = createChecklistItemOutputFixture();
 * ```
 */
export function createChecklistItemOutputFixture(
  overrides?: Partial<ChecklistItemOutput>
): ChecklistItemOutput {
  return createChecklistItemFixture(overrides);
}

/**
 * Создать ChecklistOutput (массив элементов) для тестов
 *
 * @example
 * ```typescript
 * const output = createChecklistOutputFixture(5);
 * // Вернёт массив из 5 элементов чеклиста
 * ```
 */
export function createChecklistOutputFixture(
  count: number,
  baseOverrides?: Partial<ChecklistItemOutput>
): ChecklistOutput {
  return createChecklistItemListFixture(count, baseOverrides);
}

/**
 * Создать пустой ChecklistOutput для тестов
 *
 * @example
 * ```typescript
 * const emptyOutput = createEmptyChecklistOutputFixture();
 * // Вернёт []
 * ```
 */
export function createEmptyChecklistOutputFixture(): ChecklistOutput {
  return [];
}
