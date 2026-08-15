import {
  buildToolName,
  ToolCategory,
  ToolPriority,
  buildOutputSchema,
} from '@fractalizer/mcp-core';
import type { StaticToolMetadata } from '@fractalizer/mcp-core';
import { MCP_TOOL_PREFIX } from '#constants';
import { RemoveAllPageAccessOutputDataSchema } from './remove-all-page-access.schema.js';

export const REMOVE_ALL_PAGE_ACCESS_TOOL_METADATA: StaticToolMetadata = {
  name: buildToolName('remove_all_page_access', MCP_TOOL_PREFIX),
  description:
    '[PageAccess/Delete] Удалить ВСЕ персональные доступы страницы разом ' +
    '(DELETE /pages/{id}/access). Затрагивает КАЖДЫЙ явно выданный на этой странице доступ — ' +
    'групповые/наследуемые доступы страница может получать не только отсюда. Для удаления ' +
    'одного конкретного доступа — yw_remove_page_access.',
  category: ToolCategory.PAGES,
  subcategory: 'delete',
  priority: ToolPriority.NORMAL,
  tags: ['delete', 'access', 'permissions', 'wiki', 'bulk'],
  isHelper: false,
  requiresExplicitUserConsent: true,
  redactionAllowlist: ['idx', 'prevent_selflock'],
  title: 'Удалить все доступы к странице',
  outputSchema: buildOutputSchema(RemoveAllPageAccessOutputDataSchema),
  annotations: {
    readOnlyHint: false,
    destructiveHint: true,
    idempotentHint: true,
    openWorldHint: true,
  },
} as const;
