/**
 * Метаданные для UpdateProjectTool
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
import { UpdateProjectOutputSchema } from './update-project.schema.js';

/**
 * Статические метаданные для UpdateProjectTool
 */
export const UPDATE_PROJECT_TOOL_METADATA: StaticToolMetadata = {
  name: buildToolName('update_project', MCP_TOOL_PREFIX),
  description: '[Projects/Write] Обновить проект (project, edit, update)',
  category: ToolCategory.PROJECTS,
  subcategory: 'write',
  priority: ToolPriority.CRITICAL,
  tags: ['project', 'update', 'write'],
  isHelper: false,
  requiresExplicitUserConsent: false,
  redactionAllowlist: [
    'projectId',
    'lead',
    'status',
    'startDate',
    'endDate',
    'queues',
    'teamUserIds',
    'fields',
  ],
  title: 'Обновить проект',
  outputSchema: UpdateProjectOutputSchema,
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
} as const;
