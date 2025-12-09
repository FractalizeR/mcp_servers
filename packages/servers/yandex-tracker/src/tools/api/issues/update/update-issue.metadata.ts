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
} as const;
