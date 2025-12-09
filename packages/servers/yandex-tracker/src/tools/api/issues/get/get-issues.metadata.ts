/**
 * Метаданные для GetIssuesTool
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
 * Статические метаданные для GetIssuesTool
 */
export const GET_ISSUES_TOOL_METADATA: StaticToolMetadata = {
  name: buildToolName('get_issues', MCP_TOOL_PREFIX),
  description: '[Issues/Read] Получить задачи',
  category: ToolCategory.ISSUES,
  subcategory: 'read',
  priority: ToolPriority.CRITICAL,
  tags: ['read', 'get', 'fetch', 'issue'],
  isHelper: false,
  requiresExplicitUserConsent: false,
} as const;
