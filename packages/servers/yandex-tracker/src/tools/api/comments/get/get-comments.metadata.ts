/**
 * Метаданные для GetCommentsTool
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
 * Статические метаданные для GetCommentsTool
 */
export const GET_COMMENTS_TOOL_METADATA: StaticToolMetadata = {
  name: buildToolName('get_comments', MCP_TOOL_PREFIX),
  description: '[Comments/Read] Получить комментарии задачи',
  category: ToolCategory.COMMENTS,
  subcategory: 'read',
  priority: ToolPriority.HIGH,
  tags: ['comment', 'get', 'list', 'read'],
  isHelper: false,
  requiresExplicitUserConsent: false,
} as const;
