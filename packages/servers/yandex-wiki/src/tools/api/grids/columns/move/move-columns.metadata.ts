import {
  buildToolName,
  ToolCategory,
  ToolPriority,
  buildOutputSchema,
} from '@fractalizer/mcp-core';
import type { StaticToolMetadata } from '@fractalizer/mcp-core';
import { MCP_TOOL_PREFIX } from '#constants';
import { MoveColumnsOutputDataSchema } from './move-columns.schema.js';

export const MOVE_COLUMNS_TOOL_METADATA: StaticToolMetadata = {
  name: buildToolName('move_columns', MCP_TOOL_PREFIX),
  description: '[Grids/Write] Переместить колонки в таблице',
  category: ToolCategory.GRIDS,
  subcategory: 'write',
  priority: ToolPriority.LOW,
  tags: ['write', 'move', 'columns', 'grid', 'table'],
  isHelper: false,
  requiresExplicitUserConsent: false,
  redactionAllowlist: ['idx', 'revision', 'column_slug', 'position', 'columns_count'],
  title: 'Переместить колонки в таблице',
  outputSchema: buildOutputSchema(MoveColumnsOutputDataSchema),
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
} as const;
