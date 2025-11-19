/**
 * Метаданные для GetIssueTransitionsTool
 *
 * Вынесены в отдельный файл для разрыва циркулярной зависимости:
 * - definition.ts импортирует metadata (не tool)
 * - tool.ts импортирует metadata (не definition для METADATA)
 *
 * Это разрывает цикл: definition → tool → definition
 */

import { buildToolName, ToolCategory, ToolPriority } from '@mcp-framework/core';
import type { StaticToolMetadata } from '@mcp-framework/core';
import { MCP_TOOL_PREFIX } from '../../../../../constants.js';

/**
 * Статические метаданные для GetIssueTransitionsTool
 */
export const GET_ISSUE_TRANSITIONS_TOOL_METADATA: StaticToolMetadata = {
  name: buildToolName('get_issue_transitions', MCP_TOOL_PREFIX),
  description: '[Issues/Workflow] Доступные переходы',
  category: ToolCategory.ISSUES,
  subcategory: 'workflow',
  priority: ToolPriority.HIGH,
  tags: ['transitions', 'statuses', 'workflow', 'read'],
  isHelper: false,
} as const;
