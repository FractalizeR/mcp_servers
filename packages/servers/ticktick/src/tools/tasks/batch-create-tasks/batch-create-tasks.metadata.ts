/**
 * Metadata for BatchCreateTasksTool
 */

import { buildToolName, ToolCategory, ToolPriority } from '@mcp-framework/core';
import type { StaticToolMetadata } from '@mcp-framework/core';
import { MCP_TOOL_PREFIX } from '#constants';

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
} as const;
