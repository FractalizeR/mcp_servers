/**
 * Metadata for CreateTaskTool
 */

import { buildToolName, ToolCategory, ToolPriority } from '@fractalizer/mcp-core';
import type { StaticToolMetadata } from '@fractalizer/mcp-core';
import { MCP_TOOL_PREFIX } from '#constants';
import { CREATE_TASK_OUTPUT_SCHEMA } from './create-task.schema.js';

/**
 * Static metadata for CreateTaskTool
 */
export const CREATE_TASK_TOOL_METADATA: StaticToolMetadata = {
  name: buildToolName('create_task', MCP_TOOL_PREFIX),
  description: '[Tasks/Write] Создать новую задачу (task, todo, create) в TickTick',
  category: ToolCategory.TASKS,
  subcategory: 'write',
  priority: ToolPriority.CRITICAL,
  tags: ['task', 'create', 'new', 'add'],
  isHelper: false,
  requiresExplicitUserConsent: false,
  redactionAllowlist: ['projectId'],
  title: 'Создать задачу',
  outputSchema: CREATE_TASK_OUTPUT_SCHEMA,
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: true,
  },
} as const;
