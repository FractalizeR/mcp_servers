/**
 * Metadata for DeleteProjectTool
 */

import { buildToolName, ToolCategory, ToolPriority } from '@mcp-framework/core';
import type { StaticToolMetadata } from '@mcp-framework/core';
import { MCP_TOOL_PREFIX } from '#constants';

/**
 * Static metadata for DeleteProjectTool
 */
export const DELETE_PROJECT_TOOL_METADATA: StaticToolMetadata = {
  name: buildToolName('delete_project', MCP_TOOL_PREFIX),
  description: '[Projects/Write] Удалить проект. ВНИМАНИЕ: удаляет все задачи проекта!',
  category: ToolCategory.PROJECTS,
  subcategory: 'write',
  priority: ToolPriority.LOW,
  tags: ['project', 'delete', 'remove'],
  isHelper: false,
  requiresExplicitUserConsent: true,
} as const;
