import { buildToolName, ToolCategory, ToolPriority } from '@mcp-framework/core';
import type { StaticToolMetadata } from '@mcp-framework/core';
import { MCP_TOOL_PREFIX } from '#constants';

export const CLONE_GRID_TOOL_METADATA: StaticToolMetadata = {
  name: buildToolName('clone_grid', MCP_TOOL_PREFIX),
  description: '[Grids/Write] Клонировать динамическую таблицу',
  category: ToolCategory.GRIDS,
  subcategory: 'write',
  priority: ToolPriority.NORMAL,
  tags: ['write', 'clone', 'copy', 'grid', 'table'],
  isHelper: false,
  requiresExplicitUserConsent: false,
} as const;
