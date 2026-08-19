import {
  buildToolName,
  ToolCategory,
  ToolPriority,
  buildOutputSchema,
} from '@fractalizer/mcp-core';
import type { StaticToolMetadata } from '@fractalizer/mcp-core';
import { MCP_TOOL_PREFIX } from '#constants';
import { CreateGridOutputDataSchema } from './create-grid.schema.js';

export const CREATE_GRID_TOOL_METADATA: StaticToolMetadata = {
  name: buildToolName('create_grid', MCP_TOOL_PREFIX),
  description: '[Grids/Write] Создать динамическую таблицу (grid, table, spreadsheet, create)',
  category: ToolCategory.GRIDS,
  subcategory: 'write',
  priority: ToolPriority.HIGH,
  tags: ['write', 'create', 'grid', 'table'],
  isHelper: false,
  requiresExplicitUserConsent: false,
  redactionAllowlist: ['page_id', 'page_slug'],
  title: 'Создать таблицу',
  outputSchema: buildOutputSchema(CreateGridOutputDataSchema),
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: true,
  },
} as const;
