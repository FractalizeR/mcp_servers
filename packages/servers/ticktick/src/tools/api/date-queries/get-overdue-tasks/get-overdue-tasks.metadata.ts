/**
 * Metadata for GetOverdueTasksTool
 */

import { buildToolName, ToolCategory, ToolPriority } from '@mcp-framework/core';
import type { StaticToolMetadata } from '@mcp-framework/core';
import { MCP_TOOL_PREFIX } from '#constants';

export const GET_OVERDUE_TASKS_TOOL_METADATA: StaticToolMetadata = {
  name: buildToolName('get_overdue_tasks', MCP_TOOL_PREFIX),
  description: '[Tasks/Date] Получить просроченные задачи (дата прошла, не завершены).',
  category: ToolCategory.TASKS,
  subcategory: 'date',
  priority: ToolPriority.HIGH,
  tags: ['tasks', 'overdue', 'late', 'missed'],
  isHelper: false,
} as const;
