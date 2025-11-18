/**
 * Фикстуры для Component DTO
 *
 * Используются в тестах для создания mock данных DTO компонентов.
 */

import type {
  CreateComponentDto,
  UpdateComponentDto,
} from '../../src/tracker_api/dto/component/index.js';

/**
 * Создать CreateComponentDto для тестов
 *
 * @example
 * ```typescript
 * // Создать DTO с дефолтными значениями
 * const dto = createCreateComponentDto();
 *
 * // Создать DTO с кастомными значениями
 * const dto = createCreateComponentDto({
 *   name: 'Backend',
 *   description: 'Backend services',
 *   assignAuto: true,
 *   lead: 'user-login'
 * });
 * ```
 */
export function createCreateComponentDto(
  overrides?: Partial<CreateComponentDto>
): CreateComponentDto {
  return {
    name: overrides?.name || 'Test Component',
    description: overrides?.description,
    lead: overrides?.lead,
    assignAuto: overrides?.assignAuto,
    ...overrides,
  };
}

/**
 * Создать минимальный CreateComponentDto для тестов (только обязательные поля)
 *
 * @example
 * ```typescript
 * const dto = createMinimalCreateComponentDto({ name: 'Backend' });
 * ```
 */
export function createMinimalCreateComponentDto(
  overrides?: Partial<CreateComponentDto>
): CreateComponentDto {
  return {
    name: overrides?.name || 'Minimal Component',
    ...overrides,
  };
}

/**
 * Создать полный CreateComponentDto для тестов (все поля заполнены)
 *
 * @example
 * ```typescript
 * const dto = createFullCreateComponentDto();
 * ```
 */
export function createFullCreateComponentDto(
  overrides?: Partial<CreateComponentDto>
): CreateComponentDto {
  return {
    name: overrides?.name || 'Full Component',
    description: overrides?.description || 'Full component description',
    lead: overrides?.lead || 'user-login',
    assignAuto: overrides?.assignAuto !== undefined ? overrides.assignAuto : true,
    ...overrides,
  };
}

/**
 * Создать UpdateComponentDto для тестов
 *
 * @example
 * ```typescript
 * // Обновить только название
 * const dto = createUpdateComponentDto({ name: 'Updated Name' });
 *
 * // Обновить несколько полей
 * const dto = createUpdateComponentDto({
 *   name: 'New Name',
 *   description: 'New description',
 *   assignAuto: false
 * });
 * ```
 */
export function createUpdateComponentDto(
  overrides?: Partial<UpdateComponentDto>
): UpdateComponentDto {
  return {
    ...overrides,
  };
}

/**
 * Создать невалидный CreateComponentDto для тестов
 * (например, пустое название)
 *
 * @example
 * ```typescript
 * const dto = createInvalidCreateComponentDto({ name: '' });
 * ```
 */
export function createInvalidCreateComponentDto(
  overrides?: Partial<CreateComponentDto>
): CreateComponentDto {
  return {
    name: '', // невалидное пустое название
    ...overrides,
  };
}
