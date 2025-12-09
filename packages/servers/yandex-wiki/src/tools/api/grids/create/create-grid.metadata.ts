import { buildToolName, ToolCategory, ToolPriority } from '@mcp-framework/core';
import type { StaticToolMetadata } from '@mcp-framework/core';
import { MCP_TOOL_PREFIX } from '#constants';

export const CREATE_GRID_TOOL_METADATA: StaticToolMetadata = {
  name: buildToolName('create_grid', MCP_TOOL_PREFIX),
  description: '[Grids/Write] Создать динамическую таблицу',
  category: ToolCategory.GRIDS,
  subcategory: 'write',
  priority: ToolPriority.HIGH,
  tags: ['write', 'create', 'grid', 'table'],
  isHelper: false,
  requiresExplicitUserConsent: false,
} as const;
