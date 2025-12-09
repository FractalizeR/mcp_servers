/**
 * Metadata for GetTaskTool
 */

import { buildToolName, ToolCategory, ToolPriority } from '@fractalizer/mcp-core';
import type { StaticToolMetadata } from '@fractalizer/mcp-core';
import { MCP_TOOL_PREFIX } from '#constants';

/**
 * Static metadata for GetTaskTool
 */
export const GET_TASK_TOOL_METADATA: StaticToolMetadata = {
  name: buildToolName('get_task', MCP_TOOL_PREFIX),
  description: '[Tasks/Read] Get a task by ID',
  category: ToolCategory.TASKS,
  subcategory: 'read',
  priority: ToolPriority.CRITICAL,
  tags: ['task', 'get', 'read', 'fetch'],
  isHelper: false,
  requiresExplicitUserConsent: false,
} as const;
