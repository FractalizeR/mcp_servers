/**
 * Metadata for GetAllTasksTool
 */

import { buildToolName, ToolCategory, ToolPriority } from '@mcp-framework/core';
import type { StaticToolMetadata } from '@mcp-framework/core';
import { MCP_TOOL_PREFIX } from '#constants';

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
} as const;
