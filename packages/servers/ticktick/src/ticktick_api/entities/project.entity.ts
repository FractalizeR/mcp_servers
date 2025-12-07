/**
 * TickTick Project Entity
 *
 * Represents a project (list) in TickTick.
 * Projects are containers for tasks.
 */

/**
 * View mode for a project
 */
export type ProjectViewMode = 'list' | 'kanban' | 'timeline';

/**
 * Project kind (task list or note list)
 */
export type ProjectKind = 'TASK' | 'NOTE';

/**
 * Core project interface with known fields
 */
export interface Project {
  /** Unique project identifier */
  id: string;
  /** Project name */
  name: string;
  /** Project color (hex code) */
  color?: string;
  /** Display mode (list, kanban, timeline) */
  viewMode?: ProjectViewMode;
  /** Project type (TASK or NOTE) */
  kind?: ProjectKind;
  /** Group ID if project belongs to a folder */
  groupId?: string;
  /** Sort order among projects */
  sortOrder?: number;
  /** Whether project is closed/archived */
  closed?: boolean;
  /** Last modification timestamp (ISO 8601) */
  modifiedTime?: string;
}

/**
 * Project with unknown fields for API response flexibility
 *
 * TickTick API may return additional fields not documented.
 * This interface preserves all fields while maintaining type safety.
 */
export interface ProjectWithUnknownFields extends Project {
  [key: string]: unknown;
}
