/**
 * Metadata for GetTasksDueThisWeekTool
 */

import { buildToolName, ToolCategory, ToolPriority } from '@fractalizer/mcp-core';
import type { StaticToolMetadata } from '@fractalizer/mcp-core';
import { MCP_TOOL_PREFIX } from '#constants';
import { GET_TASKS_DUE_THIS_WEEK_OUTPUT_SCHEMA } from './get-tasks-due-this-week.schema.js';

export const GET_TASKS_DUE_THIS_WEEK_TOOL_METADATA: StaticToolMetadata = {
  name: buildToolName('get_tasks_due_this_week', MCP_TOOL_PREFIX),
  description: '[Tasks/Date] Получить задачи со сроком на текущую неделю (Пн-Вс).',
  category: ToolCategory.TASKS,
  subcategory: 'date',
  priority: ToolPriority.NORMAL,
  tags: ['tasks', 'week', 'due'],
  isHelper: false,
  requiresExplicitUserConsent: false,
  redactionAllowlist: [],
  title: 'Get Tasks Due This Week',
  outputSchema: GET_TASKS_DUE_THIS_WEEK_OUTPUT_SCHEMA,
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
} as const;
