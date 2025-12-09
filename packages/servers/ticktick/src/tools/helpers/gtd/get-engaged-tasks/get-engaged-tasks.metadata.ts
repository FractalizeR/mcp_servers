/**
 * Metadata for GetEngagedTasksTool
 */

import { buildToolName, ToolCategory, ToolPriority } from '@mcp-framework/core';
import type { StaticToolMetadata } from '@mcp-framework/core';
import { MCP_TOOL_PREFIX } from '#constants';

export const GET_ENGAGED_TASKS_TOOL_METADATA: StaticToolMetadata = {
  name: buildToolName('get_engaged_tasks', MCP_TOOL_PREFIX),
  description: '[Helpers/GTD] Получить "горящие" задачи: высокий приоритет ИЛИ просроченные.',
  category: ToolCategory.HELPERS,
  subcategory: 'gtd',
  priority: ToolPriority.NORMAL,
  tags: ['gtd', 'engaged', 'urgent', 'important'],
  isHelper: true,
  requiresExplicitUserConsent: false,
} as const;
