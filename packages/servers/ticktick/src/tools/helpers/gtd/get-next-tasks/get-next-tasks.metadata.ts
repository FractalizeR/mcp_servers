/**
 * Metadata for GetNextTasksTool
 */

import { buildToolName, ToolCategory, ToolPriority } from '@mcp-framework/core';
import type { StaticToolMetadata } from '@mcp-framework/core';
import { MCP_TOOL_PREFIX } from '#constants';

export const GET_NEXT_TASKS_TOOL_METADATA: StaticToolMetadata = {
  name: buildToolName('get_next_tasks', MCP_TOOL_PREFIX),
  description: '[Helpers/GTD] Получить "следующие" задачи: средний приоритет ИЛИ срок завтра.',
  category: ToolCategory.HELPERS,
  subcategory: 'gtd',
  priority: ToolPriority.NORMAL,
  tags: ['gtd', 'next', 'upcoming'],
  isHelper: true,
  requiresExplicitUserConsent: false,
} as const;
