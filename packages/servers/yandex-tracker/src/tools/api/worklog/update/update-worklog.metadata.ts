/**
 * Метаданные для UpdateWorklogTool
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
import { UpdateWorklogOutputSchema } from '#tools/api/worklog/update/update-worklog.schema.js';

/**
 * Статические метаданные для UpdateWorklogTool
 */
export const UPDATE_WORKLOG_TOOL_METADATA: StaticToolMetadata = {
  name: buildToolName('update_worklog', MCP_TOOL_PREFIX),
  description: '[Worklog/Update] Обновить запись времени задачи',
  category: ToolCategory.ISSUES,
  subcategory: 'worklog',
  priority: ToolPriority.HIGH,
  tags: ['worklog', 'update', 'edit', 'modify', 'time'],
  isHelper: false,
  requiresExplicitUserConsent: false,
  redactionAllowlist: ['issueId', 'worklogId', 'start', 'duration', 'fields'],
  title: 'Обновить запись времени',
  outputSchema: UpdateWorklogOutputSchema,
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
} as const;
