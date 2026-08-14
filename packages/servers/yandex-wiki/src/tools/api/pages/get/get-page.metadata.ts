import {
  buildToolName,
  ToolCategory,
  ToolPriority,
  buildOutputSchema,
} from '@fractalizer/mcp-core';
import type { StaticToolMetadata } from '@fractalizer/mcp-core';
import { MCP_TOOL_PREFIX } from '#constants';
import { GetPageOutputDataSchema } from './get-page.schema.js';

export const GET_PAGE_TOOL_METADATA: StaticToolMetadata = {
  name: buildToolName('get_page', MCP_TOOL_PREFIX),
  description: '[Pages/Read] Получить страницу Wiki по slug',
  category: ToolCategory.PAGES,
  subcategory: 'read',
  priority: ToolPriority.CRITICAL,
  tags: ['read', 'get', 'page', 'wiki'],
  isHelper: false,
  requiresExplicitUserConsent: false,
  redactionAllowlist: ['slug', 'fields', 'raise_on_redirect', 'revision_id', 'responseFields'],
  title: 'Получить страницу',
  outputSchema: buildOutputSchema(GetPageOutputDataSchema),
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
} as const;
