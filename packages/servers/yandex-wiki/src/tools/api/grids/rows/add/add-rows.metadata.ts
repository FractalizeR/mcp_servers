import {
  buildToolName,
  ToolCategory,
  ToolPriority,
  buildOutputSchema,
} from '@fractalizer/mcp-core';
import type { StaticToolMetadata } from '@fractalizer/mcp-core';
import { MCP_TOOL_PREFIX } from '#constants';
import { AddRowsOutputDataSchema } from './add-rows.schema.js';

export const ADD_ROWS_TOOL_METADATA: StaticToolMetadata = {
  name: buildToolName('add_rows', MCP_TOOL_PREFIX),
  description: '[Grids/Write] Добавить строки в таблицу (grid, table, row, add)',
  category: ToolCategory.GRIDS,
  subcategory: 'write',
  priority: ToolPriority.NORMAL,
  tags: ['write', 'add', 'rows', 'grid', 'table'],
  isHelper: false,
  requiresExplicitUserConsent: false,
  redactionAllowlist: ['idx', 'revision', 'position', 'after_row_id'],
  title: 'Добавить строки в таблицу',
  outputSchema: buildOutputSchema(AddRowsOutputDataSchema),
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: true,
  },
} as const;
