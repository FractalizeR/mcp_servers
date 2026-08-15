/**
 * Metadata for GetOverdueTasksTool
 */

import { buildToolName, ToolCategory, ToolPriority } from '@fractalizer/mcp-core';
import type { StaticToolMetadata } from '@fractalizer/mcp-core';
import { MCP_TOOL_PREFIX } from '#constants';
import { GET_OVERDUE_TASKS_OUTPUT_SCHEMA } from './get-overdue-tasks.schema.js';

export const GET_OVERDUE_TASKS_TOOL_METADATA: StaticToolMetadata = {
  name: buildToolName('get_overdue_tasks', MCP_TOOL_PREFIX),
  description: '[Tasks/Date] Получить просроченные задачи (дата прошла, не завершены).',
  category: ToolCategory.TASKS,
  subcategory: 'date',
  priority: ToolPriority.HIGH,
  tags: ['tasks', 'overdue', 'late', 'missed'],
  isHelper: false,
  requiresExplicitUserConsent: false,
  redactionAllowlist: [],
  title: 'Просроченные задачи',
  outputSchema: GET_OVERDUE_TASKS_OUTPUT_SCHEMA,
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
} as const;
