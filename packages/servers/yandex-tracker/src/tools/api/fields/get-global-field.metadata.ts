/**
 * Метаданные для GetGlobalFieldTool
 */

import { buildToolName, ToolCategory, ToolPriority } from '@fractalizer/mcp-core';
import type { StaticToolMetadata } from '@fractalizer/mcp-core';
import { MCP_TOOL_PREFIX } from '#constants';
import { GetGlobalFieldOutputSchema } from './get-global-field.schema.js';

export const GET_GLOBAL_FIELD_TOOL_METADATA: StaticToolMetadata = {
  name: buildToolName('get_global_field', MCP_TOOL_PREFIX),
  description: '[Administration/Read] Глобальное поле трекера по ID (не поле очереди)',
  category: ToolCategory.ISSUES,
  subcategory: 'read',
  priority: ToolPriority.NORMAL,
  tags: ['administration', 'fields', 'global-fields', 'reference', 'read'],
  isHelper: false,
  requiresExplicitUserConsent: false,
  redactionAllowlist: ['fieldId', 'fields'],
  title: 'Глобальное поле трекера',
  outputSchema: GetGlobalFieldOutputSchema,
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
} as const;
