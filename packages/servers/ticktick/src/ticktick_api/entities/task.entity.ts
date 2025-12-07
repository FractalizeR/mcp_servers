/**
 * TickTick Task Entity
 *
 * Represents a task in TickTick.
 * Tasks belong to projects and can have subtasks (checklist items).
 */

/**
 * Checklist item (subtask) within a task
 */
export interface ChecklistItem {
  /** Unique checklist item identifier */
  id: string;
  /** Item title/description */
  title: string;
  /** Completion status: 0=uncompleted, 1=completed */
  status: number;
  /** Sort order within the checklist */
  sortOrder?: number;
}

/**
 * Task priority levels
 * 0 = none, 1 = low, 3 = medium, 5 = high
 */
export type TaskPriority = 0 | 1 | 3 | 5;

/**
 * Task completion status
 * 0 = uncompleted, 2 = completed
 */
export type TaskStatus = 0 | 2;

/**
 * Task content type
 */
export type TaskKind = 'TEXT' | 'CHECKLIST';

/**
 * Core task interface with known fields
 */
export interface Task {
  /** Unique task identifier */
  id: string;
  /** Project ID this task belongs to */
  projectId: string;
  /** Task title */
  title: string;
  /** Task description (rich text) */
  content?: string;
  /** Task description (plain text, alternative to content) */
  desc?: string;
  /** Priority: 0=none, 1=low, 3=medium, 5=high */
  priority: number;
  /** Status: 0=uncompleted, 2=completed */
  status: number;
  /** Due date (ISO 8601) */
  dueDate?: string;
  /** Start date (ISO 8601) */
  startDate?: string;
  /** Timezone identifier (e.g., 'Europe/Moscow') */
  timeZone?: string;
  /** Whether the task spans the whole day */
  isAllDay?: boolean;
  /** Reminders in iCalendar format (e.g., 'TRIGGER:P0DT9H0M0S') */
  reminders?: string[];
  /** Recurrence rule in iCalendar format (e.g., 'RRULE:FREQ=DAILY') */
  repeatFlag?: string;
  /** Task tags */
  tags?: string[];
  /** Subtasks/checklist items */
  items?: ChecklistItem[];
  /** Progress percentage (0-100) */
  progress?: number;
  /** Completion timestamp (ISO 8601) */
  completedTime?: string;
  /** Creation timestamp (ISO 8601) */
  createdTime: string;
  /** Last modification timestamp (ISO 8601) */
  modifiedTime: string;
  /** Sort order within the project */
  sortOrder?: number;
  /** Content type: TEXT or CHECKLIST */
  kind?: TaskKind;
}

/**
 * Task with unknown fields for API response flexibility
 *
 * TickTick API may return additional fields not documented.
 * This interface preserves all fields while maintaining type safety.
 */
export interface TaskWithUnknownFields extends Task {
  [key: string]: unknown;
}
