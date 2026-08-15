import {
  buildToolName,
  ToolCategory,
  ToolPriority,
  buildCollectionOutputSchema,
} from '@fractalizer/mcp-core';
import type { StaticToolMetadata } from '@fractalizer/mcp-core';
import { MCP_TOOL_PREFIX } from '#constants';
import { ResourceOutputSchema } from '#common/schemas/index.js';
import { GetResourcesSummarySchema } from './get-resources.schema.js';

export const GET_RESOURCES_TOOL_METADATA: StaticToolMetadata = {
  name: buildToolName('get_resources', MCP_TOOL_PREFIX),
  description:
    '[Resources/Read] Получить ресурсы страницы (вложения, SharePoint, таблицы). ' +
    'Вложения и SharePoint-ресурсы отдаются в режиме ссылок/тел (см. responseMode) — тело ' +
    'каждого читается отдельно через resources/read (wiki://page-resource/{idx}/{type}/{name}). ' +
    'Таблицы (grid) — ВСЕГДА полными объектами в summary.gridItems, ResourceLink на них не строится.',
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
    'responseMode',
  ],
  title: 'Получить ресурсы страницы',
  outputSchema: buildCollectionOutputSchema(ResourceOutputSchema, GetResourcesSummarySchema),
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
} as const;
