/**
 * Metadata for GetProjectsTool
 */

import { buildToolName, ToolCategory, ToolPriority } from '@fractalizer/mcp-core';
import type { StaticToolMetadata } from '@fractalizer/mcp-core';
import { MCP_TOOL_PREFIX } from '#constants';
import { GET_PROJECTS_OUTPUT_SCHEMA } from './get-projects.schema.js';

/**
 * Static metadata for GetProjectsTool
 */
export const GET_PROJECTS_TOOL_METADATA: StaticToolMetadata = {
  name: buildToolName('get_projects', MCP_TOOL_PREFIX),
  // M9 отчёта ревью: было 98 символов (лимит — 80). Деталь про фильтрацию
  // полей избыточна в description — она уже описана в .describe() параметра
  // fields (см. схему), как и у остальных read-tools этого пакета.
  description: '[Projects/Read] Получить все проекты пользователя.',
  category: ToolCategory.PROJECTS,
  subcategory: 'read',
  priority: ToolPriority.HIGH,
  tags: ['projects', 'list', 'read'],
  isHelper: false,
  requiresExplicitUserConsent: false,
  redactionAllowlist: [],
  title: 'Список проектов',
  outputSchema: GET_PROJECTS_OUTPUT_SCHEMA,
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
} as const;
