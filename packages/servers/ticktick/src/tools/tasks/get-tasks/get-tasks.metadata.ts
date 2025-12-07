/**
 * Metadata for GetTasksTool (batch)
 */

import { buildToolName, ToolCategory, ToolPriority } from '@mcp-framework/core';
import type { StaticToolMetadata } from '@mcp-framework/core';
import { MCP_TOOL_PREFIX } from '#constants';

/**
 * Static metadata for GetTasksTool
 */
export const GET_TASKS_TOOL_METADATA: StaticToolMetadata = {
  name: buildToolName('get_tasks', MCP_TOOL_PREFIX),
  description: '[Tasks/Read] Get multiple tasks by IDs (batch)',
  category: ToolCategory.TASKS,
  subcategory: 'read',
  priority: ToolPriority.CRITICAL,
  tags: ['tasks', 'get', 'read', 'batch', 'bulk'],
  isHelper: false,
} as const;
