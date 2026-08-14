/**
 * Метаданные для CreateProjectTool
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
import { CreateProjectOutputSchema } from './create-project.schema.js';

/**
 * Статические метаданные для CreateProjectTool
 */
export const CREATE_PROJECT_TOOL_METADATA: StaticToolMetadata = {
  name: buildToolName('create_project', MCP_TOOL_PREFIX),
  description: '[Projects/Write] Создать новый проект',
  category: ToolCategory.PROJECTS,
  subcategory: 'write',
  priority: ToolPriority.CRITICAL,
  tags: ['project', 'create', 'write'],
  isHelper: false,
  requiresExplicitUserConsent: false,
  redactionAllowlist: [
    'key',
    'lead',
    'status',
    'startDate',
    'endDate',
    'queueIds',
    'teamUserIds',
    'fields',
  ],
  title: 'Создать проект',
  outputSchema: CreateProjectOutputSchema,
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: true,
  },
} as const;
