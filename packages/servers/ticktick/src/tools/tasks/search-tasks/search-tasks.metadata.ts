/**
 * Metadata for SearchTasksTool
 */

import { buildToolName, ToolCategory, ToolPriority } from '@mcp-framework/core';
import type { StaticToolMetadata } from '@mcp-framework/core';
import { MCP_TOOL_PREFIX } from '#constants';

/**
 * Static metadata for SearchTasksTool
 */
export const SEARCH_TASKS_TOOL_METADATA: StaticToolMetadata = {
  name: buildToolName('search_tasks', MCP_TOOL_PREFIX),
  description: '[Tasks/Read] Search tasks by text in title and content',
  category: ToolCategory.TASKS,
  subcategory: 'read',
  priority: ToolPriority.HIGH,
  tags: ['tasks', 'search', 'find', 'query'],
  isHelper: false,
} as const;
