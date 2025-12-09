/**
 * Metadata for GetTasksByPriorityTool
 */

import { buildToolName, ToolCategory, ToolPriority } from '@mcp-framework/core';
import type { StaticToolMetadata } from '@mcp-framework/core';
import { MCP_TOOL_PREFIX } from '#constants';

/**
 * Static metadata for GetTasksByPriorityTool
 */
export const GET_TASKS_BY_PRIORITY_TOOL_METADATA: StaticToolMetadata = {
  name: buildToolName('get_tasks_by_priority', MCP_TOOL_PREFIX),
  description: '[Tasks/Read] Get tasks with a specific priority level',
  category: ToolCategory.TASKS,
  subcategory: 'read',
  priority: ToolPriority.NORMAL,
  tags: ['tasks', 'priority', 'filter'],
  isHelper: false,
  requiresExplicitUserConsent: false,
} as const;
