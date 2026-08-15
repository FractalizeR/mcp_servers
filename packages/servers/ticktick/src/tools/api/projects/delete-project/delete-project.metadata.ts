/**
 * Metadata for DeleteProjectTool
 */

import { buildToolName, ToolCategory, ToolPriority } from '@fractalizer/mcp-core';
import type { StaticToolMetadata } from '@fractalizer/mcp-core';
import { MCP_TOOL_PREFIX } from '#constants';
import { DELETE_PROJECT_OUTPUT_SCHEMA } from './delete-project.schema.js';

/**
 * Static metadata for DeleteProjectTool
 */
export const DELETE_PROJECT_TOOL_METADATA: StaticToolMetadata = {
  name: buildToolName('delete_project', MCP_TOOL_PREFIX),
  description: '[Projects/Write] Удалить проект. ВНИМАНИЕ: удаляет все задачи проекта!',
  category: ToolCategory.PROJECTS,
  // 'delete' отдельно от 'write' (M5 отчёта ревью): позволяет отключить все
  // удаляющие tools рубильником DISABLED_TOOL_GROUPS=projects:delete, не
  // затрагивая create_project/update_project.
  subcategory: 'delete',
  priority: ToolPriority.LOW,
  tags: ['project', 'delete', 'remove'],
  isHelper: false,
  requiresExplicitUserConsent: true,
  redactionAllowlist: ['projectId'],
  title: 'Удалить проект',
  outputSchema: DELETE_PROJECT_OUTPUT_SCHEMA,
  annotations: {
    readOnlyHint: false,
    destructiveHint: true,
    idempotentHint: true,
    openWorldHint: true,
  },
} as const;
