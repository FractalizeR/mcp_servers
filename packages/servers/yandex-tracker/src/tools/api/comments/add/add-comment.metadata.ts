/**
 * Метаданные для AddCommentTool
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
 * Статические метаданные для AddCommentTool
 */
export const ADD_COMMENT_TOOL_METADATA: StaticToolMetadata = {
  name: buildToolName('add_comment', MCP_TOOL_PREFIX),
  description:
    '[Comments/Write] Добавить комментарии к одной или нескольким задачам. Каждая задача может иметь индивидуальный текст и вложения.',
  category: ToolCategory.COMMENTS,
  subcategory: 'write',
  priority: ToolPriority.CRITICAL,
  tags: ['comment', 'add', 'create', 'write', 'batch'],
  isHelper: false,
  requiresExplicitUserConsent: true,
} as const;
