/**
 * Metadata for BatchCreateTasksTool
 */

import { buildToolName, ToolCategory, ToolPriority } from '@fractalizer/mcp-core';
import type { StaticToolMetadata } from '@fractalizer/mcp-core';
import { MCP_TOOL_PREFIX } from '#constants';
import { BATCH_CREATE_TASKS_OUTPUT_SCHEMA } from './batch-create-tasks.schema.js';

/**
 * Static metadata for BatchCreateTasksTool
 */
export const BATCH_CREATE_TASKS_TOOL_METADATA: StaticToolMetadata = {
  name: buildToolName('batch_create_tasks', MCP_TOOL_PREFIX),
  description: '[Tasks/Write] Create multiple tasks at once (up to 50)',
  category: ToolCategory.TASKS,
  subcategory: 'write',
  priority: ToolPriority.HIGH,
  tags: ['tasks', 'batch', 'create', 'bulk'],
  isHelper: false,
  requiresExplicitUserConsent: true,
  redactionAllowlist: ['projectId'],
  title: 'Batch Create Tasks',
  outputSchema: BATCH_CREATE_TASKS_OUTPUT_SCHEMA,
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: true,
  },
} as const;
