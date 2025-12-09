import { buildToolName, ToolCategory, ToolPriority } from '@fractalizer/mcp-core';
import type { StaticToolMetadata } from '@fractalizer/mcp-core';
import { MCP_TOOL_PREFIX } from '#constants';

export const REMOVE_COLUMNS_TOOL_METADATA: StaticToolMetadata = {
  name: buildToolName('remove_columns', MCP_TOOL_PREFIX),
  description: '[Grids/Write] Удалить колонки из таблицы',
  category: ToolCategory.GRIDS,
  subcategory: 'write',
  priority: ToolPriority.NORMAL,
  tags: ['write', 'remove', 'delete', 'columns', 'grid', 'table'],
  isHelper: false,
  requiresExplicitUserConsent: true,
} as const;
