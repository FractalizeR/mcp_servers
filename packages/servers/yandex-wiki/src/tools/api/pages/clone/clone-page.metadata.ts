import {
  buildToolName,
  ToolCategory,
  ToolPriority,
  buildOutputSchema,
} from '@fractalizer/mcp-core';
import type { StaticToolMetadata } from '@fractalizer/mcp-core';
import { MCP_TOOL_PREFIX } from '#constants';
import { ClonePageOutputDataSchema } from './clone-page.schema.js';

export const CLONE_PAGE_TOOL_METADATA: StaticToolMetadata = {
  name: buildToolName('clone_page', MCP_TOOL_PREFIX),
  description: '[Pages/Write] Клонировать страницу Wiki (асинхронная операция)',
  category: ToolCategory.PAGES,
  subcategory: 'write',
  priority: ToolPriority.NORMAL,
  tags: ['write', 'clone', 'copy', 'page', 'wiki'],
  isHelper: false,
  requiresExplicitUserConsent: false,
  redactionAllowlist: ['idx', 'target', 'subscribe_me'],
  title: 'Клонировать страницу',
  outputSchema: buildOutputSchema(ClonePageOutputDataSchema),
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: true,
  },
} as const;
