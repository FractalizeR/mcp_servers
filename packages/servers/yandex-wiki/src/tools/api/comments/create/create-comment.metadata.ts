import {
  buildToolName,
  ToolCategory,
  ToolPriority,
  buildOutputSchema,
} from '@fractalizer/mcp-core';
import type { StaticToolMetadata } from '@fractalizer/mcp-core';
import { MCP_TOOL_PREFIX } from '#constants';
import { CreateCommentOutputDataSchema } from './create-comment.schema.js';

export const CREATE_COMMENT_TOOL_METADATA: StaticToolMetadata = {
  name: buildToolName('create_comment', MCP_TOOL_PREFIX),
  description:
    '[Comments/Write] Создать комментарий на странице (POST /pages/{id}/comments). ' +
    'Передайте parent_id или thread_id, чтобы ответить в существующем треде вместо создания ' +
    'нового комментария верхнего уровня.',
  category: ToolCategory.COMMENTS,
  subcategory: 'write',
  priority: ToolPriority.NORMAL,
  tags: ['write', 'create', 'comments', 'wiki'],
  isHelper: false,
  requiresExplicitUserConsent: true,
  redactionAllowlist: ['idx', 'parent_id', 'thread_id'],
  title: 'Создать комментарий',
  outputSchema: buildOutputSchema(CreateCommentOutputDataSchema),
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: true,
  },
} as const;
