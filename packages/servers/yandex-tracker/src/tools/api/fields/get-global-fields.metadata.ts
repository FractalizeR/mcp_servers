/**
 * Метаданные для GetGlobalFieldsTool
 */

import { buildToolName, ToolCategory, ToolPriority } from '@fractalizer/mcp-core';
import type { StaticToolMetadata } from '@fractalizer/mcp-core';
import { MCP_TOOL_PREFIX } from '#constants';
import { GetGlobalFieldsOutputSchema } from './get-global-fields.schema.js';

export const GET_GLOBAL_FIELDS_TOOL_METADATA: StaticToolMetadata = {
  name: buildToolName('get_global_fields', MCP_TOOL_PREFIX),
  description: '[Administration/Read] Глобальные поля трекера (не локальные поля очереди)',
  category: ToolCategory.ISSUES,
  subcategory: 'read',
  priority: ToolPriority.NORMAL,
  tags: ['administration', 'fields', 'global-fields', 'reference', 'read'],
  isHelper: false,
  requiresExplicitUserConsent: false,
  redactionAllowlist: ['fields'],
  title: 'Глобальные поля трекера',
  outputSchema: GetGlobalFieldsOutputSchema,
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
} as const;
