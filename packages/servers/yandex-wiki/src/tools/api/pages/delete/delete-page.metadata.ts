import {
  buildToolName,
  ToolCategory,
  ToolPriority,
  buildOutputSchema,
} from '@fractalizer/mcp-core';
import type { StaticToolMetadata } from '@fractalizer/mcp-core';
import { MCP_TOOL_PREFIX } from '#constants';
import { DeletePageOutputDataSchema } from './delete-page.schema.js';

export const DELETE_PAGE_TOOL_METADATA: StaticToolMetadata = {
  name: buildToolName('delete_page', MCP_TOOL_PREFIX),
  description: '[Pages/Delete] Удалить страницу Wiki (возвращает recovery_token)',
  category: ToolCategory.PAGES,
  subcategory: 'delete',
  priority: ToolPriority.NORMAL,
  tags: ['delete', 'remove', 'page', 'wiki'],
  isHelper: false,
  requiresExplicitUserConsent: true,
  redactionAllowlist: ['idx'],
  title: 'Удалить страницу',
  outputSchema: buildOutputSchema(DeletePageOutputDataSchema),
  annotations: {
    readOnlyHint: false,
    destructiveHint: true,
    idempotentHint: true,
    openWorldHint: true,
  },
} as const;
