/**
 * Metadata for GetTaskTool
 */

import { buildToolName, ToolCategory, ToolPriority } from '@fractalizer/mcp-core';
import type { StaticToolMetadata } from '@fractalizer/mcp-core';
import { MCP_TOOL_PREFIX } from '#constants';
import { GET_TASK_OUTPUT_SCHEMA } from './get-task.schema.js';

/**
 * Static metadata for GetTaskTool
 */
export const GET_TASK_TOOL_METADATA: StaticToolMetadata = {
  name: buildToolName('get_task', MCP_TOOL_PREFIX),
  description:
    '[Tasks/Read] Получить задачу по ID (task, todo, get) — если ID неизвестен, используй search_tasks',
  category: ToolCategory.TASKS,
  subcategory: 'read',
  priority: ToolPriority.CRITICAL,
  tags: ['task', 'get', 'read', 'fetch'],
  isHelper: false,
  requiresExplicitUserConsent: false,
  redactionAllowlist: ['projectId', 'taskId'],
  title: 'Задача по ID',
  outputSchema: GET_TASK_OUTPUT_SCHEMA,
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
} as const;
