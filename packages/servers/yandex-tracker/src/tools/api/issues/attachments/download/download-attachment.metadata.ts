/**
 * Метаданные для DownloadAttachmentTool
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
 * Статические метаданные для DownloadAttachmentTool
 */
export const DOWNLOAD_ATTACHMENT_TOOL_METADATA: StaticToolMetadata = {
  name: buildToolName('download_attachment', MCP_TOOL_PREFIX),
  description: '[Issues/Attachments] Скачать файл из задачи',
  category: ToolCategory.ISSUES,
  subcategory: 'attachments',
  priority: ToolPriority.HIGH,
  tags: ['attachments', 'read', 'download', 'files'],
  isHelper: false,
  requiresExplicitUserConsent: false,
} as const;
