/**
 * Метаданные для GetAttachmentsTool
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
 * Статические метаданные для GetAttachmentsTool
 */
export const GET_ATTACHMENTS_TOOL_METADATA: StaticToolMetadata = {
  name: buildToolName('get_attachments', MCP_TOOL_PREFIX),
  description: '[Issues/Attachments] Получить список файлов задачи',
  category: ToolCategory.ISSUES,
  subcategory: 'attachments',
  priority: ToolPriority.HIGH,
  tags: ['attachments', 'read', 'files', 'documents'],
  isHelper: false,
} as const;
