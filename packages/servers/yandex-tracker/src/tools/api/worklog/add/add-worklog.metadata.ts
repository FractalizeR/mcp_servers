/**
 * Метаданные для AddWorklogTool
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
 * Статические метаданные для AddWorklogTool
 */
export const ADD_WORKLOG_TOOL_METADATA: StaticToolMetadata = {
  name: buildToolName('add_worklog', MCP_TOOL_PREFIX),
  description: '[Worklog/Create] Добавить записи времени к задачам (batch)',
  category: ToolCategory.ISSUES,
  subcategory: 'worklog',
  priority: ToolPriority.HIGH,
  tags: ['worklog', 'add', 'create', 'time', 'log', 'batch'],
  isHelper: false,
  requiresExplicitUserConsent: false,
} as const;
