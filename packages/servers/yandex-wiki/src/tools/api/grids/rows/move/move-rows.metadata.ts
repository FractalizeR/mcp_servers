import {
  buildToolName,
  ToolCategory,
  ToolPriority,
  buildOutputSchema,
} from '@fractalizer/mcp-core';
import type { StaticToolMetadata } from '@fractalizer/mcp-core';
import { MCP_TOOL_PREFIX } from '#constants';
import { MoveRowsOutputDataSchema } from './move-rows.schema.js';

export const MOVE_ROWS_TOOL_METADATA: StaticToolMetadata = {
  name: buildToolName('move_rows', MCP_TOOL_PREFIX),
  description: '[Grids/Write] Переместить строки в таблице',
  category: ToolCategory.GRIDS,
  subcategory: 'write',
  priority: ToolPriority.LOW,
  tags: ['write', 'move', 'rows', 'grid', 'table'],
  isHelper: false,
  requiresExplicitUserConsent: false,
  redactionAllowlist: ['idx', 'revision', 'row_id', 'after_row_id', 'position', 'rows_count'],
  title: 'Переместить строки в таблице',
  outputSchema: buildOutputSchema(MoveRowsOutputDataSchema),
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
} as const;
