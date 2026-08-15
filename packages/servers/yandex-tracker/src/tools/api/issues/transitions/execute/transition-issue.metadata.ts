/**
 * Метаданные для TransitionIssueTool
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
import { TransitionIssueOutputSchema } from '#tools/api/issues/transitions/execute/transition-issue.schema.js';

/**
 * Статические метаданные для TransitionIssueTool
 */
export const TRANSITION_ISSUE_TOOL_METADATA: StaticToolMetadata = {
  name: buildToolName('transition_issue', MCP_TOOL_PREFIX),
  description: '[Issues/Workflow] Выполнить переход задачи',
  category: ToolCategory.ISSUES,
  subcategory: 'workflow',
  priority: ToolPriority.HIGH,
  tags: ['transition', 'status', 'workflow', 'write'],
  isHelper: false,
  requiresExplicitUserConsent: false,
  redactionAllowlist: ['issueKey', 'transitionId', 'fields'],
  title: 'Выполнить переход задачи',
  outputSchema: TransitionIssueOutputSchema,
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: true,
  },
} as const;
