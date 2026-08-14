import {
  buildToolName,
  ToolCategory,
  ToolPriority,
  buildOutputSchema,
} from '@fractalizer/mcp-core';
import type { StaticToolMetadata } from '@fractalizer/mcp-core';
import { MCP_TOOL_PREFIX } from '#constants';
import { GetResourcesOutputDataSchema } from './get-resources.schema.js';

export const GET_RESOURCES_TOOL_METADATA: StaticToolMetadata = {
  name: buildToolName('get_resources', MCP_TOOL_PREFIX),
  description: '[Resources/Read] Получить ресурсы страницы (вложения, таблицы)',
  category: ToolCategory.RESOURCES,
  subcategory: 'read',
  priority: ToolPriority.NORMAL,
  tags: ['read', 'get', 'resources', 'attachments', 'grids'],
  isHelper: false,
  requiresExplicitUserConsent: false,
  redactionAllowlist: [
    'idx',
    'cursor',
    'order_by',
    'order_direction',
    'page_id',
    'page_size',
    'types',
  ],
  title: 'Получить ресурсы страницы',
  outputSchema: buildOutputSchema(GetResourcesOutputDataSchema),
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
} as const;
