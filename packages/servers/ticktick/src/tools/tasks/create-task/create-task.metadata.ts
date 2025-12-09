/**
 * Metadata for CreateTaskTool
 */

import { buildToolName, ToolCategory, ToolPriority } from '@mcp-framework/core';
import type { StaticToolMetadata } from '@mcp-framework/core';
import { MCP_TOOL_PREFIX } from '#constants';

/**
 * Static metadata for CreateTaskTool
 */
export const CREATE_TASK_TOOL_METADATA: StaticToolMetadata = {
  name: buildToolName('create_task', MCP_TOOL_PREFIX),
  description: '[Tasks/Write] Create a new task',
  category: ToolCategory.TASKS,
  subcategory: 'write',
  priority: ToolPriority.CRITICAL,
  tags: ['task', 'create', 'new', 'add'],
  isHelper: false,
  requiresExplicitUserConsent: false,
} as const;
