/**
 * Metadata for CreateProjectTool
 */

import { buildToolName, ToolCategory, ToolPriority } from '@fractalizer/mcp-core';
import type { StaticToolMetadata } from '@fractalizer/mcp-core';
import { MCP_TOOL_PREFIX } from '#constants';
import { CREATE_PROJECT_OUTPUT_SCHEMA } from './create-project.schema.js';

/**
 * Static metadata for CreateProjectTool
 */
export const CREATE_PROJECT_TOOL_METADATA: StaticToolMetadata = {
  name: buildToolName('create_project', MCP_TOOL_PREFIX),
  description: '[Projects/Write] Создать новый список задач (project, list, create) в TickTick',
  category: ToolCategory.PROJECTS,
  subcategory: 'write',
  priority: ToolPriority.NORMAL,
  tags: ['project', 'create', 'new'],
  isHelper: false,
  requiresExplicitUserConsent: false,
  redactionAllowlist: [],
  title: 'Создать проект',
  outputSchema: CREATE_PROJECT_OUTPUT_SCHEMA,
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: true,
  },
} as const;
