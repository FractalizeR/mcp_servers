/**
 * Entities модуль - экспорт всех доменных типов
 */

// Utility types
export type { WithUnknownFields } from './types.js';

// Common types (shared across multiple APIs)
export type {
  PaginationParams,
  PaginationMeta,
  PaginatedResult,
} from './common/pagination.entity.js';
export type { UserRef, UserRefWithUnknownFields } from './common/user-ref.entity.js';
export type { QueueRef, QueueRefWithUnknownFields } from './common/queue-ref.entity.js';
export type { TimestampFields } from './common/timestamp.entity.js';

// User
export type { User, UserWithUnknownFields } from './user.entity.js';

// Queue
export type {
  Queue,
  QueueWithUnknownFields,
  QueueDictionaryRef,
  QueueIssueTypeConfig,
} from './queue.entity.js';

// Queue Field
export type {
  QueueField,
  QueueFieldWithUnknownFields,
  QueueFieldCategory,
} from './queue-field.entity.js';

// Field
export type {
  Field,
  FieldWithUnknownFields,
  FieldSchema,
  FieldOption,
  FieldOptionsProvider,
} from './field.entity.js';

// Queue Permission
export type {
  QueuePermission,
  QueuePermissionWithUnknownFields,
  QueueRole,
} from './queue-permission.entity.js';

// Status
export type { Status, StatusWithUnknownFields } from './status.entity.js';

// Priority
export type { Priority, PriorityWithUnknownFields } from './priority.entity.js';

// IssueType
export type { IssueType, IssueTypeWithUnknownFields } from './issue-type.entity.js';

// Issue
export type { Issue, IssueWithUnknownFields } from './issue.entity.js';

// Changelog
export type {
  ChangelogEntry,
  ChangelogEntryWithUnknownFields,
  ChangelogField,
} from './changelog.entity.js';

// Transition
export type { Transition, TransitionWithUnknownFields } from './transition.entity.js';

// Link
export type { Link, LinkWithUnknownFields, LinkRelationship } from './link.entity.js';

// LinkType
export type { LinkType, LinkTypeWithUnknownFields } from './link-type.entity.js';

// Attachment
export type { Attachment, AttachmentWithUnknownFields } from './attachment.entity.js';

// ChecklistItem
export type { ChecklistItem, ChecklistItemWithUnknownFields } from './checklist-item.entity.js';

// Component
export type { Component, ComponentWithUnknownFields } from './component.entity.js';

// Comment
export type { Comment, CommentWithUnknownFields, CommentAttachment } from './comment/index.js';

// Worklog
export type { Worklog, WorklogWithUnknownFields } from './worklog.entity.js';

// Project
export type { Project, ProjectWithUnknownFields, ProjectStatus } from './project.entity.js';

// Bulk Change
export type {
  BulkChangeOperation,
  BulkChangeOperationWithUnknownFields,
  BulkChangeStatus,
} from './bulk-change.entity.js';
export { TERMINAL_BULK_CHANGE_STATUSES, isTerminalBulkChangeStatus } from './bulk-change.entity.js';

// Board
export type {
  Board,
  BoardWithUnknownFields,
  BoardColumn,
  BoardFilter,
  CountryRef,
} from './board.entity.js';

// Sprint
export type { Sprint, SprintWithUnknownFields, SprintStatus, BoardRef } from './sprint.entity.js';

// Entity API (Goal/Project/Portfolio) — пакет 7.2.A
export type {
  EntityApiType,
  EntityApiRecord,
  EntityApiRecordWithUnknownFields,
  KeyResultItem,
  KeyResultItemWithUnknownFields,
  KeyResultDeadline,
  KeyResultProgress,
} from './entity-api.entity.js';

// Resolution (Administration) — пакет 7.2.B
export type { Resolution, ResolutionWithUnknownFields } from './resolution.entity.js';

// Saved Filter — пакет 7.2.B
export type {
  SavedFilter,
  SavedFilterWithUnknownFields,
  FilterSort,
} from './saved-filter.entity.js';

// Queue Local Field — пакет 7.2.B
export type {
  QueueLocalField,
  QueueLocalFieldWithUnknownFields,
} from './queue-local-field.entity.js';

// Entity Factories (runtime code for coverage)
export {
  createUser,
  createMinimalUser,
  createUserRef,
  createQueueDictionaryRef,
  createQueue,
  createFullQueue,
  createQueueField,
  createQueueFieldWithCategory,
  createQueuePermission,
  createStatus,
  createPriority,
  createIssueType,
  createMinimalIssue,
  createFullIssue,
  createSimpleTransition,
  createTransitionWithScreen,
  createChangelogField,
  createMinimalChangelogEntry,
  createFullChangelogEntry,
  createAttachment,
  createAttachmentWithThumbnail,
  createQueueRef,
  createMinimalProject,
  createFullProject,
} from './entity.factories.js';
