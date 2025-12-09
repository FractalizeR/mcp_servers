/**
 * Метаданные для CreateQueueTool
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
 * Статические метаданные для CreateQueueTool
 */
export const CREATE_QUEUE_TOOL_METADATA: StaticToolMetadata = {
  name: buildToolName('create_queue', MCP_TOOL_PREFIX),
  description: '[Queues/Write] Создать новую очередь',
  category: ToolCategory.QUEUES,
  subcategory: 'write',
  priority: ToolPriority.CRITICAL,
  tags: ['queue', 'create', 'write'],
  isHelper: false,
  requiresExplicitUserConsent: false,
} as const;
