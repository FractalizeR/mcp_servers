/**
 * Метаданные для GetChecklistTool
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
 * Статические метаданные для GetChecklistTool
 */
export const GET_CHECKLIST_TOOL_METADATA: StaticToolMetadata = {
  name: buildToolName('get_checklist', MCP_TOOL_PREFIX),
  description: '[Checklist/Read] Получить чеклисты задач (batch)',
  category: ToolCategory.CHECKLISTS,
  subcategory: 'read',
  priority: ToolPriority.HIGH,
  tags: ['checklist', 'get', 'read', 'batch'],
  isHelper: false,
  requiresExplicitUserConsent: false,
} as const;
