/**
 * Метаданные для UpdateGlobalFieldTool
 */

import { buildToolName, ToolCategory, ToolPriority } from '@fractalizer/mcp-core';
import type { StaticToolMetadata } from '@fractalizer/mcp-core';
import { MCP_TOOL_PREFIX } from '#constants';
import { UpdateGlobalFieldOutputSchema } from './update-global-field.schema.js';

export const UPDATE_GLOBAL_FIELD_TOOL_METADATA: StaticToolMetadata = {
  name: buildToolName('update_global_field', MCP_TOOL_PREFIX),
  description: '[Administration/Write] Обновить глобальное поле (не поле очереди)',
  category: ToolCategory.ISSUES,
  subcategory: 'write',
  priority: ToolPriority.NORMAL,
  tags: ['administration', 'fields', 'global-fields', 'update', 'write'],
  isHelper: false,
  requiresExplicitUserConsent: false,
  // Только структурные/идентификаторные поля — 'name'/'description'/'options.display'
  // могут содержать произвольный бизнес-текст, поэтому НЕ в allowlist.
  redactionAllowlist: ['fieldId', 'readonly', 'suggest', 'optionsProvider', 'fields'],
  title: 'Обновить глобальное поле',
  outputSchema: UpdateGlobalFieldOutputSchema,
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
} as const;
