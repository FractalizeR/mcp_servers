import {
  buildToolName,
  ToolCategory,
  ToolPriority,
  buildOutputSchema,
} from '@fractalizer/mcp-core';
import type { StaticToolMetadata } from '@fractalizer/mcp-core';
import { MCP_TOOL_PREFIX } from '#constants';
import { UpdatePageAccessOutputDataSchema } from './update-page-access.schema.js';

export const UPDATE_PAGE_ACCESS_TOOL_METADATA: StaticToolMetadata = {
  name: buildToolName('update_page_access', MCP_TOOL_PREFIX),
  description:
    '[PageAccess/Write] Изменить роль или наследование существующего доступа ' +
    '(POST /pages/{id}/access/{access_id}). access_id берётся из ответа yw_add_page_access.',
  category: ToolCategory.PAGES,
  subcategory: 'access',
  priority: ToolPriority.NORMAL,
  tags: ['write', 'update', 'access', 'permissions', 'wiki'],
  isHelper: false,
  requiresExplicitUserConsent: false,
  redactionAllowlist: ['idx', 'access_id', 'role', 'inheritance', 'prevent_selflock'],
  title: 'Изменить доступ к странице',
  outputSchema: buildOutputSchema(UpdatePageAccessOutputDataSchema),
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
} as const;
