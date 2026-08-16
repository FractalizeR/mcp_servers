/**
 * Metadata for GetTasksByPriorityTool
 */

import { buildToolName, ToolCategory, ToolPriority } from '@fractalizer/mcp-core';
import type { StaticToolMetadata } from '@fractalizer/mcp-core';
import { MCP_TOOL_PREFIX } from '#constants';
import { GET_TASKS_BY_PRIORITY_OUTPUT_SCHEMA } from './get-tasks-by-priority.schema.js';

/**
 * Static metadata for GetTasksByPriorityTool
 */
export const GET_TASKS_BY_PRIORITY_TOOL_METADATA: StaticToolMetadata = {
  name: buildToolName('get_tasks_by_priority', MCP_TOOL_PREFIX),
  description: '[Tasks/Read] Получить задачи с определённым уровнем приоритета',
  category: ToolCategory.TASKS,
  subcategory: 'read',
  priority: ToolPriority.NORMAL,
  tags: ['tasks', 'priority', 'filter'],
  isHelper: false,
  requiresExplicitUserConsent: false,
  redactionAllowlist: [],
  title: 'Задачи по приоритету',
  outputSchema: GET_TASKS_BY_PRIORITY_OUTPUT_SCHEMA,
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
} as const;
