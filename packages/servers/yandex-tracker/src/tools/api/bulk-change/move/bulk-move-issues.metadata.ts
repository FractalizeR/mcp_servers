/**
 * Метаданные для BulkMoveIssuesTool
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
import { BulkMoveIssuesOutputSchema } from './bulk-move-issues.schema.js';

/**
 * Статические метаданные для BulkMoveIssuesTool
 */
export const BULK_MOVE_ISSUES_TOOL_METADATA: StaticToolMetadata = {
  name: buildToolName('bulk_move_issues', MCP_TOOL_PREFIX),
  description: '[Bulk/Write] Массовое перемещение задач между очередями',
  category: ToolCategory.ISSUES,
  subcategory: 'bulk',
  priority: ToolPriority.HIGH,
  tags: ['bulk', 'move', 'queue', 'transfer', 'write'],
  isHelper: false,
  requiresExplicitUserConsent: true,
  redactionAllowlist: ['queue', 'moveAllFields'],
  title: 'Массовое перемещение задач между очередями',
  outputSchema: BulkMoveIssuesOutputSchema,
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
} as const;
