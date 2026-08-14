/**
 * Metadata for UpdateTaskTool
 */

import { buildToolName, ToolCategory, ToolPriority } from '@fractalizer/mcp-core';
import type { StaticToolMetadata } from '@fractalizer/mcp-core';
import { MCP_TOOL_PREFIX } from '#constants';
import { UPDATE_TASK_OUTPUT_SCHEMA } from './update-task.schema.js';

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
  requiresExplicitUserConsent: true,
  redactionAllowlist: ['projectId', 'taskId'],
  title: 'Update Task',
  outputSchema: UPDATE_TASK_OUTPUT_SCHEMA,
  annotations: {
    readOnlyHint: false,
    destructiveHint: true,
    idempotentHint: true,
    openWorldHint: true,
  },
} as const;
