/**
 * Метаданные для DeleteCommentTool
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
 * Статические метаданные для DeleteCommentTool
 */
export const DELETE_COMMENT_TOOL_METADATA: StaticToolMetadata = {
  name: buildToolName('delete_comment', MCP_TOOL_PREFIX),
  description: '[Comments/Write] Удалить комментарии (batch)',
  category: ToolCategory.COMMENTS,
  subcategory: 'write',
  priority: ToolPriority.HIGH,
  tags: ['comment', 'delete', 'remove', 'write', 'batch'],
  isHelper: false,
  requiresExplicitUserConsent: true,
} as const;
