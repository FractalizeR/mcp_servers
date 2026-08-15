/**
 * Metadata for GetAllTasksTool
 */

import { buildToolName, ToolCategory, ToolPriority } from '@fractalizer/mcp-core';
import type { StaticToolMetadata } from '@fractalizer/mcp-core';
import { MCP_TOOL_PREFIX } from '#constants';
import { GET_ALL_TASKS_OUTPUT_SCHEMA } from './get-all-tasks.schema.js';

/**
 * Static metadata for GetAllTasksTool
 */
export const GET_ALL_TASKS_TOOL_METADATA: StaticToolMetadata = {
  name: buildToolName('get_all_tasks', MCP_TOOL_PREFIX),
  description: '[Tasks/Read] Get all tasks from all projects',
  category: ToolCategory.TASKS,
  subcategory: 'read',
  priority: ToolPriority.HIGH,
  tags: ['tasks', 'all', 'list', 'read'],
  isHelper: false,
  requiresExplicitUserConsent: false,
  redactionAllowlist: [],
  title: 'Все задачи',
  outputSchema: GET_ALL_TASKS_OUTPUT_SCHEMA,
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
} as const;
