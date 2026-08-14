import {
  buildToolName,
  ToolCategory,
  ToolPriority,
  buildOutputSchema,
} from '@fractalizer/mcp-core';
import type { StaticToolMetadata } from '@fractalizer/mcp-core';
import { MCP_TOOL_PREFIX } from '#constants';
import { GetGridOutputDataSchema } from './get-grid.schema.js';

export const GET_GRID_TOOL_METADATA: StaticToolMetadata = {
  name: buildToolName('get_grid', MCP_TOOL_PREFIX),
  description: '[Grids/Read] Получить динамическую таблицу по ID',
  category: ToolCategory.GRIDS,
  subcategory: 'read',
  priority: ToolPriority.HIGH,
  tags: ['read', 'get', 'grid', 'table'],
  isHelper: false,
  requiresExplicitUserConsent: false,
  redactionAllowlist: ['idx', 'fields', 'only_cols', 'only_rows', 'sort'],
  title: 'Получить таблицу',
  outputSchema: buildOutputSchema(GetGridOutputDataSchema),
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
} as const;
