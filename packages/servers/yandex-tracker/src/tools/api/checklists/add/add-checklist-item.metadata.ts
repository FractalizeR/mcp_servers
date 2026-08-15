/**
 * Метаданные для AddChecklistItemTool
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
import { AddChecklistItemOutputSchema } from '#tools/api/checklists/add/add-checklist-item.schema.js';

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
  requiresExplicitUserConsent: false,
  redactionAllowlist: ['issueId', 'checked', 'assignee', 'deadline', 'fields'],
  title: 'Добавить элементы чеклиста',
  outputSchema: AddChecklistItemOutputSchema,
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: true,
  },
} as const;
