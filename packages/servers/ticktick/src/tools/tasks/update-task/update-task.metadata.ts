/**
 * Metadata for UpdateTaskTool
 */

import { buildToolName, ToolCategory, ToolPriority } from '@mcp-framework/core';
import type { StaticToolMetadata } from '@mcp-framework/core';
import { MCP_TOOL_PREFIX } from '#constants';

/**
 * Static metadata for UpdateTaskTool
 */
export const UPDATE_TASK_TOOL_METADATA: StaticToolMetadata = {
  name: buildToolName('update_task', MCP_TOOL_PREFIX),
  description: '[Tasks/Write] Update an existing task',
  category: ToolCategory.TASKS,
  subcategory: 'write',
  priority: ToolPriority.CRITICAL,
  tags: ['task', 'update', 'edit', 'modify'],
  isHelper: false,
} as const;
