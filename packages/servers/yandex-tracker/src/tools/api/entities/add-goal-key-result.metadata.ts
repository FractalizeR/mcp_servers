/**
 * Метаданные для AddGoalKeyResultTool
 */

import { buildToolName, ToolCategory, ToolPriority } from '@fractalizer/mcp-core';
import type { StaticToolMetadata } from '@fractalizer/mcp-core';
import { MCP_TOOL_PREFIX } from '#constants';
import { AddGoalKeyResultOutputSchema } from './add-goal-key-result.schema.js';

export const ADD_GOAL_KEY_RESULT_TOOL_METADATA: StaticToolMetadata = {
  name: buildToolName('add_goal_key_result', MCP_TOOL_PREFIX),
  description: '[Entities/Write] Добавить Key Result к цели (существующие сохраняются)',
  category: ToolCategory.PROJECTS,
  subcategory: 'write',
  priority: ToolPriority.NORMAL,
  tags: ['entity', 'goal', 'key-result', 'okr', 'write', 'create'],
  isHelper: false,
  requiresExplicitUserConsent: true,
  redactionAllowlist: ['goalId'],
  title: 'Добавить Key Result',
  outputSchema: AddGoalKeyResultOutputSchema,
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: true,
  },
} as const;
