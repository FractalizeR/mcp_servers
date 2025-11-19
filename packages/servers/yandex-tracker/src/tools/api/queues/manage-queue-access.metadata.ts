/**
 * Метаданные для ManageQueueAccessTool
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
 * Статические метаданные для ManageQueueAccessTool
 */
export const MANAGE_QUEUE_ACCESS_TOOL_METADATA: StaticToolMetadata = {
  name: buildToolName('manage_queue_access', MCP_TOOL_PREFIX),
  description: '[Queues/Write] Управление доступом к очереди',
  category: ToolCategory.QUEUES,
  subcategory: 'write',
  priority: ToolPriority.CRITICAL,
  tags: ['queue', 'access', 'permissions', 'write'],
  isHelper: false,
  requiresExplicitUserConsent: true,
} as const;
