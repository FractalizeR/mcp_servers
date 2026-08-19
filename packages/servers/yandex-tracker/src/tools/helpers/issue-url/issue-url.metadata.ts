/**
 * Метаданные для IssueUrlTool
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
import { IssueUrlOutputSchema } from '#tools/helpers/issue-url/issue-url.schema.js';

/**
 * Статические метаданные для IssueUrlTool
 */
export const ISSUE_URL_TOOL_METADATA: StaticToolMetadata = {
  name: buildToolName('get_issue_urls', MCP_TOOL_PREFIX),
  description: '[Helpers/URL] Построить URL задачи (issue, url, link) в веб-интерфейсе Трекера',
  category: ToolCategory.HELPERS,
  subcategory: 'url',
  priority: ToolPriority.NORMAL,
  tags: ['url', 'link', 'helper'],
  isHelper: true,
  requiresExplicitUserConsent: false,
  redactionAllowlist: ['issueKeys'],
  title: 'URL задачи',
  outputSchema: IssueUrlOutputSchema,
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  },
} as const;
