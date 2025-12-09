import { buildToolName, ToolCategory, ToolPriority } from '@fractalizer/mcp-core';
import type { StaticToolMetadata } from '@fractalizer/mcp-core';
import { MCP_TOOL_PREFIX } from '#constants';

export const MOVE_COLUMNS_TOOL_METADATA: StaticToolMetadata = {
  name: buildToolName('move_columns', MCP_TOOL_PREFIX),
  description: '[Grids/Write] Переместить колонки в таблице',
  category: ToolCategory.GRIDS,
  subcategory: 'write',
  priority: ToolPriority.LOW,
  tags: ['write', 'move', 'columns', 'grid', 'table'],
  isHelper: false,
  requiresExplicitUserConsent: true,
} as const;
