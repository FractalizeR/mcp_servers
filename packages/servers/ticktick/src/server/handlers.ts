/**
 * MCP Request Handlers
 * Extracted from index.ts to reduce setupServer size
 */

import type { Logger } from '@fractalizer/mcp-infrastructure';
import type { ToolDefinition } from '@fractalizer/mcp-core';
import type { ServerConfig } from '#config';
import { MCP_SERVER_NAME, MCP_SERVER_DISPLAY_NAME } from '../constants.js';

/**
 * Tool metrics for analyzing tools/list response size
 */
interface ToolsMetrics {
  totalTools: number;
  descriptionLength: number;
  estimatedTokens: number;
  byCategory: Record<string, number>;
  byPriority: Record<string, number>;
  bySubcategory: Record<string, number>;
}

/**
 * Calculate tool metrics
 */
export function calculateToolsMetrics(definitions: ToolDefinition[]): ToolsMetrics {
  const descriptionLength = definitions.reduce((sum, def) => sum + def.description.length, 0);

  const byCategory: Record<string, number> = {};
  const byPriority: Record<string, number> = {};
  const bySubcategory: Record<string, number> = {};

  for (const def of definitions) {
    const category = def.category || 'unknown';
    byCategory[category] = (byCategory[category] || 0) + 1;

    const priority = def.priority || 'normal';
    byPriority[priority] = (byPriority[priority] || 0) + 1;

    if (def.subcategory) {
      bySubcategory[def.subcategory] = (bySubcategory[def.subcategory] || 0) + 1;
    }
  }

  return {
    totalTools: definitions.length,
    descriptionLength,
    estimatedTokens: Math.ceil(descriptionLength / 4),
    byCategory,
    byPriority,
    bySubcategory,
  };
}

/**
 * Normalize tool name — remove server prefix
 */
export function normalizeToolName(
  originalName: string,
  logger: Logger
): { name: string; removedPrefix: string | null } {
  let name = originalName;
  const serverPrefixes = [`${MCP_SERVER_NAME}:`, `${MCP_SERVER_DISPLAY_NAME}:`];

  for (const prefix of serverPrefixes) {
    if (name.startsWith(prefix)) {
      const removedPrefix = prefix;
      name = name.slice(prefix.length);
      logger.debug(`✂️  Removed server prefix`, {
        original: originalName,
        normalized: name,
        prefix: removedPrefix,
      });
      return { name, removedPrefix };
    }
  }

  logger.debug(`ℹ️  No prefix detected (direct call)`, { toolName: name });
  return { name, removedPrefix: null };
}

/**
 * Log tool metrics for ListTools
 */
export function logToolsMetrics(
  logger: Logger,
  config: ServerConfig,
  definitions: ToolDefinition[],
  metrics: ToolsMetrics
): void {
  logger.info(`✅ Returning ${metrics.totalTools} tools`, {
    totalTools: metrics.totalTools,
    descriptionLength: metrics.descriptionLength,
    estimatedTokens: metrics.estimatedTokens,
  });

  if (config.tools.disabledGroups) {
    logger.info('✂️  Disabled groups filter applied', {
      disabledCategories: Array.from(config.tools.disabledGroups.categories),
      disabledCategoriesWithSubcategories: Array.from(
        config.tools.disabledGroups.categoriesWithSubcategories.entries()
      ).map(([cat, subcats]) => ({
        category: cat,
        subcategories: Array.from(subcats),
      })),
    });
  }

  logger.debug('📊 Tool distribution', {
    byCategory: metrics.byCategory,
    byPriority: metrics.byPriority,
    bySubcategory: metrics.bySubcategory,
  });

  logger.debug('🔢 Tool order:', {
    order: definitions.map((d) => ({
      name: d.name,
      category: d.category,
      priority: d.priority || 'normal',
    })),
  });
}

/**
 * Log warnings for ListTools
 */
export function logToolsWarnings(logger: Logger, metrics: ToolsMetrics): void {
  if (metrics.estimatedTokens > 200) {
    logger.warn('⚠️  Descriptions consume many tokens', {
      estimatedTokens: metrics.estimatedTokens,
      recommendation: 'Shorten descriptions to save LLM context',
    });
  }
}

/**
 * Create error response for CallTool
 */
export function createErrorResponse(
  error: unknown,
  name: string,
  originalName: string
): { content: Array<{ type: 'text'; text: string }>; isError: true } {
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(
          {
            success: false,
            message: `Unhandled error executing tool: ${
              error instanceof Error ? error.message : 'Unknown error'
            }`,
            tool: name,
            originalName,
          },
          null,
          2
        ),
      },
    ],
    isError: true,
  };
}
