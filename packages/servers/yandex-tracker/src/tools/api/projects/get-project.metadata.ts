/**
 * Метаданные для GetProjectTool
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
 * Статические метаданные для GetProjectTool
 */
export const GET_PROJECT_TOOL_METADATA: StaticToolMetadata = {
  name: buildToolName('get_project', MCP_TOOL_PREFIX),
  description: '[Projects/Read] Получить параметры проекта',
  category: ToolCategory.PROJECTS,
  subcategory: 'read',
  priority: ToolPriority.HIGH,
  tags: ['project', 'read', 'details'],
  isHelper: false,
  requiresExplicitUserConsent: false,
} as const;
