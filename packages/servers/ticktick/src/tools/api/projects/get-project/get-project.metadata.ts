/**
 * Metadata for GetProjectTool
 */

import { buildToolName, ToolCategory, ToolPriority } from '@fractalizer/mcp-core';
import type { StaticToolMetadata } from '@fractalizer/mcp-core';
import { MCP_TOOL_PREFIX } from '#constants';

/**
 * Static metadata for GetProjectTool
 */
export const GET_PROJECT_TOOL_METADATA: StaticToolMetadata = {
  name: buildToolName('get_project', MCP_TOOL_PREFIX),
  description: '[Projects/Read] Получить проект по ID.',
  category: ToolCategory.PROJECTS,
  subcategory: 'read',
  priority: ToolPriority.HIGH,
  tags: ['project', 'get', 'read'],
  isHelper: false,
  requiresExplicitUserConsent: false,
} as const;
