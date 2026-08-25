/**
 * Метаданные для FindEntitiesTool
 */

import { buildToolName, ToolCategory, ToolPriority } from '@fractalizer/mcp-core';
import type { StaticToolMetadata } from '@fractalizer/mcp-core';
import { MCP_TOOL_PREFIX } from '#constants';
import { FindEntitiesOutputSchema } from './find-entities.schema.js';

/**
 * Статические метаданные для FindEntitiesTool
 *
 * Entity API — коллекция `/v3/entities/{type}` (Goal/Project/Portfolio).
 */
export const FIND_ENTITIES_TOOL_METADATA: StaticToolMetadata = {
  name: buildToolName('find_entities', MCP_TOOL_PREFIX),
  description: '[Entities/Read] Найти Goal/Project/Portfolio (Entity API, коллекция /v3/entities/)',
  category: ToolCategory.PROJECTS,
  subcategory: 'read',
  priority: ToolPriority.HIGH,
  tags: ['entity', 'goal', 'portfolio', 'entity-project', 'search', 'read', 'okr'],
  isHelper: false,
  requiresExplicitUserConsent: false,
  redactionAllowlist: [
    'entityType',
    'orderBy',
    'orderAsc',
    'rootOnly',
    'perPage',
    'cursor',
    'fetchAll',
    'maxItems',
    'fields',
  ],
  title: 'Поиск записей Entity API',
  outputSchema: FindEntitiesOutputSchema,
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
} as const;
