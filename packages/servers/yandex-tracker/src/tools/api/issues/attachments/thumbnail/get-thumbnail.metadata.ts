/**
 * Метаданные для GetThumbnailTool
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
 * Статические метаданные для GetThumbnailTool
 */
export const GET_THUMBNAIL_TOOL_METADATA: StaticToolMetadata = {
  name: buildToolName('get_thumbnail', MCP_TOOL_PREFIX),
  description: '[Issues/Attachments] Получить миниатюру изображения',
  category: ToolCategory.ISSUES,
  subcategory: 'attachments',
  priority: ToolPriority.NORMAL,
  tags: ['attachments', 'read', 'thumbnail', 'images', 'preview'],
  isHelper: false,
  requiresExplicitUserConsent: false,
} as const;
