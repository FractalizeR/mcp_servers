/**
 * Metadata for DeleteTaskTool
 */

import { buildToolName, ToolCategory, ToolPriority } from '@fractalizer/mcp-core';
import type { StaticToolMetadata } from '@fractalizer/mcp-core';
import { MCP_TOOL_PREFIX } from '#constants';

/**
 * Static metadata for DeleteTaskTool
 */
export const DELETE_TASK_TOOL_METADATA: StaticToolMetadata = {
  name: buildToolName('delete_task', MCP_TOOL_PREFIX),
  description: '[Tasks/Write] Delete a task',
  category: ToolCategory.TASKS,
  subcategory: 'write',
  priority: ToolPriority.NORMAL,
  tags: ['task', 'delete', 'remove'],
  isHelper: false,
  requiresExplicitUserConsent: true,
} as const;
