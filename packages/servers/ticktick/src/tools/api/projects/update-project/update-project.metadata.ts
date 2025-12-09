/**
 * Metadata for UpdateProjectTool
 */

import { buildToolName, ToolCategory, ToolPriority } from '@fractalizer/mcp-core';
import type { StaticToolMetadata } from '@fractalizer/mcp-core';
import { MCP_TOOL_PREFIX } from '#constants';

/**
 * Static metadata for UpdateProjectTool
 */
export const UPDATE_PROJECT_TOOL_METADATA: StaticToolMetadata = {
  name: buildToolName('update_project', MCP_TOOL_PREFIX),
  description: '[Projects/Write] Обновить проект.',
  category: ToolCategory.PROJECTS,
  subcategory: 'write',
  priority: ToolPriority.NORMAL,
  tags: ['project', 'update', 'edit'],
  isHelper: false,
  requiresExplicitUserConsent: true,
} as const;
