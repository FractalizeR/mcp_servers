/**
 * Метаданные для AddWorklogTool
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
 * Статические метаданные для AddWorklogTool
 */
export const ADD_WORKLOG_TOOL_METADATA: StaticToolMetadata = {
  name: buildToolName('add_worklog', MCP_TOOL_PREFIX),
  description: '[Worklog/Create] Добавить запись времени к задаче',
  category: ToolCategory.ISSUES,
  subcategory: 'worklog',
  priority: ToolPriority.HIGH,
  tags: ['worklog', 'add', 'create', 'time', 'log'],
  isHelper: false,
  requiresExplicitUserConsent: false,
} as const;
