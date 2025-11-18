/**
 * Фикстуры для Queue DTO
 *
 * Используются в тестах для создания mock данных запросов и ответов API.
 */

import type {
  CreateQueueDto,
  UpdateQueueDto,
  GetQueuesDto,
  GetQueueDto,
  GetQueueFieldsDto,
  ManageQueueAccessDto,
} from '../../src/tracker_api/dto/index.js';

/**
 * Создать CreateQueueDto для тестов
 *
 * @example
 * ```typescript
 * // Создать DTO с дефолтными значениями
 * const dto = createCreateQueueDto();
 *
 * // Создать DTO с кастомными значениями
 * const dto = createCreateQueueDto({
 *   key: 'MYQUEUE',
 *   name: 'My Custom Queue',
 *   description: 'Custom description'
 * });
 * ```
 */
export function createCreateQueueDto(overrides?: Partial<CreateQueueDto>): CreateQueueDto {
  return {
    key: 'TEST',
    name: 'Test Queue',
    lead: 'test-user',
    defaultType: '1',
    defaultPriority: '3',
    ...overrides,
  };
}

/**
 * Создать UpdateQueueDto для тестов
 *
 * @example
 * ```typescript
 * const dto = createUpdateQueueDto({ name: 'Updated Queue Name' });
 * ```
 */
export function createUpdateQueueDto(overrides?: Partial<UpdateQueueDto>): UpdateQueueDto {
  return {
    name: 'Updated Queue Name',
    ...overrides,
  };
}

/**
 * Создать GetQueuesDto для тестов
 *
 * @example
 * ```typescript
 * const dto = createGetQueuesDto({ perPage: 100, page: 2 });
 * ```
 */
export function createGetQueuesDto(overrides?: Partial<GetQueuesDto>): GetQueuesDto {
  return {
    perPage: 50,
    page: 1,
    ...overrides,
  };
}

/**
 * Создать GetQueueDto для тестов
 *
 * @example
 * ```typescript
 * const dto = createGetQueueDto({ expand: 'projects' });
 * ```
 */
export function createGetQueueDto(overrides?: Partial<GetQueueDto>): GetQueueDto {
  return {
    ...overrides,
  };
}

/**
 * Создать GetQueueFieldsDto для тестов
 *
 * @example
 * ```typescript
 * const dto = createGetQueueFieldsDto();
 * ```
 */
export function createGetQueueFieldsDto(overrides?: Partial<GetQueueFieldsDto>): GetQueueFieldsDto {
  return {
    ...overrides,
  };
}

/**
 * Создать ManageQueueAccessDto для добавления прав доступа
 *
 * @example
 * ```typescript
 * const dto = createManageQueueAccessDto({
 *   action: 'add',
 *   role: 'team-member',
 *   subjects: ['user-123', 'user-456']
 * });
 * ```
 */
export function createManageQueueAccessDto(
  overrides?: Partial<ManageQueueAccessDto>
): ManageQueueAccessDto {
  return {
    action: 'add',
    role: 'team-member',
    subjects: ['user-1', 'user-2'],
    ...overrides,
  };
}

/**
 * Создать ManageQueueAccessDto для удаления прав доступа
 *
 * @example
 * ```typescript
 * const dto = createRemoveQueueAccessDto('team-member', ['user-123']);
 * ```
 */
export function createRemoveQueueAccessDto(
  role: ManageQueueAccessDto['role'],
  subjects: string[]
): ManageQueueAccessDto {
  return {
    action: 'remove',
    role,
    subjects,
  };
}

/**
 * Создать полный CreateQueueDto со всеми опциональными полями
 *
 * @example
 * ```typescript
 * const dto = createFullCreateQueueDto();
 * ```
 */
export function createFullCreateQueueDto(overrides?: Partial<CreateQueueDto>): CreateQueueDto {
  return createCreateQueueDto({
    description: 'Test Queue Description',
    issueTypes: ['1', '2', '3'],
    ...overrides,
  });
}

/**
 * Создать минимальный CreateQueueDto (только обязательные поля)
 *
 * @example
 * ```typescript
 * const dto = createMinimalCreateQueueDto('PROJ');
 * ```
 */
export function createMinimalCreateQueueDto(key = 'TEST'): CreateQueueDto {
  return {
    key,
    name: `${key} Queue`,
    lead: 'test-user',
    defaultType: '1',
    defaultPriority: '3',
  };
}

/**
 * Создать невалидный CreateQueueDto (для negative testing)
 *
 * @example
 * ```typescript
 * // Невалидный ключ (должен быть A-Z, 2-10 символов)
 * const invalidDto = createInvalidCreateQueueDto({ key: 'test' }); // lowercase
 * const invalidDto = createInvalidCreateQueueDto({ key: 'T' }); // too short
 * const invalidDto = createInvalidCreateQueueDto({ key: 'VERYLONGKEY123' }); // too long
 * ```
 */
export function createInvalidCreateQueueDto(overrides?: Partial<CreateQueueDto>): CreateQueueDto {
  return createCreateQueueDto({
    key: 'invalid-key', // Невалидный формат (lowercase и дефис)
    ...overrides,
  });
}
