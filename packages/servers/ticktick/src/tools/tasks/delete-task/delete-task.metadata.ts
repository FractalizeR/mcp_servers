/**
 * Metadata for DeleteTaskTool
 */

import { buildToolName, ToolCategory, ToolPriority } from '@fractalizer/mcp-core';
import type { StaticToolMetadata } from '@fractalizer/mcp-core';
import { MCP_TOOL_PREFIX } from '#constants';
import { DELETE_TASK_OUTPUT_SCHEMA } from './delete-task.schema.js';

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
  redactionAllowlist: ['projectId', 'taskId'],
  title: 'Delete Task',
  outputSchema: DELETE_TASK_OUTPUT_SCHEMA,
  annotations: {
    readOnlyHint: false,
    destructiveHint: true,
    idempotentHint: true,
    openWorldHint: true,
  },
} as const;
