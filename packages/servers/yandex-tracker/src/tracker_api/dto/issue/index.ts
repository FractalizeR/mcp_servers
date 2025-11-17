/**
 * DTO для работы с задачами (Issue)
 */
export type { CreateIssueDto } from './create-issue.dto.js';
export type { UpdateIssueDto } from './update-issue.dto.js';
export type { SearchIssuesDto } from './search-issues.dto.js';
export type { FindIssuesInputDto } from './find-issues-input.dto.js';
export type { ExecuteTransitionDto } from './execute-transition.dto.js';

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
} from './dto.factories.js';
