/**
 * Metadata for GetTasksDueTomorrowTool
 */

import { buildToolName, ToolCategory, ToolPriority } from '@fractalizer/mcp-core';
import type { StaticToolMetadata } from '@fractalizer/mcp-core';
import { MCP_TOOL_PREFIX } from '#constants';

export const GET_TASKS_DUE_TOMORROW_TOOL_METADATA: StaticToolMetadata = {
  name: buildToolName('get_tasks_due_tomorrow', MCP_TOOL_PREFIX),
  description: '[Tasks/Date] Получить задачи со сроком на завтра.',
  category: ToolCategory.TASKS,
  subcategory: 'date',
  priority: ToolPriority.NORMAL,
  tags: ['tasks', 'tomorrow', 'due'],
  isHelper: false,
  requiresExplicitUserConsent: false,
} as const;
