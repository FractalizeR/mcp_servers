import {
  buildToolName,
  ToolCategory,
  ToolPriority,
  buildOutputSchema,
} from '@fractalizer/mcp-core';
import type { StaticToolMetadata } from '@fractalizer/mcp-core';
import { MCP_TOOL_PREFIX } from '#constants';
import { DeleteGridOutputDataSchema } from './delete-grid.schema.js';

export const DELETE_GRID_TOOL_METADATA: StaticToolMetadata = {
  name: buildToolName('delete_grid', MCP_TOOL_PREFIX),
  description: '[Grids/Delete] Удалить динамическую таблицу (необратимо, без recovery_token)',
  category: ToolCategory.GRIDS,
  subcategory: 'delete',
  priority: ToolPriority.NORMAL,
  tags: ['write', 'delete', 'grid', 'table'],
  isHelper: false,
  requiresExplicitUserConsent: true,
  redactionAllowlist: ['idx'],
  title: 'Удалить таблицу',
  outputSchema: buildOutputSchema(DeleteGridOutputDataSchema),
  annotations: {
    readOnlyHint: false,
    destructiveHint: true,
    idempotentHint: true,
    openWorldHint: true,
  },
} as const;
