/**
 * Фабрики для создания Project DTO объектов в тестах
 *
 * ВАЖНО: Эти фабрики создают валидные DTO объекты для тестирования.
 * Используются для unit и integration тестов.
 */

import type { GetProjectsDto } from './get-projects.dto.js';
import type { GetProjectDto } from './get-project.dto.js';
import type { CreateProjectDto } from './create-project.dto.js';
import type { UpdateProjectDto } from './update-project.dto.js';

/**
 * Создает валидный GetProjectsDto (пустой - все параметры опциональны)
 */
export function createGetProjectsDto(overrides?: Partial<GetProjectsDto>): GetProjectsDto {
  return {
    perPage: 50,
    page: 1,
    ...overrides,
  };
}

/**
 * Создает валидный GetProjectDto
 */
export function createGetProjectDto(overrides?: Partial<GetProjectDto>): GetProjectDto {
  return {
    ...overrides,
  };
}

/**
 * Создает минимальный валидный CreateProjectDto
 */
export function createMinimalCreateProjectDto(
  overrides?: Partial<CreateProjectDto>
): CreateProjectDto {
  return {
    key: 'TESTPROJ',
    name: 'Test Project',
    lead: 'testuser',
    ...overrides,
  };
}

/**
 * Создает полный CreateProjectDto со всеми полями
 */
export function createFullCreateProjectDto(
  overrides?: Partial<CreateProjectDto>
): CreateProjectDto {
  return {
    key: 'TESTPROJ',
    name: 'Test Project',
    lead: 'testuser',
    status: 'in_progress',
    description: 'Test Project Description',
    startDate: '2024-01-01',
    endDate: '2024-12-31',
    queueIds: ['QUEUE1', 'QUEUE2'],
    teamUserIds: ['user1', 'user2'],
    ...overrides,
  };
}

/**
 * Создает валидный UpdateProjectDto
 */
export function createUpdateProjectDto(overrides?: Partial<UpdateProjectDto>): UpdateProjectDto {
  return {
    name: 'Updated Project Name',
    ...overrides,
  };
}

/**
 * Создает полный UpdateProjectDto со всеми полями
 */
export function createFullUpdateProjectDto(
  overrides?: Partial<UpdateProjectDto>
): UpdateProjectDto {
  return {
    name: 'Updated Project Name',
    status: 'launched',
    description: 'Updated Description',
    startDate: '2024-02-01',
    endDate: '2024-11-30',
    queueIds: ['QUEUE1'],
    teamUserIds: ['user1'],
    ...overrides,
  };
}
