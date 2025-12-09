/**
 * Метаданные для CreateIssueTool
 *
 * Вынесены в отдельный файл для разрыва циркулярной зависимости:
 * - definition.ts импортирует metadata (не tool)
 * - tool.ts импортирует metadata (не definition для METADATA)
 *
 * Это разрывает цикл: definition → tool → definition
 */

import { buildToolName, ToolCategory, ToolPriority } from '@mcp-framework/core';
import type { StaticToolMetadata } from '@mcp-framework/core';
import { MCP_TOOL_PREFIX } from '#constants';

/**
 * Статические метаданные для CreateIssueTool
 */
export const CREATE_ISSUE_TOOL_METADATA: StaticToolMetadata = {
  name: buildToolName('create_issue', MCP_TOOL_PREFIX),
  description: '[Issues/Write] Создать новую задачу',
  category: ToolCategory.ISSUES,
  subcategory: 'write',
  priority: ToolPriority.CRITICAL,
  tags: ['create', 'new', 'write', 'issue'],
  isHelper: false,
  requiresExplicitUserConsent: false,
} as const;
