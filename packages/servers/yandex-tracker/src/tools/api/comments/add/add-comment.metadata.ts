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
import { AddCommentOutputSchema } from '#tools/api/comments/add/add-comment.schema.js';

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
  // issueId/attachmentIds/summonees/maillistSummonees — идентификаторы (логины/ID/email,
  // безопасны); markupType/isAddToFollowers — структурные флаги; fields — имена API-полей.
  // text (тело комментария) НЕ включён.
  redactionAllowlist: [
    'issueId',
    'attachmentIds',
    'summonees',
    'maillistSummonees',
    'markupType',
    'isAddToFollowers',
    'fields',
  ],
  title: 'Добавить комментарии',
  outputSchema: AddCommentOutputSchema,
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: true,
  },
} as const;
