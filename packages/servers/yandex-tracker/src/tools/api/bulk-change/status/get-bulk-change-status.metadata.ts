/**
 * Метаданные для GetBulkChangeStatusTool
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
 * Статические метаданные для GetBulkChangeStatusTool
 */
export const GET_BULK_CHANGE_STATUS_TOOL_METADATA: StaticToolMetadata = {
  name: buildToolName('get_bulk_change_status', MCP_TOOL_PREFIX),
  description: '[Bulk/Read] Получить статус bulk операции',
  category: ToolCategory.ISSUES,
  subcategory: 'bulk',
  priority: ToolPriority.NORMAL,
  tags: ['bulk', 'status', 'progress', 'read'],
  isHelper: false,
  requiresExplicitUserConsent: false,
} as const;
