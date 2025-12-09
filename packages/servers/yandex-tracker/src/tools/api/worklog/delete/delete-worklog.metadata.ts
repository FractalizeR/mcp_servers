/**
 * Метаданные для DeleteWorklogTool
 *
 * Вынесены в отдельный файл для разрыва циркулярной зависимости:
 * - definition.ts импортирует metadata (не tool)
 * - tool.ts импортирует metadata (не definition для METADATA)
 *
 * Это разрывает цикл: definition → tool → definition
 */

import { buildToolName, ToolCategory, ToolPriority } from '@mcp-framework/core';
import type { StaticToolMetadata } from '@mcp-framework/core';
import { MCP_TOOL_PREFIX } from '#constants';

/**
 * Статические метаданные для DeleteWorklogTool
 */
export const DELETE_WORKLOG_TOOL_METADATA: StaticToolMetadata = {
  name: buildToolName('delete_worklog', MCP_TOOL_PREFIX),
  description: '[Worklog/Delete] Удалить запись времени задачи',
  category: ToolCategory.ISSUES,
  subcategory: 'worklog',
  priority: ToolPriority.HIGH,
  tags: ['worklog', 'delete', 'remove', 'time'],
  isHelper: false,
  requiresExplicitUserConsent: true,
} as const;
