/**
 * Метаданные для GetIssueChangelogTool
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
 * Статические метаданные для GetIssueChangelogTool
 */
export const GET_ISSUE_CHANGELOG_TOOL_METADATA: StaticToolMetadata = {
  name: buildToolName('get_issue_changelog', MCP_TOOL_PREFIX),
  description: '[Issues/Read] История изменений задач (batch)',
  category: ToolCategory.ISSUES,
  subcategory: 'read',
  priority: ToolPriority.HIGH,
  tags: ['history', 'changelog', 'audit', 'read', 'batch'],
  isHelper: false,
} as const;
