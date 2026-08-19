/**
 * Метаданные для BulkTransitionIssuesTool
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
import { BulkTransitionIssuesOutputSchema } from './bulk-transition-issues.schema.js';

/**
 * Статические метаданные для BulkTransitionIssuesTool
 */
export const BULK_TRANSITION_ISSUES_TOOL_METADATA: StaticToolMetadata = {
  name: buildToolName('bulk_transition_issues', MCP_TOOL_PREFIX),
  description:
    '[Bulk/Write] Массовая смена статусов задач (bulk, batch, transition) — быстрее transition_issue по одной',
  category: ToolCategory.ISSUES,
  subcategory: 'bulk',
  priority: ToolPriority.HIGH,
  tags: ['bulk', 'transition', 'status', 'workflow', 'write'],
  isHelper: false,
  requiresExplicitUserConsent: false,
  redactionAllowlist: ['transition'],
  title: 'Массовая смена статусов задач',
  outputSchema: BulkTransitionIssuesOutputSchema,
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: true,
  },
} as const;
