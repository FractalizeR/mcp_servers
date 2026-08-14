/**
 * Metadata for SearchTasksTool
 */

import { buildToolName, ToolCategory, ToolPriority } from '@fractalizer/mcp-core';
import type { StaticToolMetadata } from '@fractalizer/mcp-core';
import { MCP_TOOL_PREFIX } from '#constants';
import { SEARCH_TASKS_OUTPUT_SCHEMA } from './search-tasks.schema.js';

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
  requiresExplicitUserConsent: false,
  redactionAllowlist: [],
  title: 'Search Tasks',
  outputSchema: SEARCH_TASKS_OUTPUT_SCHEMA,
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
} as const;
