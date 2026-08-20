/**
 * Метаданные для FindIssuesTool
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
import { FindIssuesOutputSchema } from '#tools/api/issues/find/find-issues.schema.js';

/**
 * Статические метаданные для FindIssuesTool
 */
export const FIND_ISSUES_TOOL_METADATA: StaticToolMetadata = {
  name: buildToolName('find_issues', MCP_TOOL_PREFIX),
  description:
    '[Issues/Read] Поиск задач по фильтру (issue, search, query) — ключи заранее неизвестны, иначе get_issues быстрее',
  category: ToolCategory.ISSUES,
  subcategory: 'read',
  priority: ToolPriority.CRITICAL,
  tags: ['search', 'query', 'filter', 'issues'],
  isHelper: false,
  requiresExplicitUserConsent: false,
  // query/filter НЕ включены: поисковые запросы/фильтры могут нести произвольный
  // пользовательский текст.
  redactionAllowlist: [
    'queue',
    'issueIds',
    'filterId',
    'perPage',
    'cursor',
    'fields',
    'responseMode',
  ],
  title: 'Поиск задач',
  outputSchema: FindIssuesOutputSchema,
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
} as const;
