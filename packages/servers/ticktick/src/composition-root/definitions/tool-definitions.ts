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
 * 2. Date queries - tasks by date
 * 3. GTD helpers - engaged, next
 *
 * TODO: Add project and task tools from stages 4.1 and 4.2:
 * - Project tools (6): GetProjects, GetProject, GetProjectTasks, CreateProject, UpdateProject, DeleteProject
 * - Task tools (10): GetTask, GetTasks, GetAllTasks, SearchTasks, CreateTask, BatchCreateTasks,
 *                    UpdateTask, CompleteTask, DeleteTask, GetTasksByPriority
 */
export const TOOL_CLASSES = [
  // Helpers (critical)
  PingTool,

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
