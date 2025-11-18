/**
 * Project DTO модуль - экспорт всех DTO для работы с проектами
 */

// Input DTO
export type { GetProjectsDto } from './get-projects.dto.js';
export type { GetProjectDto } from './get-project.dto.js';
export type { CreateProjectDto } from './create-project.dto.js';
export type { UpdateProjectDto } from './update-project.dto.js';

// Output DTO
export type { ProjectOutput } from './project.output.js';
export type { ProjectsListOutput } from './projects-list.output.js';

// DTO Factories (runtime code for coverage)
export {
  createGetProjectsDto,
  createGetProjectDto,
  createMinimalCreateProjectDto,
  createFullCreateProjectDto,
  createUpdateProjectDto,
  createFullUpdateProjectDto,
} from './dto.factories.js';
