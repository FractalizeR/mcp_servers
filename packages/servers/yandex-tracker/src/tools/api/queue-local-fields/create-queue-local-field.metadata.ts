/**
 * Метаданные для CreateQueueLocalFieldTool
 */

import { buildToolName, ToolCategory, ToolPriority } from '@fractalizer/mcp-core';
import type { StaticToolMetadata } from '@fractalizer/mcp-core';
import { MCP_TOOL_PREFIX } from '#constants';
import { CreateQueueLocalFieldOutputSchema } from './create-queue-local-field.schema.js';

export const CREATE_QUEUE_LOCAL_FIELD_TOOL_METADATA: StaticToolMetadata = {
  name: buildToolName('create_queue_local_field', MCP_TOOL_PREFIX),
  description: '[Queues/Write] Создать локальное поле очереди',
  category: ToolCategory.QUEUES,
  subcategory: 'write',
  priority: ToolPriority.NORMAL,
  tags: ['queue', 'local-fields', 'custom-fields', 'create', 'write'],
  isHelper: false,
  requiresExplicitUserConsent: true,
  redactionAllowlist: ['queueId', 'id', 'category', 'type', 'fields'],
  title: 'Создать локальное поле очереди',
  outputSchema: CreateQueueLocalFieldOutputSchema,
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: true,
  },
} as const;
