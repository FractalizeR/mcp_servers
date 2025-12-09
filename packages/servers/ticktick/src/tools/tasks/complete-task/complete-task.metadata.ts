/**
 * Metadata for CompleteTaskTool
 */

import { buildToolName, ToolCategory, ToolPriority } from '@fractalizer/mcp-core';
import type { StaticToolMetadata } from '@fractalizer/mcp-core';
import { MCP_TOOL_PREFIX } from '#constants';

/**
 * Static metadata for CompleteTaskTool
 */
export const COMPLETE_TASK_TOOL_METADATA: StaticToolMetadata = {
  name: buildToolName('complete_task', MCP_TOOL_PREFIX),
  description: '[Tasks/Write] Mark a task as completed',
  category: ToolCategory.TASKS,
  subcategory: 'write',
  priority: ToolPriority.HIGH,
  tags: ['task', 'complete', 'done', 'finish'],
  isHelper: false,
  requiresExplicitUserConsent: true,
} as const;
