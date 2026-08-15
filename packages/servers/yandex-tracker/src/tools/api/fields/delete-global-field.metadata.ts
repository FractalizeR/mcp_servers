/**
 * Метаданные для DeleteGlobalFieldTool
 */

import { buildToolName, ToolCategory, ToolPriority } from '@fractalizer/mcp-core';
import type { StaticToolMetadata } from '@fractalizer/mcp-core';
import { MCP_TOOL_PREFIX } from '#constants';
import { DeleteGlobalFieldOutputSchema } from './delete-global-field.schema.js';

export const DELETE_GLOBAL_FIELD_TOOL_METADATA: StaticToolMetadata = {
  name: buildToolName('delete_global_field', MCP_TOOL_PREFIX),
  description: '[Administration/Write] Удалить глобальное поле трекера (необратимо)',
  category: ToolCategory.ISSUES,
  subcategory: 'delete',
  priority: ToolPriority.NORMAL,
  tags: ['administration', 'fields', 'global-fields', 'delete', 'write', 'remove'],
  isHelper: false,
  requiresExplicitUserConsent: true,
  redactionAllowlist: ['fieldId'],
  title: 'Удалить глобальное поле',
  outputSchema: DeleteGlobalFieldOutputSchema,
  annotations: {
    readOnlyHint: false,
    destructiveHint: true,
    idempotentHint: true,
    openWorldHint: true,
  },
} as const;
