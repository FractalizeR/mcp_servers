/**
 * Метаданные для UpdateChecklistItemTool
 *
 * Вынесены в отдельный файл для разрыва циркулярной зависимости:
 * - definition.ts импортирует metadata (не tool)
 * - tool.ts импортирует metadata (не definition для METADATA)
 *
 * Это разрывает цикл: definition → tool → definition
 */

import { buildToolName, ToolCategory, ToolPriority } from '@mcp-framework/core';
import type { StaticToolMetadata } from '@mcp-framework/core';
import { MCP_TOOL_PREFIX } from '../../../../constants.js';

/**
 * Статические метаданные для UpdateChecklistItemTool
 */
export const UPDATE_CHECKLIST_ITEM_TOOL_METADATA: StaticToolMetadata = {
  name: buildToolName('update_checklist_item', MCP_TOOL_PREFIX),
  description: '[Checklist/Write] Обновить элемент чеклиста',
  category: ToolCategory.CHECKLISTS,
  subcategory: 'write',
  priority: ToolPriority.HIGH,
  tags: ['checklist', 'update', 'edit', 'write'],
  isHelper: false,
  requiresExplicitUserConsent: true,
} as const;
