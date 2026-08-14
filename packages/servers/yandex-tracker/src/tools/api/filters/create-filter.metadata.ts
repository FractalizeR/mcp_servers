/**
 * Метаданные для CreateFilterTool
 */

import { buildToolName, ToolCategory, ToolPriority } from '@fractalizer/mcp-core';
import type { StaticToolMetadata } from '@fractalizer/mcp-core';
import { MCP_TOOL_PREFIX } from '#constants';
import { CreateFilterOutputSchema } from './create-filter.schema.js';

export const CREATE_FILTER_TOOL_METADATA: StaticToolMetadata = {
  name: buildToolName('create_filter', MCP_TOOL_PREFIX),
  description: '[Filters/Write] Создать сохранённый фильтр',
  category: ToolCategory.ISSUES,
  subcategory: 'write',
  priority: ToolPriority.NORMAL,
  tags: ['filters', 'saved', 'create', 'write'],
  isHelper: false,
  requiresExplicitUserConsent: true,
  redactionAllowlist: ['groupBy', 'fields'],
  title: 'Создать сохранённый фильтр',
  outputSchema: CreateFilterOutputSchema,
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: true,
  },
} as const;
