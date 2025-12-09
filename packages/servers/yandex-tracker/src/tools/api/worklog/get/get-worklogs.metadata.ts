/**
 * Метаданные для GetWorklogsTool
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
 * Статические метаданные для GetWorklogsTool
 */
export const GET_WORKLOGS_TOOL_METADATA: StaticToolMetadata = {
  name: buildToolName('get_worklogs', MCP_TOOL_PREFIX),
  description: '[Worklog/Read] Получить записи времени задач (batch)',
  category: ToolCategory.ISSUES,
  subcategory: 'worklog',
  priority: ToolPriority.HIGH,
  tags: ['worklog', 'get', 'list', 'read', 'time', 'batch'],
  isHelper: false,
  requiresExplicitUserConsent: false,
} as const;
