/**
 * Metadata for GetProjectsTool
 */

import { buildToolName, ToolCategory, ToolPriority } from '@fractalizer/mcp-core';
import type { StaticToolMetadata } from '@fractalizer/mcp-core';
import { MCP_TOOL_PREFIX } from '#constants';

/**
 * Static metadata for GetProjectsTool
 */
export const GET_PROJECTS_TOOL_METADATA: StaticToolMetadata = {
  name: buildToolName('get_projects', MCP_TOOL_PREFIX),
  description:
    '[Projects/Read] Получить все проекты пользователя. Возвращает список проектов с фильтрацией полей.',
  category: ToolCategory.PROJECTS,
  subcategory: 'read',
  priority: ToolPriority.HIGH,
  tags: ['projects', 'list', 'read'],
  isHelper: false,
  requiresExplicitUserConsent: false,
} as const;
