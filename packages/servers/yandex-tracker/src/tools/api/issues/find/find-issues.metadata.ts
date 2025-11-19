/**
 * Метаданные для FindIssuesTool
 *
 * Вынесены в отдельный файл для разрыва циркулярной зависимости:
 * - definition.ts импортирует metadata (не tool)
 * - tool.ts импортирует metadata (не definition для METADATA)
 *
 * Это разрывает цикл: definition → tool → definition
 */

import { buildToolName, ToolCategory, ToolPriority } from '@mcp-framework/core';
import type { StaticToolMetadata } from '@mcp-framework/core';
import { MCP_TOOL_PREFIX } from '../../../../constants.js';

/**
 * Статические метаданные для FindIssuesTool
 */
export const FIND_ISSUES_TOOL_METADATA: StaticToolMetadata = {
  name: buildToolName('find_issues', MCP_TOOL_PREFIX),
  description: '[Issues/Read] Поиск по фильтру',
  category: ToolCategory.ISSUES,
  subcategory: 'read',
  priority: ToolPriority.CRITICAL,
  tags: ['search', 'query', 'filter', 'issues'],
  isHelper: false,
} as const;
