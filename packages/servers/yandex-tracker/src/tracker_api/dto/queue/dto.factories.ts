/**
 * Фабрики для создания Queue DTO объектов в тестах
 *
 * ВАЖНО: Эти фабрики создают валидные DTO объекты для тестирования.
 * Используются для unit и integration тестов.
 */

import type { GetQueuesDto } from './get-queues.dto.js';
import type { GetQueueDto } from './get-queue.dto.js';
import type { CreateQueueDto } from './create-queue.dto.js';
import type { UpdateQueueDto } from './update-queue.dto.js';
import type { GetQueueFieldsDto } from './get-queue-fields.dto.js';
import type { ManageQueueAccessDto } from './manage-queue-access.dto.js';

/**
 * Создает валидный GetQueuesDto (пустой - все параметры опциональны)
 */
export function createGetQueuesDto(overrides?: Partial<GetQueuesDto>): GetQueuesDto {
  return {
    perPage: 50,
    page: 1,
    ...overrides,
  };
}

/**
 * Создает валидный GetQueueDto
 */
export function createGetQueueDto(overrides?: Partial<GetQueueDto>): GetQueueDto {
  return {
    queueId: 'TEST',
    ...overrides,
  };
}

/**
 * Создает минимальный валидный CreateQueueDto
 */
export function createMinimalCreateQueueDto(overrides?: Partial<CreateQueueDto>): CreateQueueDto {
  return {
    key: 'TESTQ',
    name: 'Test Queue',
    lead: 'testuser',
    defaultType: '1',
    defaultPriority: '2',
    ...overrides,
  };
}

/**
 * Создает полный CreateQueueDto со всеми полями
 */
export function createFullCreateQueueDto(overrides?: Partial<CreateQueueDto>): CreateQueueDto {
  return {
    key: 'TESTQ',
    name: 'Test Queue',
    description: 'Test Queue Description',
    lead: 'testuser',
    defaultType: '1',
    defaultPriority: '2',
    issueTypes: ['1', '2', '3'],
    ...overrides,
  };
}

/**
 * Создает валидный UpdateQueueDto
 */
export function createUpdateQueueDto(overrides?: Partial<UpdateQueueDto>): UpdateQueueDto {
  return {
    name: 'Updated Queue Name',
    ...overrides,
  };
}

/**
 * Создает валидный GetQueueFieldsDto
 * Note: Похож на createGetQueueDto, но создает разные типы
 */
// eslint-disable-next-line sonarjs/no-identical-functions
export function createGetQueueFieldsDto(overrides?: Partial<GetQueueFieldsDto>): GetQueueFieldsDto {
  return {
    queueId: 'TEST',
    ...overrides,
  };
}

/**
 * Создает валидный ManageQueueAccessDto для добавления пользователей
 */
export function createAddQueueAccessDto(
  overrides?: Partial<ManageQueueAccessDto>
): ManageQueueAccessDto {
  return {
    role: 'team-member',
    subjects: ['user123', 'user456'],
    action: 'add',
    ...overrides,
  };
}

/**
 * Создает валидный ManageQueueAccessDto для удаления пользователей
 */
export function createRemoveQueueAccessDto(
  overrides?: Partial<ManageQueueAccessDto>
): ManageQueueAccessDto {
  return {
    role: 'team-member',
    subjects: ['user123'],
    action: 'remove',
    ...overrides,
  };
}
