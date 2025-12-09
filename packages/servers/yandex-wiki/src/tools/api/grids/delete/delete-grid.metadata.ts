import { buildToolName, ToolCategory, ToolPriority } from '@fractalizer/mcp-core';
import type { StaticToolMetadata } from '@fractalizer/mcp-core';
import { MCP_TOOL_PREFIX } from '#constants';

export const DELETE_GRID_TOOL_METADATA: StaticToolMetadata = {
  name: buildToolName('delete_grid', MCP_TOOL_PREFIX),
  description: '[Grids/Write] Удалить динамическую таблицу',
  category: ToolCategory.GRIDS,
  subcategory: 'write',
  priority: ToolPriority.NORMAL,
  tags: ['write', 'delete', 'grid', 'table'],
  isHelper: false,
  requiresExplicitUserConsent: true,
} as const;
