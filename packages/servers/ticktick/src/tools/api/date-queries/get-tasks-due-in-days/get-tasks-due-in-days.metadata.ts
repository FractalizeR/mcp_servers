/**
 * Metadata for GetTasksDueInDaysTool
 */

import { buildToolName, ToolCategory, ToolPriority } from '@fractalizer/mcp-core';
import type { StaticToolMetadata } from '@fractalizer/mcp-core';
import { MCP_TOOL_PREFIX } from '#constants';
import { GET_TASKS_DUE_IN_DAYS_OUTPUT_SCHEMA } from './get-tasks-due-in-days.schema.js';

export const GET_TASKS_DUE_IN_DAYS_TOOL_METADATA: StaticToolMetadata = {
  name: buildToolName('get_tasks_due_in_days', MCP_TOOL_PREFIX),
  description: '[Tasks/Date] Получить задачи со сроком в ближайшие N дней.',
  category: ToolCategory.TASKS,
  subcategory: 'date',
  priority: ToolPriority.NORMAL,
  tags: ['tasks', 'due', 'days', 'upcoming'],
  isHelper: false,
  requiresExplicitUserConsent: false,
  redactionAllowlist: [],
  title: 'Get Tasks Due In N Days',
  outputSchema: GET_TASKS_DUE_IN_DAYS_OUTPUT_SCHEMA,
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
} as const;
