/**
 * Метаданные для BulkUpdateIssuesTool
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
import { BulkUpdateIssuesOutputSchema } from './bulk-update-issues.schema.js';

/**
 * Статические метаданные для BulkUpdateIssuesTool
 */
export const BULK_UPDATE_ISSUES_TOOL_METADATA: StaticToolMetadata = {
  name: buildToolName('bulk_update_issues', MCP_TOOL_PREFIX),
  description:
    '[Bulk/Write] Массовое обновление полей задач (bulk, batch, update) — быстрее update_issue по одной',
  category: ToolCategory.ISSUES,
  subcategory: 'bulk',
  priority: ToolPriority.HIGH,
  tags: ['bulk', 'update', 'mass', 'write'],
  isHelper: false,
  requiresExplicitUserConsent: false,
  // values — passthrough-объект, смешивающий безопасные (priority/type/tags) и
  // пользовательский текст (summary/description) на одном уровне вложенности —
  // не раскрываем ни один из его ключей, чтобы не задеть текстовые поля.
  redactionAllowlist: ['issues'],
  title: 'Массовое обновление полей задач',
  outputSchema: BulkUpdateIssuesOutputSchema,
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
} as const;
