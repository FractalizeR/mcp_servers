/**
 * Метаданные для AddCommentTool
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
 * Статические метаданные для AddCommentTool
 */
export const ADD_COMMENT_TOOL_METADATA: StaticToolMetadata = {
  name: buildToolName('add_comment', MCP_TOOL_PREFIX),
  description: '[Comments/Write] Добавить комментарии к задачам (batch).',
  category: ToolCategory.COMMENTS,
  subcategory: 'write',
  priority: ToolPriority.CRITICAL,
  tags: ['comment', 'add', 'create', 'write', 'batch'],
  isHelper: false,
  requiresExplicitUserConsent: true,
} as const;
