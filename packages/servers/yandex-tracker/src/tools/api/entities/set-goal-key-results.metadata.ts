/**
 * Метаданные для SetGoalKeyResultsTool
 */

import { buildToolName, ToolCategory, ToolPriority } from '@fractalizer/mcp-core';
import type { StaticToolMetadata } from '@fractalizer/mcp-core';
import { MCP_TOOL_PREFIX } from '#constants';
import { SetGoalKeyResultsOutputSchema } from './set-goal-key-results.schema.js';

export const SET_GOAL_KEY_RESULTS_TOOL_METADATA: StaticToolMetadata = {
  name: buildToolName('set_goal_key_results', MCP_TOOL_PREFIX),
  description: '[Entities/Write] Заменить весь список Key Results цели целиком',
  category: ToolCategory.PROJECTS,
  subcategory: 'write',
  priority: ToolPriority.NORMAL,
  tags: ['entity', 'goal', 'key-result', 'okr', 'write', 'replace'],
  isHelper: false,
  requiresExplicitUserConsent: true,
  redactionAllowlist: ['goalId'],
  title: 'Заменить Key Results',
  outputSchema: SetGoalKeyResultsOutputSchema,
  annotations: {
    readOnlyHint: false,
    destructiveHint: true,
    idempotentHint: true,
    openWorldHint: true,
  },
} as const;
