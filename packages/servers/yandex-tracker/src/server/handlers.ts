/**
 * MCP Request Handlers
 * Вынесены из index.ts для уменьшения размера setupServer
 */

import type { Logger } from '@fractalizer/mcp-infrastructure';
import type { ToolDefinition } from '@fractalizer/mcp-core';
import type { ServerConfig } from '#config';
import { MCP_SERVER_NAME, MCP_SERVER_DISPLAY_NAME } from '../constants.js';

/**
 * Метрики инструментов для анализа размера tools/list response
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
 * Подсчёт метрик инструментов
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
 * Нормализация имени инструмента — удаление префикса сервера
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
      logger.debug(`✂️  Убран префикс сервера`, {
        original: originalName,
        normalized: name,
        prefix: removedPrefix,
      });
      return { name, removedPrefix };
    }
  }

  logger.debug(`ℹ️  Префикс не обнаружен (прямой вызов)`, { toolName: name });
  return { name, removedPrefix: null };
}

/**
 * Логирование метрик для ListTools
 */
export function logToolsMetrics(
  logger: Logger,
  config: ServerConfig,
  definitions: ToolDefinition[],
  metrics: ToolsMetrics
): void {
  logger.info(`✅ Возвращаем ${metrics.totalTools} инструментов`, {
    totalTools: metrics.totalTools,
    descriptionLength: metrics.descriptionLength,
    estimatedTokens: metrics.estimatedTokens,
  });

  if (config.disabledToolGroups) {
    logger.info('✂️  Применён фильтр отключённых групп инструментов', {
      disabledCategories: Array.from(config.disabledToolGroups.categories),
      disabledCategoriesWithSubcategories: Array.from(
        config.disabledToolGroups.categoriesWithSubcategories.entries()
      ).map(([cat, subcats]) => ({
        category: cat,
        subcategories: Array.from(subcats),
      })),
    });
  }

  logger.debug('📊 Распределение инструментов', {
    byCategory: metrics.byCategory,
    byPriority: metrics.byPriority,
    bySubcategory: metrics.bySubcategory,
  });

  logger.debug('🔢 Порядок инструментов:', {
    order: definitions.map((d) => ({
      name: d.name,
      category: d.category,
      priority: d.priority || 'normal',
    })),
  });
}

/**
 * Логирование предупреждений для ListTools
 */
export function logToolsWarnings(logger: Logger, metrics: ToolsMetrics): void {
  if (metrics.estimatedTokens > 200) {
    logger.warn('⚠️  Descriptions занимают много токенов', {
      estimatedTokens: metrics.estimatedTokens,
      recommendation: 'Сократите descriptions для экономии контекста LLM',
    });
  }
}

/**
 * Создание ответа об ошибке для CallTool
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
            message: `Необработанная ошибка при выполнении инструмента: ${
              error instanceof Error ? error.message : 'Неизвестная ошибка'
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
