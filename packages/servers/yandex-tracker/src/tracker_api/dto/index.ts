/**
 * Data Transfer Objects (DTO)
 *
 * ВАЖНО: DTO используются для type-safe отправки данных в API.
 * Содержат known поля + index signature [key: string]: unknown
 * для поддержки кастомных полей Яндекс.Трекера.
 */
export type {
  CreateIssueDto,
  UpdateIssueDto,
  SearchIssuesDto,
  FindIssuesInputDto,
  ExecuteTransitionDto,
} from './issue/index.js';

export type { CreateLinkDto } from './link/index.js';

// DTO Factories (runtime code for coverage)
export {
  createMinimalCreateIssueDto,
  createFullCreateIssueDto,
  createUpdateIssueDto,
  createSearchIssuesDto,
  createFindIssuesByQuery,
  createFindIssuesByFilter,
  createFindIssuesByKeys,
  createFindIssuesByQueue,
  createExecuteTransitionDto,
  createEmptyExecuteTransitionDto,
} from './issue/index.js';
