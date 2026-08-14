/**
 * Метрики и логирование tools/list — перенесены из server/handlers.ts трёх
 * серверов (пакет 4.1.B). Обобщены: раньше логирование получало
 * server-специфичный ServerConfig только для одной детали (перечисление
 * отключённых категорий) — теперь та же информация уже отражена в самом
 * отфильтрованном списке definitions, поэтому отдельный параметр не нужен.
 */

import type { Logger } from '@fractalizer/mcp-infrastructure';
import type { ToolDefinition } from '../tools/base/index.js';

export interface ToolsMetrics {
  totalTools: number;
  descriptionLength: number;
  estimatedTokens: number;
  byCategory: Record<string, number>;
  byPriority: Record<string, number>;
  bySubcategory: Record<string, number>;
}

/**
 * Подсчёт метрик инструментов.
 */
export function calculateToolsMetrics(definitions: readonly ToolDefinition[]): ToolsMetrics {
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
 * Логирование метрик tools/list (уровень info/debug — не влияет на wire).
 */
export function logToolsMetrics(
  logger: Logger,
  definitions: readonly ToolDefinition[],
  metrics: ToolsMetrics
): void {
  logger.info(`✅ Возвращаем ${metrics.totalTools} инструментов`, {
    totalTools: metrics.totalTools,
    descriptionLength: metrics.descriptionLength,
    estimatedTokens: metrics.estimatedTokens,
  });

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
 * Предупреждения о размере tools/list (уровень warn — не влияет на wire).
 */
export function logToolsWarnings(logger: Logger, metrics: ToolsMetrics): void {
  if (metrics.estimatedTokens > 200) {
    logger.warn('⚠️  Descriptions занимают много токенов', {
      estimatedTokens: metrics.estimatedTokens,
      recommendation: 'Сократите descriptions для экономии контекста LLM',
    });
  }
}
