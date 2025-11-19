/**
 * Метаданные для DeleteChecklistItemTool
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
 * Статические метаданные для DeleteChecklistItemTool
 */
export const DELETE_CHECKLIST_ITEM_TOOL_METADATA: StaticToolMetadata = {
  name: buildToolName('delete_checklist_item', MCP_TOOL_PREFIX),
  description: '[Checklist/Write] Удалить элемент из чеклиста',
  category: ToolCategory.CHECKLISTS,
  subcategory: 'write',
  priority: ToolPriority.HIGH,
  tags: ['checklist', 'delete', 'remove', 'write'],
  isHelper: false,
  requiresExplicitUserConsent: true,
} as const;
