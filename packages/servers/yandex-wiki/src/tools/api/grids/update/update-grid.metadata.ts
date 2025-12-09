import { buildToolName, ToolCategory, ToolPriority } from '@fractalizer/mcp-core';
import type { StaticToolMetadata } from '@fractalizer/mcp-core';
import { MCP_TOOL_PREFIX } from '#constants';

export const UPDATE_GRID_TOOL_METADATA: StaticToolMetadata = {
  name: buildToolName('update_grid', MCP_TOOL_PREFIX),
  description: '[Grids/Write] Обновить динамическую таблицу',
  category: ToolCategory.GRIDS,
  subcategory: 'write',
  priority: ToolPriority.NORMAL,
  tags: ['write', 'update', 'grid', 'table'],
  isHelper: false,
  requiresExplicitUserConsent: true,
} as const;
