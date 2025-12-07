/**
 * Tool class definitions for DI container
 *
 * This file exports all tool classes for registration in the container.
 */

// Task tools
import { GetTaskTool } from '#tools/tasks/get-task/index.js';
import { GetTasksTool } from '#tools/tasks/get-tasks/index.js';
import { GetAllTasksTool } from '#tools/tasks/get-all-tasks/index.js';
import { SearchTasksTool } from '#tools/tasks/search-tasks/index.js';
import { GetTasksByPriorityTool } from '#tools/tasks/get-tasks-by-priority/index.js';
import { CreateTaskTool } from '#tools/tasks/create-task/index.js';
import { BatchCreateTasksTool } from '#tools/tasks/batch-create-tasks/index.js';
import { UpdateTaskTool } from '#tools/tasks/update-task/index.js';
import { CompleteTaskTool } from '#tools/tasks/complete-task/index.js';
import { DeleteTaskTool } from '#tools/tasks/delete-task/index.js';

/**
 * All tool classes for DI registration
 *
 * Order: Read operations first, then Write operations
 */
export const TOOL_CLASSES = [
  // Task Read operations
  GetTaskTool,
  GetTasksTool,
  GetAllTasksTool,
  SearchTasksTool,
  GetTasksByPriorityTool,

  // Task Write operations
  CreateTaskTool,
  BatchCreateTasksTool,
  UpdateTaskTool,
  CompleteTaskTool,
  DeleteTaskTool,
] as const;

/**
 * Type for tool class array
 */
export type ToolClass = (typeof TOOL_CLASSES)[number];
