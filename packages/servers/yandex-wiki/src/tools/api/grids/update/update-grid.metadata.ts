import {
  buildToolName,
  ToolCategory,
  ToolPriority,
  buildOutputSchema,
} from '@fractalizer/mcp-core';
import type { StaticToolMetadata } from '@fractalizer/mcp-core';
import { MCP_TOOL_PREFIX } from '#constants';
import { UpdateGridOutputDataSchema } from './update-grid.schema.js';

export const UPDATE_GRID_TOOL_METADATA: StaticToolMetadata = {
  name: buildToolName('update_grid', MCP_TOOL_PREFIX),
  description: '[Grids/Write] Обновить динамическую таблицу (grid, table, spreadsheet, update)',
  category: ToolCategory.GRIDS,
  subcategory: 'write',
  priority: ToolPriority.NORMAL,
  tags: ['write', 'update', 'grid', 'table'],
  isHelper: false,
  requiresExplicitUserConsent: true,
  redactionAllowlist: ['idx', 'revision'],
  title: 'Обновить таблицу',
  outputSchema: buildOutputSchema(UpdateGridOutputDataSchema),
  annotations: {
    readOnlyHint: false,
    destructiveHint: true,
    idempotentHint: true,
    openWorldHint: true,
  },
} as const;
