/**
 * Metadata for GetTasksTool (batch)
 */

import { buildToolName, ToolCategory, ToolPriority } from '@fractalizer/mcp-core';
import type { StaticToolMetadata } from '@fractalizer/mcp-core';
import { MCP_TOOL_PREFIX } from '#constants';
import { GET_TASKS_OUTPUT_SCHEMA } from './get-tasks.schema.js';

/**
 * Static metadata for GetTasksTool
 */
export const GET_TASKS_TOOL_METADATA: StaticToolMetadata = {
  name: buildToolName('get_tasks', MCP_TOOL_PREFIX),
  description: '[Tasks/Read] Получить несколько задач по ID (batch)',
  category: ToolCategory.TASKS,
  subcategory: 'read',
  priority: ToolPriority.CRITICAL,
  tags: ['tasks', 'get', 'read', 'batch', 'bulk'],
  isHelper: false,
  requiresExplicitUserConsent: false,
  redactionAllowlist: ['projectId', 'taskId'],
  title: 'Задачи по идентификаторам',
  outputSchema: GET_TASKS_OUTPUT_SCHEMA,
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
} as const;
