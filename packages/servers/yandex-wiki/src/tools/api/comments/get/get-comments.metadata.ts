import {
  buildToolName,
  ToolCategory,
  ToolPriority,
  buildCollectionOutputSchema,
} from '@fractalizer/mcp-core';
import type { StaticToolMetadata } from '@fractalizer/mcp-core';
import { MCP_TOOL_PREFIX } from '#constants';
import { CommentOutputSchema, CommentsSummarySchema } from '#common/schemas/index.js';

export const GET_COMMENTS_TOOL_METADATA: StaticToolMetadata = {
  name: buildToolName('get_comments', MCP_TOOL_PREFIX),
  description:
    '[Comments/Read] Получить комментарии страницы (GET /pages/{id}/comments). ' +
    'Верхнеуровневый список — без вложенных ответов треда (см. yw_get_comment_thread для ответов ' +
    'на конкретный комментарий). В режиме links каждая ссылка ведёт на wiki://page-comment/' +
    '{pageId}/{commentId} (тело читается через resources/read).',
  category: ToolCategory.COMMENTS,
  subcategory: 'read',
  priority: ToolPriority.NORMAL,
  tags: ['read', 'comments', 'wiki'],
  isHelper: false,
  requiresExplicitUserConsent: false,
  redactionAllowlist: [
    'idx',
    'cursor',
    'order_direction',
    'page_size',
    'status_filter',
    'responseMode',
  ],
  title: 'Получить комментарии страницы',
  outputSchema: buildCollectionOutputSchema(CommentOutputSchema, CommentsSummarySchema),
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
} as const;
