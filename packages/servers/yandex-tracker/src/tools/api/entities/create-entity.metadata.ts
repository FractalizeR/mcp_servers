/**
 * Метаданные для CreateEntityTool
 */

import { buildToolName, ToolCategory, ToolPriority } from '@fractalizer/mcp-core';
import type { StaticToolMetadata } from '@fractalizer/mcp-core';
import { MCP_TOOL_PREFIX } from '#constants';
import { CreateEntityOutputSchema } from './create-entity.schema.js';

export const CREATE_ENTITY_TOOL_METADATA: StaticToolMetadata = {
  name: buildToolName('create_entity', MCP_TOOL_PREFIX),
  description:
    '[Entities/Write] Создать Goal/Project/Portfolio (коллекция /v3/entities/, не /v3/projects — см. get_projects)',
  category: ToolCategory.PROJECTS,
  subcategory: 'write',
  priority: ToolPriority.HIGH,
  tags: ['entity', 'goal', 'portfolio', 'entity-project', 'create', 'write', 'okr'],
  isHelper: false,
  requiresExplicitUserConsent: false,
  redactionAllowlist: ['entityType', 'fields'],
  title: 'Создать запись Entity API',
  outputSchema: CreateEntityOutputSchema,
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: true,
  },
} as const;
