/**
 * Фабрики для создания DTO объектов в тестах
 *
 * ВАЖНО: Эти фабрики создают валидные DTO объекты для тестирования.
 * Используются для unit и integration тестов.
 */

import type {
  CreateIssueDto,
  UpdateIssueDto,
  SearchIssuesDto,
  FindIssuesInputDto,
  ExecuteTransitionDto,
} from './index.js';

/**
 * Создает минимальный валидный CreateIssueDto
 */
export function createMinimalCreateIssueDto(overrides?: Partial<CreateIssueDto>): CreateIssueDto {
  return {
    queue: 'TEST',
    summary: 'Test issue',
    ...overrides,
  };
}

/**
 * Создает полный CreateIssueDto со всеми полями
 */
export function createFullCreateIssueDto(overrides?: Partial<CreateIssueDto>): CreateIssueDto {
  return {
    queue: 'TEST',
    summary: 'Test issue',
    description: 'Test description',
    assignee: 'testuser',
    priority: 'normal',
    type: 'task',
    ...overrides,
  };
}

/**
 * Создает валидный UpdateIssueDto
 */
export function createUpdateIssueDto(overrides?: Partial<UpdateIssueDto>): UpdateIssueDto {
  return {
    summary: 'Updated summary',
    ...overrides,
  };
}

/**
 * Создает валидный SearchIssuesDto
 */
export function createSearchIssuesDto(overrides?: Partial<SearchIssuesDto>): SearchIssuesDto {
  return {
    queue: 'TEST',
    ...overrides,
  };
}

/**
 * Создает FindIssuesInputDto с query
 */
export function createFindIssuesByQuery(
  query: string,
  overrides?: Partial<FindIssuesInputDto>
): FindIssuesInputDto {
  return {
    query,
    ...overrides,
  };
}

/**
 * Создает FindIssuesInputDto с filter
 */
export function createFindIssuesByFilter(
  filter: Record<string, unknown>,
  overrides?: Partial<FindIssuesInputDto>
): FindIssuesInputDto {
  return {
    filter,
    ...overrides,
  };
}

/**
 * Создает FindIssuesInputDto с keys
 */
export function createFindIssuesByKeys(
  keys: string[],
  overrides?: Partial<FindIssuesInputDto>
): FindIssuesInputDto {
  return {
    keys,
    ...overrides,
  };
}

/**
 * Создает FindIssuesInputDto с queue
 */
export function createFindIssuesByQueue(
  queue: string,
  overrides?: Partial<FindIssuesInputDto>
): FindIssuesInputDto {
  return {
    queue,
    ...overrides,
  };
}

/**
 * Создает валидный ExecuteTransitionDto
 */
export function createExecuteTransitionDto(
  overrides?: Partial<ExecuteTransitionDto>
): ExecuteTransitionDto {
  return {
    comment: 'Transition comment',
    ...overrides,
  };
}

/**
 * Создает пустой ExecuteTransitionDto (все поля опциональны)
 */
export function createEmptyExecuteTransitionDto(): ExecuteTransitionDto {
  return {};
}
