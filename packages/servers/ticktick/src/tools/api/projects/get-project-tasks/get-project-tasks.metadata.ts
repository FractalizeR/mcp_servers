/**
 * Metadata for GetProjectTasksTool
 */

import { buildToolName, ToolCategory, ToolPriority } from '@fractalizer/mcp-core';
import type { StaticToolMetadata } from '@fractalizer/mcp-core';
import { MCP_TOOL_PREFIX } from '#constants';
import { GET_PROJECT_TASKS_OUTPUT_SCHEMA } from './get-project-tasks.schema.js';

/**
 * Static metadata for GetProjectTasksTool
 */
export const GET_PROJECT_TASKS_TOOL_METADATA: StaticToolMetadata = {
  name: buildToolName('get_project_tasks', MCP_TOOL_PREFIX),
  description: '[Projects/Read] Получить все задачи проекта. Возвращает проект и его задачи.',
  category: ToolCategory.PROJECTS,
  subcategory: 'read',
  priority: ToolPriority.HIGH,
  tags: ['project', 'tasks', 'list'],
  isHelper: false,
  requiresExplicitUserConsent: false,
  redactionAllowlist: ['projectId'],
  title: 'Get Project Tasks',
  outputSchema: GET_PROJECT_TASKS_OUTPUT_SCHEMA,
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
} as const;
