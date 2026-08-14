/**
 * Метаданные для FindUsersTool
 */

import { buildToolName, ToolCategory, ToolPriority } from '@fractalizer/mcp-core';
import type { StaticToolMetadata } from '@fractalizer/mcp-core';
import { MCP_TOOL_PREFIX } from '#constants';
import { FindUsersOutputSchema } from './find-users.schema.js';

export const FIND_USERS_TOOL_METADATA: StaticToolMetadata = {
  name: buildToolName('find_users', MCP_TOOL_PREFIX),
  description: '[Users/Read] Получить список пользователей организации',
  category: ToolCategory.USERS,
  subcategory: 'read',
  priority: ToolPriority.HIGH,
  tags: ['users', 'list', 'read', 'resolve', 'assignee'],
  isHelper: false,
  requiresExplicitUserConsent: false,
  redactionAllowlist: ['perPage', 'cursor', 'fetchAll', 'maxItems', 'fields'],
  title: 'Список пользователей',
  outputSchema: FindUsersOutputSchema,
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
} as const;
