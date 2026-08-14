import {
  buildToolName,
  ToolCategory,
  ToolPriority,
  buildOutputSchema,
} from '@fractalizer/mcp-core';
import type { StaticToolMetadata } from '@fractalizer/mcp-core';
import { MCP_TOOL_PREFIX } from '#constants';
import { AddPageAccessOutputDataSchema } from './add-page-access.schema.js';

export const ADD_PAGE_ACCESS_TOOL_METADATA: StaticToolMetadata = {
  name: buildToolName('add_page_access', MCP_TOOL_PREFIX),
  description:
    '[PageAccess/Write] Добавить пользователю или группе доступ к странице ' +
    '(POST /pages/{id}/access). В документированной части API нет эндпоинта чтения списка ' +
    'доступов — сохраните `access.id` из ответа, он понадобится для yw_update_page_access/' +
    'yw_remove_page_access.',
  category: ToolCategory.PAGES,
  subcategory: 'access',
  priority: ToolPriority.NORMAL,
  tags: ['write', 'create', 'access', 'permissions', 'wiki'],
  isHelper: false,
  requiresExplicitUserConsent: true,
  redactionAllowlist: ['idx', 'role', 'target', 'inheritance'],
  title: 'Добавить доступ к странице',
  outputSchema: buildOutputSchema(AddPageAccessOutputDataSchema),
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: true,
  },
} as const;
