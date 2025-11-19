/**
 * Метаданные для UpdateWorklogTool
 *
 * Вынесены в отдельный файл для разрыва циркулярной зависимости:
 * - definition.ts импортирует metadata (не tool)
 * - tool.ts импортирует metadata (не definition для METADATA)
 *
 * Это разрывает цикл: definition → tool → definition
 */

import { buildToolName, ToolCategory, ToolPriority } from '@mcp-framework/core';
import type { StaticToolMetadata } from '@mcp-framework/core';
import { MCP_TOOL_PREFIX } from '../../../../constants.js';

/**
 * Статические метаданные для UpdateWorklogTool
 */
export const UPDATE_WORKLOG_TOOL_METADATA: StaticToolMetadata = {
  name: buildToolName('update_worklog', MCP_TOOL_PREFIX),
  description: '[Worklog/Update] Обновить запись времени задачи',
  category: ToolCategory.ISSUES,
  subcategory: 'worklog',
  priority: ToolPriority.HIGH,
  tags: ['worklog', 'update', 'edit', 'modify', 'time'],
  isHelper: false,
  requiresExplicitUserConsent: false,
} as const;
