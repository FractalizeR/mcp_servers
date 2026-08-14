/**
 * Метаданные для GetQueueLocalFieldsTool
 */

import { buildToolName, ToolCategory, ToolPriority } from '@fractalizer/mcp-core';
import type { StaticToolMetadata } from '@fractalizer/mcp-core';
import { MCP_TOOL_PREFIX } from '#constants';
import { GetQueueLocalFieldsOutputSchema } from './get-queue-local-fields.schema.js';

export const GET_QUEUE_LOCAL_FIELDS_TOOL_METADATA: StaticToolMetadata = {
  name: buildToolName('get_queue_local_fields', MCP_TOOL_PREFIX),
  description: '[Queues/Read] Получить локальные поля очереди (кастомные поля)',
  category: ToolCategory.QUEUES,
  subcategory: 'read',
  priority: ToolPriority.NORMAL,
  tags: ['queue', 'local-fields', 'custom-fields', 'read'],
  isHelper: false,
  requiresExplicitUserConsent: false,
  redactionAllowlist: ['queueId', 'fields'],
  title: 'Локальные поля очереди',
  outputSchema: GetQueueLocalFieldsOutputSchema,
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
} as const;
