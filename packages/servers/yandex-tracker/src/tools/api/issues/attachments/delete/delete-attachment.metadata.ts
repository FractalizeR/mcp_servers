/**
 * Метаданные для DeleteAttachmentTool
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
 * Статические метаданные для DeleteAttachmentTool
 */
export const DELETE_ATTACHMENT_TOOL_METADATA: StaticToolMetadata = {
  name: buildToolName('delete_attachment', MCP_TOOL_PREFIX),
  description: '[Issues/Attachments] Удалить файл из задачи',
  category: ToolCategory.ISSUES,
  subcategory: 'attachments',
  priority: ToolPriority.NORMAL,
  tags: ['attachments', 'write', 'delete', 'files'],
  isHelper: false,
} as const;
