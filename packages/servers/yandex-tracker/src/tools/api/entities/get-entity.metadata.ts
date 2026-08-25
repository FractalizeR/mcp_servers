/**
 * Метаданные для GetEntityTool
 */

import { buildToolName, ToolCategory, ToolPriority } from '@fractalizer/mcp-core';
import type { StaticToolMetadata } from '@fractalizer/mcp-core';
import { MCP_TOOL_PREFIX } from '#constants';
import { GetEntityOutputSchema } from './get-entity.schema.js';

export const GET_ENTITY_TOOL_METADATA: StaticToolMetadata = {
  name: buildToolName('get_entity', MCP_TOOL_PREFIX),
  description: '[Entities/Read] Goal/Project/Portfolio по ID (Entity API, коллекция /v3/entities/)',
  category: ToolCategory.PROJECTS,
  subcategory: 'read',
  priority: ToolPriority.HIGH,
  tags: ['entity', 'goal', 'portfolio', 'entity-project', 'read', 'okr'],
  isHelper: false,
  requiresExplicitUserConsent: false,
  redactionAllowlist: ['entityType', 'entityId', 'fields'],
  title: 'Запись Entity API',
  outputSchema: GetEntityOutputSchema,
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
} as const;
