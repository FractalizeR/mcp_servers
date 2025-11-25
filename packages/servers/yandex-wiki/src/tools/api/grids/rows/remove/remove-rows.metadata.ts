import { buildToolName, ToolCategory, ToolPriority } from '@mcp-framework/core';
import type { StaticToolMetadata } from '@mcp-framework/core';
import { MCP_TOOL_PREFIX } from '#constants';

export const REMOVE_ROWS_TOOL_METADATA: StaticToolMetadata = {
  name: buildToolName('remove_rows', MCP_TOOL_PREFIX),
  description: '[Grids/Write] Удалить строки из таблицы',
  category: ToolCategory.GRIDS,
  subcategory: 'write',
  priority: ToolPriority.NORMAL,
  tags: ['write', 'remove', 'delete', 'rows', 'grid', 'table'],
  isHelper: false,
  requiresExplicitUserConsent: true,
} as const;
