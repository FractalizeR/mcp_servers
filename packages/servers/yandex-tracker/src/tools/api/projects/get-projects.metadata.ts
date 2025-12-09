/**
 * Метаданные для GetProjectsTool
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
 * Статические метаданные для GetProjectsTool
 */
export const GET_PROJECTS_TOOL_METADATA: StaticToolMetadata = {
  name: buildToolName('get_projects', MCP_TOOL_PREFIX),
  description: '[Projects/Read] Получить список проектов',
  category: ToolCategory.PROJECTS,
  subcategory: 'read',
  priority: ToolPriority.HIGH,
  tags: ['project', 'read', 'list'],
  isHelper: false,
  requiresExplicitUserConsent: false,
} as const;
