import {
  buildToolName,
  ToolCategory,
  ToolPriority,
  buildOutputSchema,
} from '@fractalizer/mcp-core';
import type { StaticToolMetadata } from '@fractalizer/mcp-core';
import { MCP_TOOL_PREFIX } from '#constants';
import { CloneGridOutputDataSchema } from './clone-grid.schema.js';

export const CLONE_GRID_TOOL_METADATA: StaticToolMetadata = {
  name: buildToolName('clone_grid', MCP_TOOL_PREFIX),
  description: '[Grids/Write] Клонировать динамическую таблицу',
  category: ToolCategory.GRIDS,
  subcategory: 'write',
  priority: ToolPriority.NORMAL,
  tags: ['write', 'clone', 'copy', 'grid', 'table'],
  isHelper: false,
  requiresExplicitUserConsent: false,
  redactionAllowlist: ['idx', 'target', 'with_data'],
  title: 'Клонировать таблицу',
  outputSchema: buildOutputSchema(CloneGridOutputDataSchema),
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: true,
  },
} as const;
