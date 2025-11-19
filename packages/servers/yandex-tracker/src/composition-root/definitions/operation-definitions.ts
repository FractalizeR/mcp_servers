/**
 * Определения всех Operations
 *
 * ВАЖНО: При добавлении новой Operation:
 * 1. Импортируй класс Operation
 * 2. Добавь его в массив OPERATION_CLASSES
 * 3. Всё остальное произойдёт автоматически (DI регистрация)
 */

import { PingOperation } from '@tracker_api/api_operations/user/ping.operation.js';
import {
  GetIssuesOperation,
  FindIssuesOperation,
  CreateIssueOperation,
  UpdateIssueOperation,
  GetIssueChangelogOperation,
  GetIssueTransitionsOperation,
  TransitionIssueOperation,
} from '@tracker_api/api_operations/issue/index.js';
import {
  GetQueuesOperation,
  GetQueueOperation,
  CreateQueueOperation,
  UpdateQueueOperation,
  GetQueueFieldsOperation,
  ManageQueueAccessOperation,
} from '@tracker_api/api_operations/queue/index.js';
import {
  GetComponentsOperation,
  CreateComponentOperation,
  UpdateComponentOperation,
  DeleteComponentOperation,
} from '@tracker_api/api_operations/component/index.js';
import {
  GetIssueLinksOperation,
  CreateLinkOperation,
  DeleteLinkOperation,
} from '@tracker_api/api_operations/link/index.js';
import {
  AddCommentOperation,
  GetCommentsOperation,
  EditCommentOperation,
  DeleteCommentOperation,
} from '@tracker_api/api_operations/comment/index.js';
import {
  GetAttachmentsOperation,
  UploadAttachmentOperation,
  DownloadAttachmentOperation,
  DeleteAttachmentOperation,
  GetThumbnailOperation,
} from '@tracker_api/api_operations/attachment/index.js';
import {
  GetChecklistOperation,
  AddChecklistItemOperation,
  UpdateChecklistItemOperation,
  DeleteChecklistItemOperation,
} from '@tracker_api/api_operations/checklist/index.js';
import {
  GetWorklogsOperation,
  AddWorklogOperation,
  UpdateWorklogOperation,
  DeleteWorklogOperation,
} from '@tracker_api/api_operations/worklog/index.js';
import {
  GetProjectsOperation,
  GetProjectOperation,
  CreateProjectOperation,
  UpdateProjectOperation,
  DeleteProjectOperation,
} from '@tracker_api/api_operations/project/index.js';
import {
  BulkUpdateIssuesOperation,
  BulkTransitionIssuesOperation,
  BulkMoveIssuesOperation,
  GetBulkChangeStatusOperation,
} from '@tracker_api/api_operations/bulk-change/index.js';
import {
  GetFieldsOperation,
  GetFieldOperation,
  CreateFieldOperation,
  UpdateFieldOperation,
  DeleteFieldOperation,
} from '@tracker_api/api_operations/field/index.js';

/**
 * Массив всех Operation классов в проекте
 *
 * КОНВЕНЦИЯ ИМЕНОВАНИЯ:
 * - Класс ДОЛЖЕН заканчиваться на "Operation"
 * - Symbol автоматически создаётся как Symbol.for(ClassName)
 * - Пример: PingOperation → Symbol.for('PingOperation')
 */
export const OPERATION_CLASSES = [
  PingOperation,
  GetIssuesOperation,
  FindIssuesOperation,
  CreateIssueOperation,
  UpdateIssueOperation,
  GetIssueChangelogOperation,
  GetIssueTransitionsOperation,
  TransitionIssueOperation,
  GetQueuesOperation,
  GetQueueOperation,
  CreateQueueOperation,
  UpdateQueueOperation,
  GetQueueFieldsOperation,
  ManageQueueAccessOperation,
  GetComponentsOperation,
  CreateComponentOperation,
  UpdateComponentOperation,
  DeleteComponentOperation,
  GetIssueLinksOperation,
  CreateLinkOperation,
  DeleteLinkOperation,
  AddCommentOperation,
  GetCommentsOperation,
  EditCommentOperation,
  DeleteCommentOperation,
  GetAttachmentsOperation,
  UploadAttachmentOperation,
  DownloadAttachmentOperation,
  DeleteAttachmentOperation,
  GetThumbnailOperation,
  GetChecklistOperation,
  AddChecklistItemOperation,
  UpdateChecklistItemOperation,
  DeleteChecklistItemOperation,
  GetWorklogsOperation,
  AddWorklogOperation,
  UpdateWorklogOperation,
  DeleteWorklogOperation,
  GetProjectsOperation,
  GetProjectOperation,
  CreateProjectOperation,
  UpdateProjectOperation,
  DeleteProjectOperation,
  BulkUpdateIssuesOperation,
  BulkTransitionIssuesOperation,
  BulkMoveIssuesOperation,
  GetBulkChangeStatusOperation,
  GetFieldsOperation,
  GetFieldOperation,
  CreateFieldOperation,
  UpdateFieldOperation,
  DeleteFieldOperation,
] as const;

/**
 * Тип для Operation классов (type-safe)
 */
export type OperationClass = (typeof OPERATION_CLASSES)[number];
