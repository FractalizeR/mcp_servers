/**
 * Метаданные для ClearGoalKeyResultsTool
 */

import { buildToolName, ToolCategory, ToolPriority } from '@fractalizer/mcp-core';
import type { StaticToolMetadata } from '@fractalizer/mcp-core';
import { MCP_TOOL_PREFIX } from '#constants';
import { ClearGoalKeyResultsOutputSchema } from './clear-goal-key-results.schema.js';

export const CLEAR_GOAL_KEY_RESULTS_TOOL_METADATA: StaticToolMetadata = {
  name: buildToolName('clear_goal_key_results', MCP_TOOL_PREFIX),
  description: '[Entities/Write] Удалить все Key Results цели',
  category: ToolCategory.PROJECTS,
  subcategory: 'write',
  priority: ToolPriority.NORMAL,
  tags: ['entity', 'goal', 'key-result', 'okr', 'write', 'delete', 'clear'],
  isHelper: false,
  requiresExplicitUserConsent: true,
  redactionAllowlist: ['goalId'],
  title: 'Очистить Key Results',
  outputSchema: ClearGoalKeyResultsOutputSchema,
  annotations: {
    readOnlyHint: false,
    destructiveHint: true,
    idempotentHint: true,
    openWorldHint: true,
  },
} as const;
