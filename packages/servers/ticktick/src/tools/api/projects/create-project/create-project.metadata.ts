/**
 * Metadata for CreateProjectTool
 */

import { buildToolName, ToolCategory, ToolPriority } from '@fractalizer/mcp-core';
import type { StaticToolMetadata } from '@fractalizer/mcp-core';
import { MCP_TOOL_PREFIX } from '#constants';

/**
 * Static metadata for CreateProjectTool
 */
export const CREATE_PROJECT_TOOL_METADATA: StaticToolMetadata = {
  name: buildToolName('create_project', MCP_TOOL_PREFIX),
  description: '[Projects/Write] Создать новый проект.',
  category: ToolCategory.PROJECTS,
  subcategory: 'write',
  priority: ToolPriority.NORMAL,
  tags: ['project', 'create', 'new'],
  isHelper: false,
  requiresExplicitUserConsent: false,
} as const;
