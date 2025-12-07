/**
 * Task DTOs for TickTick API
 *
 * Data Transfer Objects for creating and updating tasks.
 * Separates input validation from domain entities.
 */

/**
 * DTO for creating a new checklist item
 */
export interface CreateChecklistItemDto {
  /** Subtask title (required) */
  title: string;
  /** Initial status: 0=uncompleted (default), 1=completed */
  status?: number;
}

/**
 * DTO for updating an existing checklist item
 */
export interface UpdateChecklistItemDto {
  /** Item ID (if present - update, if absent - create new) */
  id?: string;
  /** Subtask title */
  title: string;
  /** Status: 0=uncompleted, 1=completed */
  status?: number;
}

/**
 * DTO for creating a new task
 *
 * Only title is required. All other fields are optional.
 * If projectId is not provided, task will be created in inbox.
 */
export interface CreateTaskDto {
  /** Task title (required) */
  title: string;

  /** Project/list ID (optional, defaults to inbox) */
  projectId?: string;

  /** Task content/description */
  content?: string;

  /** Alternative description field */
  desc?: string;

  /** Priority: 0=none, 1=low, 3=medium, 5=high */
  priority?: number;

  /** Due date in ISO format */
  dueDate?: string;

  /** Start date in ISO format */
  startDate?: string;

  /** Timezone (e.g., 'Europe/Moscow') */
  timeZone?: string;

  /** Whether this is an all-day task */
  isAllDay?: boolean;

  /** Reminders in iCalendar format */
  reminders?: string[];

  /** Recurrence rule in RRULE format */
  repeatFlag?: string;

  /** Tags to assign */
  tags?: string[];

  /** Checklist items to create */
  items?: CreateChecklistItemDto[];
}

/**
 * DTO for updating an existing task
 *
 * All fields are optional. Only provided fields will be updated.
 */
export interface UpdateTaskDto {
  /** Task title */
  title?: string;

  /** Task content/description */
  content?: string;

  /** Alternative description field */
  desc?: string;

  /** Priority: 0=none, 1=low, 3=medium, 5=high */
  priority?: number;

  /** Status: 0=uncompleted, 2=completed */
  status?: number;

  /** Due date in ISO format */
  dueDate?: string;

  /** Start date in ISO format */
  startDate?: string;

  /** Whether this is an all-day task */
  isAllDay?: boolean;

  /** Reminders in iCalendar format */
  reminders?: string[];

  /** Recurrence rule in RRULE format */
  repeatFlag?: string;

  /** Tags */
  tags?: string[];

  /** Checklist items (with optional id for update vs create) */
  items?: UpdateChecklistItemDto[];
}
