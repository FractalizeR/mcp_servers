/**
 * Project Tools exports
 *
 * All MCP tools for TickTick project operations
 */

// Import tools for PROJECT_TOOLS array
import { GetProjectsTool } from './get-projects/index.js';
import { GetProjectTool } from './get-project/index.js';
import { GetProjectTasksTool } from './get-project-tasks/index.js';
import { CreateProjectTool } from './create-project/index.js';
import { UpdateProjectTool } from './update-project/index.js';
import { DeleteProjectTool } from './delete-project/index.js';

// Get projects (list all)
export {
  GetProjectsTool,
  GET_PROJECTS_TOOL_METADATA,
  GetProjectsParamsSchema,
  type GetProjectsParams,
} from './get-projects/index.js';

// Get single project
export {
  GetProjectTool,
  GET_PROJECT_TOOL_METADATA,
  GetProjectParamsSchema,
  type GetProjectParams,
} from './get-project/index.js';

// Get project with tasks
export {
  GetProjectTasksTool,
  GET_PROJECT_TASKS_TOOL_METADATA,
  GetProjectTasksParamsSchema,
  type GetProjectTasksParams,
} from './get-project-tasks/index.js';

// Create project
export {
  CreateProjectTool,
  CREATE_PROJECT_TOOL_METADATA,
  CreateProjectParamsSchema,
  type CreateProjectParams,
} from './create-project/index.js';

// Update project
export {
  UpdateProjectTool,
  UPDATE_PROJECT_TOOL_METADATA,
  UpdateProjectParamsSchema,
  type UpdateProjectParams,
} from './update-project/index.js';

// Delete project
export {
  DeleteProjectTool,
  DELETE_PROJECT_TOOL_METADATA,
  DeleteProjectParamsSchema,
  type DeleteProjectParams,
} from './delete-project/index.js';

/**
 * All project tool classes
 */
export const PROJECT_TOOLS = [
  GetProjectsTool,
  GetProjectTool,
  GetProjectTasksTool,
  CreateProjectTool,
  UpdateProjectTool,
  DeleteProjectTool,
] as const;
