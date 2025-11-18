/**
 * Data Transfer Objects (DTO)
 *
 * ВАЖНО: DTO используются для type-safe отправки данных в API.
 * Содержат known поля + index signature [key: string]: unknown
 * для поддержки кастомных полей Яндекс.Трекера.
 */

// Issue DTO
export type {
  CreateIssueDto,
  UpdateIssueDto,
  SearchIssuesDto,
  FindIssuesInputDto,
  ExecuteTransitionDto,
} from './issue/index.js';

// Queue DTO
export type {
  GetQueuesDto,
  GetQueueDto,
  CreateQueueDto,
  UpdateQueueDto,
  GetQueueFieldsDto,
  ManageQueueAccessDto,
  AccessAction,
  QueueOutput,
  QueuesListOutput,
  QueueFieldsOutput,
  QueuePermissionsOutput,
} from './queue/index.js';

// DTO Factories (runtime code for coverage)
export {
  // Issue factories
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

export {
  // Queue factories
  createGetQueuesDto,
  createGetQueueDto,
  createMinimalCreateQueueDto,
  createFullCreateQueueDto,
  createUpdateQueueDto,
  createGetQueueFieldsDto,
  createAddQueueAccessDto,
  createRemoveQueueAccessDto,
} from './queue/index.js';
