/**
 * Metadata for GetProjectTool
 */

import { buildToolName, ToolCategory, ToolPriority } from '@fractalizer/mcp-core';
import type { StaticToolMetadata } from '@fractalizer/mcp-core';
import { MCP_TOOL_PREFIX } from '#constants';
import { GET_PROJECT_OUTPUT_SCHEMA } from './get-project.schema.js';

/**
 * Static metadata for GetProjectTool
 */
export const GET_PROJECT_TOOL_METADATA: StaticToolMetadata = {
  name: buildToolName('get_project', MCP_TOOL_PREFIX),
  description:
    '[Projects/Read] Получить проект по ID (project, list) — если неизвестен, используй get_projects',
  category: ToolCategory.PROJECTS,
  subcategory: 'read',
  priority: ToolPriority.HIGH,
  tags: ['project', 'get', 'read'],
  isHelper: false,
  requiresExplicitUserConsent: false,
  redactionAllowlist: ['projectId'],
  title: 'Проект по ID',
  outputSchema: GET_PROJECT_OUTPUT_SCHEMA,
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
} as const;
