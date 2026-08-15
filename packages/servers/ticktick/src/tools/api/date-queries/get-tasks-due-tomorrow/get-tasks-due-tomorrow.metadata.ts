/**
 * Metadata for GetTasksDueTomorrowTool
 */

import { buildToolName, ToolCategory, ToolPriority } from '@fractalizer/mcp-core';
import type { StaticToolMetadata } from '@fractalizer/mcp-core';
import { MCP_TOOL_PREFIX } from '#constants';
import { GET_TASKS_DUE_TOMORROW_OUTPUT_SCHEMA } from './get-tasks-due-tomorrow.schema.js';

export const GET_TASKS_DUE_TOMORROW_TOOL_METADATA: StaticToolMetadata = {
  name: buildToolName('get_tasks_due_tomorrow', MCP_TOOL_PREFIX),
  description: '[Tasks/Date] Получить задачи со сроком на завтра.',
  category: ToolCategory.TASKS,
  subcategory: 'date',
  priority: ToolPriority.NORMAL,
  tags: ['tasks', 'tomorrow', 'due'],
  isHelper: false,
  requiresExplicitUserConsent: false,
  redactionAllowlist: [],
  title: 'Задачи на завтра',
  outputSchema: GET_TASKS_DUE_TOMORROW_OUTPUT_SCHEMA,
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
} as const;
