import {
  buildToolName,
  ToolCategory,
  ToolPriority,
  buildOutputSchema,
} from '@fractalizer/mcp-core';
import type { StaticToolMetadata } from '@fractalizer/mcp-core';
import { MCP_TOOL_PREFIX } from '#constants';
import { DeleteCommentOutputDataSchema } from './delete-comment.schema.js';

export const DELETE_COMMENT_TOOL_METADATA: StaticToolMetadata = {
  name: buildToolName('delete_comment', MCP_TOOL_PREFIX),
  description:
    '[Comments/Delete] Удалить комментарий (DELETE /pages/{id}/comments/{comment_id}). ' +
    'Необратимо — документация не описывает recovery_token для комментариев (в отличие от ' +
    'удаления страницы/таблицы).',
  category: ToolCategory.COMMENTS,
  subcategory: 'delete',
  priority: ToolPriority.NORMAL,
  tags: ['delete', 'comments', 'wiki'],
  isHelper: false,
  requiresExplicitUserConsent: true,
  redactionAllowlist: ['idx', 'comment_id'],
  title: 'Удалить комментарий',
  outputSchema: buildOutputSchema(DeleteCommentOutputDataSchema),
  annotations: {
    readOnlyHint: false,
    destructiveHint: true,
    idempotentHint: true,
    openWorldHint: true,
  },
} as const;
