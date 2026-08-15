/**
 * Metadata for UpdateProjectTool
 */

import { buildToolName, ToolCategory, ToolPriority } from '@fractalizer/mcp-core';
import type { StaticToolMetadata } from '@fractalizer/mcp-core';
import { MCP_TOOL_PREFIX } from '#constants';
import { UPDATE_PROJECT_OUTPUT_SCHEMA } from './update-project.schema.js';

/**
 * Static metadata for UpdateProjectTool
 */
export const UPDATE_PROJECT_TOOL_METADATA: StaticToolMetadata = {
  name: buildToolName('update_project', MCP_TOOL_PREFIX),
  description: '[Projects/Write] Обновить проект.',
  category: ToolCategory.PROJECTS,
  subcategory: 'write',
  priority: ToolPriority.NORMAL,
  tags: ['project', 'update', 'edit'],
  isHelper: false,
  // Решение владельца (2026-08-14): requiresExplicitUserConsent обязан
  // совпадать с annotations.destructiveHint. update_project переписывает
  // отдельные поля (name/color/viewMode/closed) — обратимо повторным
  // вызовом с прежними значениями, данные не теряются безвозвратно, в
  // отличие от удаления или полной перезаписи без пути отката. Поэтому
  // НЕ разрушающая операция: оба флага false (было true/true).
  requiresExplicitUserConsent: false,
  redactionAllowlist: ['projectId'],
  title: 'Обновить проект',
  outputSchema: UPDATE_PROJECT_OUTPUT_SCHEMA,
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
} as const;
