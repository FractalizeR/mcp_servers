/**
 * Metadata for GetNextTasksTool
 */

import { buildToolName, ToolCategory, ToolPriority } from '@fractalizer/mcp-core';
import type { StaticToolMetadata } from '@fractalizer/mcp-core';
import { MCP_TOOL_PREFIX } from '#constants';
import { GET_NEXT_TASKS_OUTPUT_SCHEMA } from './get-next-tasks.schema.js';

export const GET_NEXT_TASKS_TOOL_METADATA: StaticToolMetadata = {
  name: buildToolName('get_next_tasks', MCP_TOOL_PREFIX),
  description: '[Helpers/GTD] Получить "следующие" задачи: средний приоритет ИЛИ срок завтра.',
  category: ToolCategory.HELPERS,
  subcategory: 'gtd',
  priority: ToolPriority.NORMAL,
  tags: ['gtd', 'next', 'upcoming'],
  isHelper: true,
  requiresExplicitUserConsent: false,
  redactionAllowlist: [],
  title: 'Get Next Tasks (GTD)',
  outputSchema: GET_NEXT_TASKS_OUTPUT_SCHEMA,
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
} as const;
