/**
 * Метаданные для GetFiltersTool
 */

import { buildToolName, ToolCategory, ToolPriority } from '@fractalizer/mcp-core';
import type { StaticToolMetadata } from '@fractalizer/mcp-core';
import { MCP_TOOL_PREFIX } from '#constants';
import { GetFiltersOutputSchema } from './get-filters.schema.js';

export const GET_FILTERS_TOOL_METADATA: StaticToolMetadata = {
  name: buildToolName('get_filters', MCP_TOOL_PREFIX),
  description:
    '[Filters/Read] Избранные фильтры пользователя (filter, favorites, list) — неизбранные не вернутся',
  category: ToolCategory.ISSUES,
  subcategory: 'read',
  priority: ToolPriority.NORMAL,
  tags: ['filters', 'favorites', 'saved', 'list', 'read'],
  isHelper: false,
  requiresExplicitUserConsent: false,
  redactionAllowlist: ['fields'],
  title: 'Избранные фильтры',
  outputSchema: GetFiltersOutputSchema,
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
} as const;
