/**
 * Метаданные для CreateGlobalFieldTool
 */

import { buildToolName, ToolCategory, ToolPriority } from '@fractalizer/mcp-core';
import type { StaticToolMetadata } from '@fractalizer/mcp-core';
import { MCP_TOOL_PREFIX } from '#constants';
import { CreateGlobalFieldOutputSchema } from './create-global-field.schema.js';

export const CREATE_GLOBAL_FIELD_TOOL_METADATA: StaticToolMetadata = {
  name: buildToolName('create_global_field', MCP_TOOL_PREFIX),
  description: '[Administration/Write] Создать глобальное поле (не локальное поле очереди)',
  category: ToolCategory.ISSUES,
  subcategory: 'write',
  priority: ToolPriority.NORMAL,
  tags: ['administration', 'fields', 'global-fields', 'create', 'write'],
  isHelper: false,
  requiresExplicitUserConsent: false,
  // Только структурные/идентификаторные поля — 'name'/'description'/'options.display'
  // могут содержать произвольный бизнес-текст, поэтому НЕ в allowlist.
  redactionAllowlist: ['schema', 'readonly', 'suggest', 'optionsProvider', 'fields'],
  title: 'Создать глобальное поле',
  outputSchema: CreateGlobalFieldOutputSchema,
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: true,
  },
} as const;
