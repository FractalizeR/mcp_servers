/**
 * Метаданные для UpdateChecklistItemTool
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
 * Статические метаданные для UpdateChecklistItemTool
 */
export const UPDATE_CHECKLIST_ITEM_TOOL_METADATA: StaticToolMetadata = {
  name: buildToolName('update_checklist_item', MCP_TOOL_PREFIX),
  description: '[Checklist/Write] Обновить элементы чеклистов (batch)',
  category: ToolCategory.CHECKLISTS,
  subcategory: 'write',
  priority: ToolPriority.HIGH,
  tags: ['checklist', 'update', 'edit', 'write', 'batch'],
  isHelper: false,
  requiresExplicitUserConsent: true,
} as const;
