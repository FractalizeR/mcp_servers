/**
 * Метаданные для EditCommentTool
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
import { EditCommentOutputSchema } from '#tools/api/comments/edit/edit-comment.schema.js';

/**
 * Статические метаданные для EditCommentTool
 */
export const EDIT_COMMENT_TOOL_METADATA: StaticToolMetadata = {
  name: buildToolName('edit_comment', MCP_TOOL_PREFIX),
  description: '[Comments/Write] Редактировать комментарии (batch)',
  category: ToolCategory.COMMENTS,
  subcategory: 'write',
  priority: ToolPriority.HIGH,
  tags: ['comment', 'edit', 'update', 'write', 'batch'],
  isHelper: false,
  requiresExplicitUserConsent: true,
  redactionAllowlist: ['issueId', 'commentId', 'fields'],
  title: 'Редактировать комментарии',
  outputSchema: EditCommentOutputSchema,
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
} as const;
