/**
 * Task entity for TickTick API
 *
 * Represents a task/todo item in TickTick.
 * Supports checklist items (subtasks) and various scheduling options.
 */

/**
 * Checklist item (subtask) within a task
 */
export interface ChecklistItem {
  /** Unique identifier */
  id: string;
  /** Subtask title */
  title: string;
  /** Status: 0=uncompleted, 1=completed */
  status: number;
  /** Sort order within the task */
  sortOrder?: number;
}

/**
 * Task priority levels
 * - 0: None
 * - 1: Low
 * - 3: Medium
 * - 5: High
 */
export type TaskPriority = 0 | 1 | 3 | 5;

/**
 * Task status
 * - 0: Uncompleted (active)
 * - 2: Completed
 */
export type TaskStatus = 0 | 2;

/**
 * Task kind
 * - TEXT: Regular text-based task
 * - CHECKLIST: Task with checklist items
 */
export type TaskKind = 'TEXT' | 'CHECKLIST';

/**
 * Core Task entity from TickTick API
 *
 * Contains all known fields returned by the API.
 * For unknown fields, use TaskWithUnknownFields.
 */
export interface Task {
  /** Unique task identifier */
  id: string;

  /** Project/list ID this task belongs to */
  projectId: string;

  /** Task title (required) */
  title: string;

  /** Task content/description (rich text) */
  content?: string;

  /** Alternative description field */
  desc?: string;

  /** Priority: 0=none, 1=low, 3=medium, 5=high */
  priority: number;

  /** Status: 0=uncompleted, 2=completed */
  status: number;

  /** Due date in ISO format */
  dueDate?: string;

  /** Start date in ISO format */
  startDate?: string;

  /** Timezone for the task (e.g., 'Europe/Moscow') */
  timeZone?: string;

  /** Whether this is an all-day task */
  isAllDay?: boolean;

  /** Reminders in iCalendar format (e.g., 'TRIGGER:P0DT9H0M0S') */
  reminders?: string[];

  /** Recurrence rule in iCalendar RRULE format (e.g., 'RRULE:FREQ=DAILY') */
  repeatFlag?: string;

  /** Tags associated with the task */
  tags?: string[];

  /** Checklist items (subtasks) */
  items?: ChecklistItem[];

  /** Completion progress (0-100) */
  progress?: number;

  /** Completion timestamp in ISO format */
  completedTime?: string;

  /** Creation timestamp in ISO format */
  createdTime: string;

  /** Last modification timestamp in ISO format */
  modifiedTime: string;

  /** Sort order within the project */
  sortOrder?: number;

  /** Task kind: TEXT or CHECKLIST */
  kind?: TaskKind;
}

/**
 * Task with unknown fields support
 *
 * Used when receiving data from API that may contain
 * additional fields not defined in the Task interface.
 * This preserves forward compatibility with API changes.
 */
export interface TaskWithUnknownFields extends Task {
  /** Additional unknown fields from API */
  [key: string]: unknown;
}
