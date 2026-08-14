/**
 * Метаданные для UpdateEntityTool
 */

import { buildToolName, ToolCategory, ToolPriority } from '@fractalizer/mcp-core';
import type { StaticToolMetadata } from '@fractalizer/mcp-core';
import { MCP_TOOL_PREFIX } from '#constants';
import { UpdateEntityOutputSchema } from './update-entity.schema.js';

export const UPDATE_ENTITY_TOOL_METADATA: StaticToolMetadata = {
  name: buildToolName('update_entity', MCP_TOOL_PREFIX),
  description: '[Entities/Write] Обновить Goal/Project/Portfolio (Entity API ≠ /v2/projects)',
  category: ToolCategory.PROJECTS,
  subcategory: 'write',
  priority: ToolPriority.HIGH,
  tags: ['entity', 'goal', 'portfolio', 'entity-project', 'update', 'write', 'okr'],
  isHelper: false,
  requiresExplicitUserConsent: true,
  redactionAllowlist: ['entityType', 'entityId', 'version', 'fields'],
  title: 'Обновить запись Entity API',
  outputSchema: UpdateEntityOutputSchema,
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
} as const;
