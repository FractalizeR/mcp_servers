import {
  buildToolName,
  ToolCategory,
  ToolPriority,
  buildOutputSchema,
} from '@fractalizer/mcp-core';
import type { StaticToolMetadata } from '@fractalizer/mcp-core';
import { MCP_TOOL_PREFIX } from '#constants';
import { CreatePageOutputDataSchema } from './create-page.schema.js';

export const CREATE_PAGE_TOOL_METADATA: StaticToolMetadata = {
  name: buildToolName('create_page', MCP_TOOL_PREFIX),
  description: '[Pages/Write] Создать новую страницу Wiki',
  category: ToolCategory.PAGES,
  subcategory: 'write',
  priority: ToolPriority.HIGH,
  tags: ['write', 'create', 'page', 'wiki'],
  isHelper: false,
  requiresExplicitUserConsent: false,
  redactionAllowlist: ['slug', 'page_type', 'grid_format', 'fields', 'is_silent'],
  title: 'Создать страницу',
  outputSchema: buildOutputSchema(CreatePageOutputDataSchema),
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: true,
  },
} as const;
