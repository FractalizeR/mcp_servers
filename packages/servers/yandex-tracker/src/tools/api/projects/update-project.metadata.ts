/**
 * Метаданные для UpdateProjectTool
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
 * Статические метаданные для UpdateProjectTool
 */
export const UPDATE_PROJECT_TOOL_METADATA: StaticToolMetadata = {
  name: buildToolName('update_project', MCP_TOOL_PREFIX),
  description: '[Projects/Write] Обновить проект',
  category: ToolCategory.PROJECTS,
  subcategory: 'write',
  priority: ToolPriority.CRITICAL,
  tags: ['project', 'update', 'write'],
  isHelper: false,
  requiresExplicitUserConsent: true,
} as const;
