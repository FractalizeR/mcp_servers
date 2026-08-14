import {
  buildToolName,
  ToolCategory,
  ToolPriority,
  buildOutputSchema,
} from '@fractalizer/mcp-core';
import type { StaticToolMetadata } from '@fractalizer/mcp-core';
import { MCP_TOOL_PREFIX } from '#constants';
import { RemovePageAccessOutputDataSchema } from './remove-page-access.schema.js';

export const REMOVE_PAGE_ACCESS_TOOL_METADATA: StaticToolMetadata = {
  name: buildToolName('remove_page_access', MCP_TOOL_PREFIX),
  description:
    '[PageAccess/Delete] Удалить один доступ по его id (DELETE /pages/{id}/access/{access_id}). ' +
    'Для удаления ВСЕХ персональных доступов страницы разом — yw_remove_all_page_access.',
  category: ToolCategory.PAGES,
  subcategory: 'access',
  priority: ToolPriority.NORMAL,
  tags: ['delete', 'access', 'permissions', 'wiki'],
  isHelper: false,
  requiresExplicitUserConsent: true,
  redactionAllowlist: ['idx', 'access_id', 'prevent_selflock'],
  title: 'Удалить доступ к странице',
  outputSchema: buildOutputSchema(RemovePageAccessOutputDataSchema),
  annotations: {
    readOnlyHint: false,
    destructiveHint: true,
    idempotentHint: true,
    openWorldHint: true,
  },
} as const;
