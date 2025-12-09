/**
 * Metadata for GetTasksDueThisWeekTool
 */

import { buildToolName, ToolCategory, ToolPriority } from '@mcp-framework/core';
import type { StaticToolMetadata } from '@mcp-framework/core';
import { MCP_TOOL_PREFIX } from '#constants';

export const GET_TASKS_DUE_THIS_WEEK_TOOL_METADATA: StaticToolMetadata = {
  name: buildToolName('get_tasks_due_this_week', MCP_TOOL_PREFIX),
  description: '[Tasks/Date] Получить задачи со сроком на текущую неделю (Пн-Вс).',
  category: ToolCategory.TASKS,
  subcategory: 'date',
  priority: ToolPriority.NORMAL,
  tags: ['tasks', 'week', 'due'],
  isHelper: false,
  requiresExplicitUserConsent: false,
} as const;
