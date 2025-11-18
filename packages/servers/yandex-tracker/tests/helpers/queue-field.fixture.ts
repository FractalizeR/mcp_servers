/**
 * Фикстуры для QueueField entity
 *
 * Используются в тестах для создания mock данных полей очереди.
 */

import type {
  QueueField,
  QueueFieldWithUnknownFields,
  QueueFieldCategory,
} from '../../src/tracker_api/entities/queue-field.entity.js';

/**
 * Создать QueueFieldCategory для тестов
 *
 * @example
 * ```typescript
 * const category = createQueueFieldCategory({ id: 'system', display: 'System Fields' });
 * ```
 */
export function createQueueFieldCategory(
  overrides?: Partial<QueueFieldCategory>
): QueueFieldCategory {
  return {
    id: 'custom',
    display: 'Custom Fields',
    ...overrides,
  };
}

/**
 * Создать QueueField для тестов
 *
 * @example
 * ```typescript
 * // Создать поле с дефолтными значениями
 * const field = createQueueFieldFixture();
 *
 * // Создать обязательное строковое поле
 * const field = createQueueFieldFixture({
 *   key: 'description',
 *   name: 'Description',
 *   required: true,
 *   type: 'string'
 * });
 *
 * // Создать поле для выбора пользователя
 * const field = createQueueFieldFixture({
 *   key: 'assignee',
 *   name: 'Assignee',
 *   type: 'user',
 *   category: createQueueFieldCategory({ id: 'system', display: 'System' })
 * });
 * ```
 */
export function createQueueFieldFixture(
  overrides?: Partial<QueueField>
): QueueFieldWithUnknownFields {
  const key = overrides?.key || 'customField1';
  const id = overrides?.id || `field-${key}`;

  return {
    id,
    key,
    name: 'Custom Field 1',
    required: false,
    type: 'string',
    ...overrides,
  };
}

/**
 * Создать QueueField с минимальными обязательными полями
 *
 * @example
 * ```typescript
 * const minimal = createMinimalQueueFieldFixture('priority');
 * ```
 */
export function createMinimalQueueFieldFixture(key = 'customField'): QueueField {
  return {
    id: `field-${key}`,
    key,
    name: key.charAt(0).toUpperCase() + key.slice(1),
    required: false,
    type: 'string',
  };
}

/**
 * Создать системное поле очереди
 *
 * @example
 * ```typescript
 * const systemField = createSystemQueueFieldFixture({
 *   key: 'status',
 *   name: 'Status',
 *   type: 'select'
 * });
 * ```
 */
export function createSystemQueueFieldFixture(
  overrides?: Partial<QueueField>
): QueueFieldWithUnknownFields {
  return createQueueFieldFixture({
    category: createQueueFieldCategory({
      id: 'system',
      display: 'System Fields',
    }),
    ...overrides,
  });
}

/**
 * Создать обязательное поле очереди
 *
 * @example
 * ```typescript
 * const requiredField = createRequiredQueueFieldFixture({
 *   key: 'summary',
 *   name: 'Summary'
 * });
 * ```
 */
export function createRequiredQueueFieldFixture(
  overrides?: Partial<QueueField>
): QueueFieldWithUnknownFields {
  return createQueueFieldFixture({
    required: true,
    ...overrides,
  });
}

/**
 * Создать массив QueueField для тестов
 *
 * @example
 * ```typescript
 * const fields = createQueueFieldListFixture(5);
 * // Вернёт массив из 5 полей с уникальными ключами
 * ```
 */
export function createQueueFieldListFixture(
  count: number,
  baseOverrides?: Partial<QueueField>
): QueueFieldWithUnknownFields[] {
  return Array.from({ length: count }, (_, index) => {
    const key = `customField${index + 1}`;
    return createQueueFieldFixture({
      id: `field-${index + 1}`,
      key,
      name: `Custom Field ${index + 1}`,
      ...baseOverrides,
    });
  });
}

/**
 * Создать стандартный набор системных полей очереди
 *
 * @example
 * ```typescript
 * const systemFields = createStandardSystemFields();
 * ```
 */
export function createStandardSystemFields(): QueueFieldWithUnknownFields[] {
  return [
    createSystemQueueFieldFixture({
      id: 'field-summary',
      key: 'summary',
      name: 'Summary',
      required: true,
      type: 'string',
    }),
    createSystemQueueFieldFixture({
      id: 'field-description',
      key: 'description',
      name: 'Description',
      required: false,
      type: 'string',
    }),
    createSystemQueueFieldFixture({
      id: 'field-status',
      key: 'status',
      name: 'Status',
      required: true,
      type: 'select',
    }),
    createSystemQueueFieldFixture({
      id: 'field-assignee',
      key: 'assignee',
      name: 'Assignee',
      required: false,
      type: 'user',
    }),
    createSystemQueueFieldFixture({
      id: 'field-priority',
      key: 'priority',
      name: 'Priority',
      required: true,
      type: 'select',
    }),
  ];
}
