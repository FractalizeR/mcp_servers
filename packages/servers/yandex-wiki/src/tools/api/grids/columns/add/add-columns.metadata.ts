import {
  buildToolName,
  ToolCategory,
  ToolPriority,
  buildOutputSchema,
} from '@fractalizer/mcp-core';
import type { StaticToolMetadata } from '@fractalizer/mcp-core';
import { MCP_TOOL_PREFIX } from '#constants';
import { AddColumnsOutputDataSchema } from './add-columns.schema.js';

export const ADD_COLUMNS_TOOL_METADATA: StaticToolMetadata = {
  name: buildToolName('add_columns', MCP_TOOL_PREFIX),
  description: '[Grids/Write] Добавить колонки в таблицу',
  category: ToolCategory.GRIDS,
  subcategory: 'write',
  priority: ToolPriority.NORMAL,
  tags: ['write', 'add', 'columns', 'grid', 'table'],
  isHelper: false,
  requiresExplicitUserConsent: true,
  redactionAllowlist: ['idx', 'revision', 'position'],
  title: 'Добавить колонки в таблицу',
  outputSchema: buildOutputSchema(AddColumnsOutputDataSchema),
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: true,
  },
} as const;
