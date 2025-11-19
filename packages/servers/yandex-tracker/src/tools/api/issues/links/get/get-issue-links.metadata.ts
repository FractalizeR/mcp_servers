/**
 * Метаданные для GetIssueLinksTool
 *
 * Вынесены в отдельный файл для разрыва циркулярной зависимости:
 * - definition.ts импортирует metadata (не tool)
 * - tool.ts импортирует metadata (не definition для METADATA)
 *
 * Это разрывает цикл: definition → tool → definition
 */

import { buildToolName, ToolCategory, ToolPriority } from '@mcp-framework/core';
import type { StaticToolMetadata } from '@mcp-framework/core';
import { MCP_TOOL_PREFIX } from '../../../../../constants.js';

/**
 * Статические метаданные для GetIssueLinksTool
 */
export const GET_ISSUE_LINKS_TOOL_METADATA: StaticToolMetadata = {
  name: buildToolName('get_issue_links', MCP_TOOL_PREFIX),
  description: '[Issues/Links] Получить связи задачи',
  category: ToolCategory.ISSUES,
  subcategory: 'links',
  priority: ToolPriority.HIGH,
  tags: ['links', 'read', 'relationships', 'subtasks'],
  isHelper: false,
} as const;
