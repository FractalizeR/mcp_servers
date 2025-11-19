/**
 * Метаданные для DeleteProjectTool
 *
 * Вынесены в отдельный файл для разрыва циркулярной зависимости:
 * - definition.ts импортирует metadata (не tool)
 * - tool.ts импортирует metadata (не definition для METADATA)
 *
 * Это разрывает цикл: definition → tool → definition
 */

import { buildToolName, ToolCategory, ToolPriority } from '@mcp-framework/core';
import type { StaticToolMetadata } from '@mcp-framework/core';
import { MCP_TOOL_PREFIX } from '../../../constants.js';

/**
 * Статические метаданные для DeleteProjectTool
 */
export const DELETE_PROJECT_TOOL_METADATA: StaticToolMetadata = {
  name: buildToolName('delete_project', MCP_TOOL_PREFIX),
  description: '[Projects/Delete] Удалить проект',
  category: ToolCategory.PROJECTS,
  subcategory: 'delete',
  priority: ToolPriority.CRITICAL,
  tags: ['project', 'delete', 'remove'],
  isHelper: false,
  requiresExplicitUserConsent: true,
} as const;
