import {
  buildToolName,
  ToolCategory,
  ToolPriority,
  buildOutputSchema,
} from '@fractalizer/mcp-core';
import type { StaticToolMetadata } from '@fractalizer/mcp-core';
import { MCP_TOOL_PREFIX } from '#constants';
import { RemoveRowsOutputDataSchema } from './remove-rows.schema.js';

export const REMOVE_ROWS_TOOL_METADATA: StaticToolMetadata = {
  name: buildToolName('remove_rows', MCP_TOOL_PREFIX),
  description: '[Grids/Write] Удалить строки из таблицы',
  category: ToolCategory.GRIDS,
  subcategory: 'write',
  priority: ToolPriority.NORMAL,
  tags: ['write', 'remove', 'delete', 'rows', 'grid', 'table'],
  isHelper: false,
  requiresExplicitUserConsent: true,
  redactionAllowlist: ['idx', 'revision', 'row_ids'],
  title: 'Удалить строки из таблицы',
  outputSchema: buildOutputSchema(RemoveRowsOutputDataSchema),
  annotations: {
    readOnlyHint: false,
    destructiveHint: true,
    idempotentHint: true,
    openWorldHint: true,
  },
} as const;
