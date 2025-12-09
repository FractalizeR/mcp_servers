import { buildToolName, ToolCategory, ToolPriority } from '@fractalizer/mcp-core';
import type { StaticToolMetadata } from '@fractalizer/mcp-core';
import { MCP_TOOL_PREFIX } from '#constants';

export const GET_GRID_TOOL_METADATA: StaticToolMetadata = {
  name: buildToolName('get_grid', MCP_TOOL_PREFIX),
  description: '[Grids/Read] Получить динамическую таблицу по ID',
  category: ToolCategory.GRIDS,
  subcategory: 'read',
  priority: ToolPriority.HIGH,
  tags: ['read', 'get', 'grid', 'table'],
  isHelper: false,
  requiresExplicitUserConsent: false,
} as const;
