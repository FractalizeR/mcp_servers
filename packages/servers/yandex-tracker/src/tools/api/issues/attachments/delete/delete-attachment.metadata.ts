/**
 * Метаданные для DeleteAttachment Tool
 *
 * Этот файл разрывает циркулярную зависимость между definition и tool
 * Оба файла импортируют только метаданные, не импортируя друг друга
 */

import { ToolCategory, ToolPriority, buildToolName } from '@mcp-framework/core';
import { MCP_TOOL_PREFIX } from '#constants';

/**
 * Статические метаданные для compile-time индексации
 */
export const DELETE_ATTACHMENT_TOOL_METADATA = {
  name: buildToolName('delete_attachment', MCP_TOOL_PREFIX),
  description: '[Issues/Attachments] Удалить файл из задачи',
  category: ToolCategory.ISSUES,
  subcategory: 'attachments',
  priority: ToolPriority.NORMAL,
  tags: ['attachments', 'write', 'delete', 'files'],
  isHelper: false,
  requiresExplicitUserConsent: true,
} as const;
