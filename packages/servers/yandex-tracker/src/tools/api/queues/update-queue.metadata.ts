/**
 * Метаданные для UpdateQueueTool
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
 * Статические метаданные для UpdateQueueTool
 */
export const UPDATE_QUEUE_TOOL_METADATA: StaticToolMetadata = {
  name: buildToolName('update_queue', MCP_TOOL_PREFIX),
  description: '[Queues/Write] Обновить параметры очереди',
  category: ToolCategory.QUEUES,
  subcategory: 'write',
  priority: ToolPriority.CRITICAL,
  tags: ['queue', 'update', 'write'],
  isHelper: false,
  requiresExplicitUserConsent: true,
} as const;
