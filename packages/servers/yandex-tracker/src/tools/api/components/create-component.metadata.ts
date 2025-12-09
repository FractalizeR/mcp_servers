/**
 * Метаданные для CreateComponentTool
 *
 * Вынесены в отдельный файл для разрыва циркулярной зависимости:
 * - definition.ts импортирует metadata (не tool)
 * - tool.ts импортирует metadata (не definition для METADATA)
 *
 * Это разрывает цикл: definition → tool → definition
 */

import { buildToolName, ToolCategory, ToolPriority } from '@mcp-framework/core';
import type { StaticToolMetadata } from '@mcp-framework/core';
import { MCP_TOOL_PREFIX } from '#constants';

/**
 * Статические метаданные для CreateComponentTool
 */
export const CREATE_COMPONENT_TOOL_METADATA: StaticToolMetadata = {
  name: buildToolName('create_component', MCP_TOOL_PREFIX),
  description: '[Components/Write] Создать компонент',
  category: ToolCategory.COMPONENTS,
  subcategory: 'write',
  priority: ToolPriority.HIGH,
  tags: ['components', 'create', 'write'],
  isHelper: false,
  requiresExplicitUserConsent: false,
} as const;
