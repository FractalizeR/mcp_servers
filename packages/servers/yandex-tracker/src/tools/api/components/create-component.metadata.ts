/**
 * Метаданные для CreateComponentTool
 *
 * Вынесены в отдельный файл для разрыва циркулярной зависимости:
 * - definition.ts импортирует metadata (не tool)
 * - tool.ts импортирует metadata (не definition для METADATA)
 *
 * Это разрывает цикл: definition → tool → definition
 */

import { buildToolName, ToolCategory, ToolPriority } from '@fractalizer/mcp-core';
import type { StaticToolMetadata } from '@fractalizer/mcp-core';
import { MCP_TOOL_PREFIX } from '#constants';
import { CreateComponentOutputSchema } from './create-component.schema.js';

/**
 * Статические метаданные для CreateComponentTool
 */
export const CREATE_COMPONENT_TOOL_METADATA: StaticToolMetadata = {
  name: buildToolName('create_component', MCP_TOOL_PREFIX),
  description: '[Components/Write] Создать компонент очереди (component, create)',
  category: ToolCategory.COMPONENTS,
  subcategory: 'write',
  priority: ToolPriority.HIGH,
  tags: ['components', 'create', 'write'],
  isHelper: false,
  requiresExplicitUserConsent: false,
  redactionAllowlist: ['queueId', 'assignAuto', 'fields'],
  title: 'Создать компонент',
  outputSchema: CreateComponentOutputSchema,
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: true,
  },
} as const;
