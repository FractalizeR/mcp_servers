/**
 * Метаданные для DeleteEntityTool
 */

import { buildToolName, ToolCategory, ToolPriority } from '@fractalizer/mcp-core';
import type { StaticToolMetadata } from '@fractalizer/mcp-core';
import { MCP_TOOL_PREFIX } from '#constants';
import { DeleteEntityOutputSchema } from './delete-entity.schema.js';

export const DELETE_ENTITY_TOOL_METADATA: StaticToolMetadata = {
  name: buildToolName('delete_entity', MCP_TOOL_PREFIX),
  description:
    '[Entities/Write] Удалить Goal/Project/Portfolio (Entity API, коллекция /v3/entities/)',
  category: ToolCategory.PROJECTS,
  subcategory: 'delete',
  priority: ToolPriority.NORMAL,
  tags: ['entity', 'goal', 'portfolio', 'entity-project', 'delete', 'write', 'remove', 'okr'],
  isHelper: false,
  requiresExplicitUserConsent: true,
  redactionAllowlist: ['entityType', 'entityId'],
  title: 'Удалить запись Entity API',
  outputSchema: DeleteEntityOutputSchema,
  annotations: {
    readOnlyHint: false,
    destructiveHint: true,
    idempotentHint: true,
    openWorldHint: true,
  },
} as const;
