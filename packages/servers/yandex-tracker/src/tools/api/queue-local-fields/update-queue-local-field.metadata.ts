/**
 * Метаданные для UpdateQueueLocalFieldTool
 */

import { buildToolName, ToolCategory, ToolPriority } from '@fractalizer/mcp-core';
import type { StaticToolMetadata } from '@fractalizer/mcp-core';
import { MCP_TOOL_PREFIX } from '#constants';
import { UpdateQueueLocalFieldOutputSchema } from './update-queue-local-field.schema.js';

export const UPDATE_QUEUE_LOCAL_FIELD_TOOL_METADATA: StaticToolMetadata = {
  name: buildToolName('update_queue_local_field', MCP_TOOL_PREFIX),
  description: '[Queues/Write] Обновить локальное поле очереди (адресация по key)',
  category: ToolCategory.QUEUES,
  subcategory: 'write',
  priority: ToolPriority.NORMAL,
  tags: ['queue', 'local-fields', 'custom-fields', 'update', 'write'],
  isHelper: false,
  requiresExplicitUserConsent: false,
  redactionAllowlist: [
    'queueId',
    'key',
    'category',
    'order',
    'readonly',
    'visible',
    'hidden',
    'fields',
  ],
  title: 'Обновить локальное поле очереди',
  outputSchema: UpdateQueueLocalFieldOutputSchema,
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
} as const;
