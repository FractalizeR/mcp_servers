/**
 * Метаданные для IssueUrlTool
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
 * Статические метаданные для IssueUrlTool
 */
export const ISSUE_URL_TOOL_METADATA: StaticToolMetadata = {
  name: buildToolName('get_issue_urls', MCP_TOOL_PREFIX),
  description: '[Helpers/URL] URL задачи',
  category: ToolCategory.HELPERS,
  subcategory: 'url',
  priority: ToolPriority.NORMAL,
  tags: ['url', 'link', 'helper'],
  isHelper: true,
  requiresExplicitUserConsent: false,
} as const;
