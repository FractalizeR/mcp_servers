/**
 * Метаданные для UpdateIssueTool
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
import { UpdateIssueOutputSchema } from '#tools/api/issues/update/update-issue.schema.js';

/**
 * Статические метаданные для UpdateIssueTool
 */
export const UPDATE_ISSUE_TOOL_METADATA: StaticToolMetadata = {
  name: buildToolName('update_issue', MCP_TOOL_PREFIX),
  description: '[Issues/Write] Обновить поля задачи',
  category: ToolCategory.ISSUES,
  subcategory: 'write',
  priority: ToolPriority.CRITICAL,
  tags: ['update', 'edit', 'modify', 'write'],
  isHelper: false,
  requiresExplicitUserConsent: true,
  redactionAllowlist: ['issueKey', 'assignee', 'priority', 'type', 'status', 'fields'],
  title: 'Обновить задачу',
  outputSchema: UpdateIssueOutputSchema,
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
} as const;
