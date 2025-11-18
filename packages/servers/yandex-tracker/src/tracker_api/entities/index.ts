/**
 * Entities модуль - экспорт всех доменных типов
 */

// Utility types
export type { WithUnknownFields } from './types.js';

// Common types (shared across multiple APIs)
export type { PaginationParams, PaginatedResponse } from './common/pagination.entity.js';
export type { UserRef, UserRefWithUnknownFields } from './common/user-ref.entity.js';
export type { TimestampFields } from './common/timestamp.entity.js';

// User
export type { User, UserWithUnknownFields } from './user.entity.js';

// Queue
export type { Queue, QueueWithUnknownFields } from './queue.entity.js';

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

// Entity Factories (runtime code for coverage)
export {
  createUser,
  createMinimalUser,
  createQueue,
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
} from './entity.factories.js';
