/**
 * Фикстуры для Project DTO
 *
 * Используются в тестах для создания mock данных DTO проектов.
 */

import type {
  CreateProjectDto,
  UpdateProjectDto,
  GetProjectsDto,
} from '../../src/tracker_api/dto/index.js';
import type { ProjectStatus } from '../../src/tracker_api/entities/index.js';

/**
 * Создать GetProjectsDto для тестов
 *
 * @example
 * ```typescript
 * const dto = createGetProjectsDto({ page: 2, perPage: 100 });
 * ```
 */
export function createGetProjectsDto(overrides?: Partial<GetProjectsDto>): GetProjectsDto {
  return {
    perPage: 50,
    page: 1,
    ...overrides,
  };
}

/**
 * Создать CreateProjectDto для тестов
 *
 * @example
 * ```typescript
 * const dto = createCreateProjectDto({ key: 'MYPROJ', name: 'My Project' });
 * ```
 */
export function createCreateProjectDto(overrides?: Partial<CreateProjectDto>): CreateProjectDto {
  return {
    key: 'TESTPROJ',
    name: 'Test Project',
    lead: 'testuser',
    ...overrides,
  };
}

/**
 * Создать CreateProjectDto с полной конфигурацией
 *
 * @example
 * ```typescript
 * const dto = createFullCreateProjectDto();
 * ```
 */
export function createFullCreateProjectDto(
  overrides?: Partial<CreateProjectDto>
): CreateProjectDto {
  return {
    key: 'TESTPROJ',
    name: 'Test Project',
    lead: 'testuser',
    status: 'in_progress' as ProjectStatus,
    description: 'Test project description',
    startDate: '2024-01-01',
    endDate: '2024-12-31',
    queueIds: ['QUEUE1', 'QUEUE2'],
    teamUserIds: ['user1', 'user2'],
    ...overrides,
  };
}

/**
 * Создать UpdateProjectDto для тестов
 *
 * @example
 * ```typescript
 * const dto = createUpdateProjectDto({ name: 'Updated Project' });
 * ```
 */
export function createUpdateProjectDto(overrides?: Partial<UpdateProjectDto>): UpdateProjectDto {
  return {
    name: 'Updated Project',
    ...overrides,
  };
}

/**
 * Создать UpdateProjectDto с полной конфигурацией
 *
 * @example
 * ```typescript
 * const dto = createFullUpdateProjectDto();
 * ```
 */
export function createFullUpdateProjectDto(
  overrides?: Partial<UpdateProjectDto>
): UpdateProjectDto {
  return {
    name: 'Updated Project',
    status: 'launched' as ProjectStatus,
    description: 'Updated description',
    startDate: '2024-02-01',
    endDate: '2024-11-30',
    queueIds: ['QUEUE1'],
    teamUserIds: ['user1'],
    ...overrides,
  };
}
