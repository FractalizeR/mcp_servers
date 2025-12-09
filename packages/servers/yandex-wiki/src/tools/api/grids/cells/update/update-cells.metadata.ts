import { buildToolName, ToolCategory, ToolPriority } from '@fractalizer/mcp-core';
import type { StaticToolMetadata } from '@fractalizer/mcp-core';
import { MCP_TOOL_PREFIX } from '#constants';

export const UPDATE_CELLS_TOOL_METADATA: StaticToolMetadata = {
  name: buildToolName('update_cells', MCP_TOOL_PREFIX),
  description: '[Grids/Write] Обновить ячейки в таблице',
  category: ToolCategory.GRIDS,
  subcategory: 'write',
  priority: ToolPriority.NORMAL,
  tags: ['write', 'update', 'cells', 'grid', 'table'],
  isHelper: false,
  requiresExplicitUserConsent: true,
} as const;
