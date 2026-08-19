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
  description: '[Tasks/Write] Удалить задачу (task, todo, delete, remove)',
  category: ToolCategory.TASKS,
  // 'delete' отдельно от 'write' (M5 отчёта ревью): позволяет отключить все
  // удаляющие tools рубильником DISABLED_TOOL_GROUPS=tasks:delete, не
  // затрагивая create_task/update_task/complete_task.
  subcategory: 'delete',
  priority: ToolPriority.NORMAL,
  tags: ['task', 'delete', 'remove'],
  isHelper: false,
  requiresExplicitUserConsent: true,
  redactionAllowlist: ['projectId', 'taskId'],
  title: 'Удалить задачу',
  outputSchema: DELETE_TASK_OUTPUT_SCHEMA,
  annotations: {
    readOnlyHint: false,
    destructiveHint: true,
    idempotentHint: true,
    openWorldHint: true,
  },
} as const;
