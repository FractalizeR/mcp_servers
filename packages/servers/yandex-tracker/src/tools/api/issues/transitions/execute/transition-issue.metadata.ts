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
  requiresExplicitUserConsent: true,
} as const;
