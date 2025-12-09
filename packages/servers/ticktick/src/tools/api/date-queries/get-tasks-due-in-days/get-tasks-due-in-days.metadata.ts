/**
 * Metadata for GetTasksDueInDaysTool
 */

import { buildToolName, ToolCategory, ToolPriority } from '@mcp-framework/core';
import type { StaticToolMetadata } from '@mcp-framework/core';
import { MCP_TOOL_PREFIX } from '#constants';

export const GET_TASKS_DUE_IN_DAYS_TOOL_METADATA: StaticToolMetadata = {
  name: buildToolName('get_tasks_due_in_days', MCP_TOOL_PREFIX),
  description: '[Tasks/Date] Получить задачи со сроком в ближайшие N дней.',
  category: ToolCategory.TASKS,
  subcategory: 'date',
  priority: ToolPriority.NORMAL,
  tags: ['tasks', 'due', 'days', 'upcoming'],
  isHelper: false,
  requiresExplicitUserConsent: false,
} as const;
