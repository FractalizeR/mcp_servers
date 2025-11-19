/**
 * Метаданные для GetQueueTool
 *
 * Вынесены в отдельный файл для разрыва циркулярной зависимости:
 * - definition.ts импортирует metadata (не tool)
 * - tool.ts импортирует metadata (не definition для METADATA)
 *
 * Это разрывает цикл: definition → tool → definition
 */

import { buildToolName, ToolCategory, ToolPriority } from '@mcp-framework/core';
import type { StaticToolMetadata } from '@mcp-framework/core';
import { MCP_TOOL_PREFIX } from '../../../constants.js';

/**
 * Статические метаданные для GetQueueTool
 */
export const GET_QUEUE_TOOL_METADATA: StaticToolMetadata = {
  name: buildToolName('get_queue', MCP_TOOL_PREFIX),
  description: '[Queues/Read] Получить параметры очереди',
  category: ToolCategory.QUEUES,
  subcategory: 'read',
  priority: ToolPriority.HIGH,
  tags: ['queue', 'read', 'details'],
  isHelper: false,
  requiresExplicitUserConsent: false,
} as const;
