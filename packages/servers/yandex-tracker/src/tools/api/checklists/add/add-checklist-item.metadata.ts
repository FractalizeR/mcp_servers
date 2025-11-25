/**
 * Метаданные для AddChecklistItemTool
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
 * Статические метаданные для AddChecklistItemTool
 */
export const ADD_CHECKLIST_ITEM_TOOL_METADATA: StaticToolMetadata = {
  name: buildToolName('add_checklist_item', MCP_TOOL_PREFIX),
  description: '[Checklist/Write] Добавить элементы в чеклисты (batch)',
  category: ToolCategory.CHECKLISTS,
  subcategory: 'write',
  priority: ToolPriority.HIGH,
  tags: ['checklist', 'add', 'create', 'write', 'batch'],
  isHelper: false,
  requiresExplicitUserConsent: true,
} as const;
