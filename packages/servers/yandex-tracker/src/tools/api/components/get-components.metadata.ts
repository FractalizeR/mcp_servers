/**
 * Метаданные для GetComponentsTool
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
 * Статические метаданные для GetComponentsTool
 */
export const GET_COMPONENTS_TOOL_METADATA: StaticToolMetadata = {
  name: buildToolName('get_components', MCP_TOOL_PREFIX),
  description: '[Components/Read] Получить список компонентов очереди',
  category: ToolCategory.COMPONENTS,
  subcategory: 'read',
  priority: ToolPriority.HIGH,
  tags: ['components', 'list', 'read', 'queue'],
  isHelper: false,
  requiresExplicitUserConsent: false,
} as const;
