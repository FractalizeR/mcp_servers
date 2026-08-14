/**
 * Метаданные для UpdateFilterTool
 */

import { buildToolName, ToolCategory, ToolPriority } from '@fractalizer/mcp-core';
import type { StaticToolMetadata } from '@fractalizer/mcp-core';
import { MCP_TOOL_PREFIX } from '#constants';
import { UpdateFilterOutputSchema } from './update-filter.schema.js';

export const UPDATE_FILTER_TOOL_METADATA: StaticToolMetadata = {
  name: buildToolName('update_filter', MCP_TOOL_PREFIX),
  description: '[Filters/Write] Обновить сохранённый фильтр',
  category: ToolCategory.ISSUES,
  subcategory: 'write',
  priority: ToolPriority.NORMAL,
  tags: ['filters', 'saved', 'update', 'write'],
  isHelper: false,
  requiresExplicitUserConsent: true,
  redactionAllowlist: ['filterId', 'groupBy', 'fields'],
  title: 'Обновить сохранённый фильтр',
  outputSchema: UpdateFilterOutputSchema,
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
} as const;
