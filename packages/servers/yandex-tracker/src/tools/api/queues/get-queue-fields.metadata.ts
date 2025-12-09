/**
 * Метаданные для GetQueueFieldsTool
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

/**
 * Статические метаданные для GetQueueFieldsTool
 */
export const GET_QUEUE_FIELDS_TOOL_METADATA: StaticToolMetadata = {
  name: buildToolName('get_queue_fields', MCP_TOOL_PREFIX),
  description: '[Queues/Read] Получить обязательные поля очереди',
  category: ToolCategory.QUEUES,
  subcategory: 'read',
  priority: ToolPriority.NORMAL,
  tags: ['queue', 'fields', 'read'],
  isHelper: false,
  requiresExplicitUserConsent: false,
} as const;
