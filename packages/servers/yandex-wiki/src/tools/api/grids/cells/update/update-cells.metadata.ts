import {
  buildToolName,
  ToolCategory,
  ToolPriority,
  buildOutputSchema,
} from '@fractalizer/mcp-core';
import type { StaticToolMetadata } from '@fractalizer/mcp-core';
import { MCP_TOOL_PREFIX } from '#constants';
import { UpdateCellsOutputDataSchema } from './update-cells.schema.js';

export const UPDATE_CELLS_TOOL_METADATA: StaticToolMetadata = {
  name: buildToolName('update_cells', MCP_TOOL_PREFIX),
  description: '[Grids/Write] Обновить ячейки в таблице (grid, table, cell, update)',
  category: ToolCategory.GRIDS,
  subcategory: 'write',
  priority: ToolPriority.NORMAL,
  tags: ['write', 'update', 'cells', 'grid', 'table'],
  isHelper: false,
  requiresExplicitUserConsent: true,
  redactionAllowlist: ['idx', 'revision'],
  title: 'Обновить ячейки таблицы',
  outputSchema: buildOutputSchema(UpdateCellsOutputDataSchema),
  annotations: {
    readOnlyHint: false,
    destructiveHint: true,
    idempotentHint: true,
    openWorldHint: true,
  },
} as const;
