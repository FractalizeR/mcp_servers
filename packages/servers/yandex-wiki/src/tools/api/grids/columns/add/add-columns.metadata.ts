import { buildToolName, ToolCategory, ToolPriority } from '@mcp-framework/core';
import type { StaticToolMetadata } from '@mcp-framework/core';
import { MCP_TOOL_PREFIX } from '#constants';

export const ADD_COLUMNS_TOOL_METADATA: StaticToolMetadata = {
  name: buildToolName('add_columns', MCP_TOOL_PREFIX),
  description: '[Grids/Write] Добавить колонки в таблицу',
  category: ToolCategory.GRIDS,
  subcategory: 'write',
  priority: ToolPriority.NORMAL,
  tags: ['write', 'add', 'columns', 'grid', 'table'],
  isHelper: false,
  requiresExplicitUserConsent: true,
} as const;
