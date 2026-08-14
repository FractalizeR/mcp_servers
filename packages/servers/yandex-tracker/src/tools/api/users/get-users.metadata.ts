/**
 * Метаданные для GetUsersTool
 */

import { buildToolName, ToolCategory, ToolPriority } from '@fractalizer/mcp-core';
import type { StaticToolMetadata } from '@fractalizer/mcp-core';
import { MCP_TOOL_PREFIX } from '#constants';
import { GetUsersOutputSchema } from './get-users.schema.js';

export const GET_USERS_TOOL_METADATA: StaticToolMetadata = {
  name: buildToolName('get_users', MCP_TOOL_PREFIX),
  description: '[Users/Read] Получить несколько пользователей по login/uid (batch)',
  category: ToolCategory.USERS,
  subcategory: 'read',
  priority: ToolPriority.CRITICAL,
  tags: ['users', 'batch', 'read', 'resolve', 'assignee', 'login', 'uid'],
  isHelper: false,
  requiresExplicitUserConsent: false,
  redactionAllowlist: ['fields'],
  title: 'Получить пользователей',
  outputSchema: GetUsersOutputSchema,
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
} as const;
