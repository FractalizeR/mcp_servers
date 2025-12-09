import { buildToolName, ToolCategory, ToolPriority } from '@fractalizer/mcp-core';
import type { StaticToolMetadata } from '@fractalizer/mcp-core';
import { MCP_TOOL_PREFIX } from '#constants';

export const ADD_ROWS_TOOL_METADATA: StaticToolMetadata = {
  name: buildToolName('add_rows', MCP_TOOL_PREFIX),
  description: '[Grids/Write] Добавить строки в таблицу',
  category: ToolCategory.GRIDS,
  subcategory: 'write',
  priority: ToolPriority.NORMAL,
  tags: ['write', 'add', 'rows', 'grid', 'table'],
  isHelper: false,
  requiresExplicitUserConsent: true,
} as const;
