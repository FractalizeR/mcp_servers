import { buildToolName, ToolCategory, ToolPriority } from '@fractalizer/mcp-core';
import type { StaticToolMetadata } from '@fractalizer/mcp-core';
import { MCP_TOOL_PREFIX } from '#constants';

export const MOVE_ROWS_TOOL_METADATA: StaticToolMetadata = {
  name: buildToolName('move_rows', MCP_TOOL_PREFIX),
  description: '[Grids/Write] Переместить строки в таблице',
  category: ToolCategory.GRIDS,
  subcategory: 'write',
  priority: ToolPriority.LOW,
  tags: ['write', 'move', 'rows', 'grid', 'table'],
  isHelper: false,
  requiresExplicitUserConsent: true,
} as const;
