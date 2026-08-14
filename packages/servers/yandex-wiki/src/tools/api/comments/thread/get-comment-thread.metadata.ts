import {
  buildToolName,
  ToolCategory,
  ToolPriority,
  buildCollectionOutputSchema,
} from '@fractalizer/mcp-core';
import type { StaticToolMetadata } from '@fractalizer/mcp-core';
import { MCP_TOOL_PREFIX } from '#constants';
import { CommentOutputSchema, CommentsSummarySchema } from '#common/schemas/index.js';

export const GET_COMMENT_THREAD_TOOL_METADATA: StaticToolMetadata = {
  name: buildToolName('get_comment_thread', MCP_TOOL_PREFIX),
  description:
    '[Comments/Read] Получить ответы в треде конкретного комментария ' +
    '(GET /pages/{id}/comments/{comment_id}/thread). В режиме links каждая ссылка ведёт на ' +
    'wiki://page-comment/{pageId}/{commentId} (тело читается через resources/read).',
  category: ToolCategory.COMMENTS,
  subcategory: 'read',
  priority: ToolPriority.NORMAL,
  tags: ['read', 'comments', 'wiki', 'thread'],
  isHelper: false,
  requiresExplicitUserConsent: false,
  redactionAllowlist: ['idx', 'comment_id', 'cursor', 'page_size', 'responseMode'],
  title: 'Получить тред комментария',
  outputSchema: buildCollectionOutputSchema(CommentOutputSchema, CommentsSummarySchema),
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
} as const;
