/**
 * Метаданные для GetGoalKeyResultsTool
 */

import { buildToolName, ToolCategory, ToolPriority } from '@fractalizer/mcp-core';
import type { StaticToolMetadata } from '@fractalizer/mcp-core';
import { MCP_TOOL_PREFIX } from '#constants';
import { GetGoalKeyResultsOutputSchema } from './get-goal-key-results.schema.js';

export const GET_GOAL_KEY_RESULTS_TOOL_METADATA: StaticToolMetadata = {
  name: buildToolName('get_goal_key_results', MCP_TOOL_PREFIX),
  description: '[Entities/Read] Получить Key Results (OKR-метрики) цели',
  category: ToolCategory.PROJECTS,
  subcategory: 'read',
  priority: ToolPriority.NORMAL,
  tags: ['entity', 'goal', 'key-result', 'okr', 'read'],
  isHelper: false,
  requiresExplicitUserConsent: false,
  redactionAllowlist: ['goalId', 'fields'],
  title: 'Key Results цели',
  outputSchema: GetGoalKeyResultsOutputSchema,
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
} as const;
