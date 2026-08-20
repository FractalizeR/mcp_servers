/**
 * Метаданные для GetIssuesTool
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
import { GetIssuesOutputSchema } from '#tools/api/issues/get/get-issues.schema.js';

/**
 * Статические метаданные для GetIssuesTool
 */
export const GET_ISSUES_TOOL_METADATA: StaticToolMetadata = {
  name: buildToolName('get_issues', MCP_TOOL_PREFIX),
  description:
    '[Issues/Read] Получить задачи по ключам (issue, ticket, get, fetch) — быстрее find_issues, если ключи уже известны',
  category: ToolCategory.ISSUES,
  subcategory: 'read',
  priority: ToolPriority.CRITICAL,
  tags: ['read', 'get', 'fetch', 'issue'],
  isHelper: false,
  requiresExplicitUserConsent: false,
  redactionAllowlist: ['issueIds', 'fields'],
  title: 'Задачи по ключам',
  outputSchema: GetIssuesOutputSchema,
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
} as const;
