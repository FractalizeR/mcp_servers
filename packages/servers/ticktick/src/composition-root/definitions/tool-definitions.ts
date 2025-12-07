/**
 * Tool Definitions for DI Container
 *
 * Central registry of all tool classes for automatic registration.
 *
 * To add a new tool:
 * 1. Import the tool class
 * 2. Add it to TOOL_CLASSES array
 * 3. Container will automatically register it
 *
 * NOTE: SearchToolsTool is handled separately in container.ts
 * as it requires ToolSearchEngine instead of Facade.
 */

// === Helper Tools (critical) ===
import { PingTool } from '#tools/helpers/ping/index.js';

// === Project Tools ===
import { GetProjectsTool } from '#tools/api/projects/get-projects/index.js';
import { GetProjectTool } from '#tools/api/projects/get-project/index.js';
import { GetProjectTasksTool } from '#tools/api/projects/get-project-tasks/index.js';
import { CreateProjectTool } from '#tools/api/projects/create-project/index.js';
import { UpdateProjectTool } from '#tools/api/projects/update-project/index.js';
import { DeleteProjectTool } from '#tools/api/projects/delete-project/index.js';

// === Task Tools ===
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

// === Date Query Tools ===
import { GetTasksDueTodayTool } from '#tools/api/date-queries/get-tasks-due-today/index.js';
import { GetTasksDueTomorrowTool } from '#tools/api/date-queries/get-tasks-due-tomorrow/index.js';
import { GetTasksDueInDaysTool } from '#tools/api/date-queries/get-tasks-due-in-days/index.js';
import { GetTasksDueThisWeekTool } from '#tools/api/date-queries/get-tasks-due-this-week/index.js';
import { GetOverdueTasksTool } from '#tools/api/date-queries/get-overdue-tasks/index.js';

// === GTD Helper Tools ===
import { GetEngagedTasksTool } from '#tools/helpers/gtd/get-engaged-tasks/index.js';
import { GetNextTasksTool } from '#tools/helpers/gtd/get-next-tasks/index.js';

/**
 * All tool classes for automatic DI registration
 *
 * Organization:
 * 1. Helpers (critical) - ping
 * 2. Project tools - CRUD operations
 * 3. Task tools - CRUD operations
 * 4. Date queries - tasks by date
 * 5. GTD helpers - engaged, next
 */
export const TOOL_CLASSES = [
  // Helpers (critical)
  PingTool,

  // Project Read operations
  GetProjectsTool,
  GetProjectTool,
  GetProjectTasksTool,

  // Project Write operations
  CreateProjectTool,
  UpdateProjectTool,
  DeleteProjectTool,

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

  // Date queries
  GetTasksDueTodayTool,
  GetTasksDueTomorrowTool,
  GetTasksDueInDaysTool,
  GetTasksDueThisWeekTool,
  GetOverdueTasksTool,

  // GTD helpers
  GetEngagedTasksTool,
  GetNextTasksTool,
] as const;

/**
 * Type for tool class array
 */
export type ToolClass = (typeof TOOL_CLASSES)[number];
