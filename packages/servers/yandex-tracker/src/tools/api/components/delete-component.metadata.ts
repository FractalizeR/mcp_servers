/**
 * Метаданные для DeleteComponentTool
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
import { DeleteComponentOutputSchema } from './delete-component.schema.js';

/**
 * Статические метаданные для DeleteComponentTool
 */
export const DELETE_COMPONENT_TOOL_METADATA: StaticToolMetadata = {
  name: buildToolName('delete_component', MCP_TOOL_PREFIX),
  description: '[Components/Write] Удалить компонент очереди (component, delete, remove)',
  category: ToolCategory.COMPONENTS,
  subcategory: 'delete',
  priority: ToolPriority.HIGH,
  tags: ['components', 'delete', 'write', 'remove'],
  isHelper: false,
  requiresExplicitUserConsent: true,
  redactionAllowlist: ['componentId'],
  title: 'Удалить компонент',
  outputSchema: DeleteComponentOutputSchema,
  annotations: {
    readOnlyHint: false,
    destructiveHint: true,
    idempotentHint: true,
    openWorldHint: true,
  },
} as const;
