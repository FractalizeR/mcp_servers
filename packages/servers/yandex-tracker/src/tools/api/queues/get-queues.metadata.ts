/**
 * Метаданные для GetQueuesTool
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
import { GetQueuesOutputSchema } from './get-queues.schema.js';

/**
 * Статические метаданные для GetQueuesTool
 */
export const GET_QUEUES_TOOL_METADATA: StaticToolMetadata = {
  name: buildToolName('get_queues', MCP_TOOL_PREFIX),
  description: '[Queues/Read] Получить список очередей (queue, list, search)',
  category: ToolCategory.QUEUES,
  subcategory: 'read',
  priority: ToolPriority.HIGH,
  tags: ['queues', 'list', 'read'],
  isHelper: false,
  requiresExplicitUserConsent: false,
  redactionAllowlist: ['perPage', 'cursor', 'expand', 'fields'],
  title: 'Список очередей',
  outputSchema: GetQueuesOutputSchema,
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
} as const;
