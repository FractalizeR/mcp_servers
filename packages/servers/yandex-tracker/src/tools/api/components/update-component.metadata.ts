/**
 * Метаданные для UpdateComponentTool
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

/**
 * Статические метаданные для UpdateComponentTool
 */
export const UPDATE_COMPONENT_TOOL_METADATA: StaticToolMetadata = {
  name: buildToolName('update_component', MCP_TOOL_PREFIX),
  description: '[Components/Write] Обновить компонент',
  category: ToolCategory.COMPONENTS,
  subcategory: 'write',
  priority: ToolPriority.HIGH,
  tags: ['components', 'update', 'write', 'modify'],
  isHelper: false,
  requiresExplicitUserConsent: true,
} as const;
