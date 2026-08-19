/**
 * Метаданные для DeleteProjectTool
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
import { DeleteProjectOutputSchema } from './delete-project.schema.js';

/**
 * Статические метаданные для DeleteProjectTool
 */
export const DELETE_PROJECT_TOOL_METADATA: StaticToolMetadata = {
  name: buildToolName('delete_project', MCP_TOOL_PREFIX),
  description: '[Projects/Delete] Удалить проект (project, delete, remove)',
  category: ToolCategory.PROJECTS,
  subcategory: 'delete',
  priority: ToolPriority.CRITICAL,
  tags: ['project', 'delete', 'remove'],
  isHelper: false,
  requiresExplicitUserConsent: true,
  redactionAllowlist: ['projectId'],
  title: 'Удалить проект',
  outputSchema: DeleteProjectOutputSchema,
  annotations: {
    readOnlyHint: false,
    destructiveHint: true,
    idempotentHint: true,
    openWorldHint: true,
  },
} as const;
