/**
 * Metadata for GetTasksDueTodayTool
 */

import { buildToolName, ToolCategory, ToolPriority } from '@mcp-framework/core';
import type { StaticToolMetadata } from '@mcp-framework/core';
import { MCP_TOOL_PREFIX } from '#constants';

export const GET_TASKS_DUE_TODAY_TOOL_METADATA: StaticToolMetadata = {
  name: buildToolName('get_tasks_due_today', MCP_TOOL_PREFIX),
  description: '[Tasks/Date] Получить задачи со сроком на сегодня.',
  category: ToolCategory.TASKS,
  subcategory: 'date',
  priority: ToolPriority.HIGH,
  tags: ['tasks', 'today', 'due', 'deadline'],
  isHelper: false,
} as const;
