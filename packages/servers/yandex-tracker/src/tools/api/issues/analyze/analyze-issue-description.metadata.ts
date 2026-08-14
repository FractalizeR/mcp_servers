/**
 * Метаданные для AnalyzeIssueDescriptionTool
 *
 * Вынесены в отдельный файл — тот же приём, что у get-issues.metadata.ts /
 * update-issue.metadata.ts (разрыв циклической зависимости schema↔tool↔metadata).
 */

import { buildToolName, ToolCategory, ToolPriority } from '@fractalizer/mcp-core';
import type { StaticToolMetadata } from '@fractalizer/mcp-core';
import { MCP_TOOL_PREFIX } from '#constants';
import { AnalyzeIssueDescriptionOutputSchema } from './analyze-issue-description.schema.js';

/**
 * Статические метаданные для AnalyzeIssueDescriptionTool.
 *
 * `requiresExplicitUserConsent` отсутствует (read-only: инструмент только
 * читает задачу, ничего не пишет — правку применяет отдельный вызов
 * update_issue, у которого свой флаг). Имя НЕ содержит `update`/`execute`/
 * `delete`/`transition_issue`/`bulk`/`batch` — validate:tools не потребует
 * согласия для read-only инструмента (см. scripts/validate-tool-registration.ts).
 */
export const ANALYZE_ISSUE_DESCRIPTION_TOOL_METADATA: StaticToolMetadata = {
  name: buildToolName('analyze_issue_description', MCP_TOOL_PREFIX),
  description: '[Issues/Read] Анализ description задачи и предложение правки (пилот MCP Apps)',
  category: ToolCategory.ISSUES,
  subcategory: 'read',
  priority: ToolPriority.NORMAL,
  tags: ['issues', 'analyze', 'description', 'ui', 'apps'],
  isHelper: false,
  requiresExplicitUserConsent: false,
  // Только issueKey безопасен для лога как есть — description/suggestedDescription/notes
  // несут произвольный пользовательский текст (см. правило redactionAllowlist в
  // tool-metadata.ts framework/core).
  redactionAllowlist: ['issueKey'],
  title: 'Анализ описания задачи',
  outputSchema: AnalyzeIssueDescriptionOutputSchema,
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
} as const;
