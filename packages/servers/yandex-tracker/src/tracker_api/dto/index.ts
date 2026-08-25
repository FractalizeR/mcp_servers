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

// Link DTO
export type { CreateLinkDto } from './link/index.js';

// Attachment DTO
export type {
  UploadAttachmentInput,
  DownloadAttachmentInput,
  AttachmentOutput,
  AttachmentsListOutput,
  DownloadAttachmentOutput,
} from './attachment/index.js';

// Component DTO
export type {
  CreateComponentDto,
  UpdateComponentDto,
  ComponentOutput,
  ComponentsListOutput,
} from './component/index.js';

// Comment DTO
export type {
  AddCommentInput,
  AddCommentBatchItem,
  EditCommentInput,
  GetCommentsInput,
  CommentOutput,
  CommentsListOutput,
} from './comment/index.js';

// Field DTO
export type {
  CreateFieldDto,
  UpdateFieldDto,
  FieldOutput,
  FieldsListOutput,
} from './field/index.js';

// Checklist DTO
export type {
  AddChecklistItemInput,
  UpdateChecklistItemInput,
  ChecklistItemOutput,
  ChecklistOutput,
} from './checklist/index.js';

// Worklog DTO
export type {
  AddWorklogInput,
  UpdateWorklogInput,
  WorklogOutput,
  WorklogsListOutput,
  SearchWorklogDto,
} from './worklog/index.js';

// Project DTO
export type {
  GetProjectsDto,
  GetProjectDto,
  CreateProjectDto,
  UpdateProjectDto,
  ProjectOutput,
  ProjectsListOutput,
} from './project/index.js';

// Bulk Change DTO
export type {
  BulkUpdateIssuesInputDto,
  BulkTransitionIssuesInputDto,
  BulkMoveIssuesInputDto,
} from './bulk-change/index.js';

// Board DTO
export type {
  GetBoardsDto,
  GetBoardDto,
  CreateBoardDto,
  CreateBoardColumnDto,
  UpdateBoardDto,
  UpdateBoardFilterDto,
  DeleteBoardDto,
  BoardOutput,
  BoardsListOutput,
} from './board/index.js';

// Sprint DTO
export type {
  GetSprintsDto,
  GetSprintDto,
  CreateSprintDto,
  UpdateSprintDto,
  SprintOutput,
  SprintsListOutput,
  ManageSprintLifecycleDto,
  SprintLifecycleAction,
} from './sprint/index.js';

// User DTO — пакет 7.2.A
export type { FindUsersDto } from './user/index.js';

// Filter DTO — пакет 7.2.B
export type { FilterSortDto, CreateFilterDto, UpdateFilterDto } from './filter/index.js';

// Board Column DTO — пакет 7.2.B
export type {
  GetBoardColumnsDto,
  CreateStandaloneBoardColumnDto,
  UpdateBoardColumnDto,
  DeleteBoardColumnDto,
} from './board-column/index.js';

// Queue Local Field DTO — пакет 7.2.B
export type {
  GetQueueLocalFieldsDto,
  CreateQueueLocalFieldDto,
  UpdateQueueLocalFieldDto,
} from './queue-local-field/index.js';

// Entity API DTO (Goal/Project/Portfolio) — пакет 7.2.A
export type {
  FindEntitiesDto,
  GetEntityDto,
  CreateEntityDto,
  UpdateEntityDto,
  DeleteEntityDto,
  KeyResultItemInputDto,
  GetGoalKeyResultsDto,
  AddGoalKeyResultDto,
  SetGoalKeyResultsDto,
  ClearGoalKeyResultsDto,
  EntityApiOutput,
} from './entity-api/index.js';

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

export {
  // Project factories
  createGetProjectsDto,
  createGetProjectDto,
  createMinimalCreateProjectDto,
  createFullCreateProjectDto,
  createUpdateProjectDto,
  createFullUpdateProjectDto,
} from './project/index.js';
