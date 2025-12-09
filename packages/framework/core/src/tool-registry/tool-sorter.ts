/**
 * Сервис для сортировки инструментов
 *
 * Ответственность (SRP):
 * - Сортировка tools по приоритету
 * - Сортировка по имени (алфавитный порядок)
 * - Логирование распределения по приоритетам
 */

import type { Logger } from '@fractalizer/mcp-infrastructure';
import type { BaseTool } from '../tools/base/index.js';
import { ToolPriority } from '../tools/base/tool-metadata.js';
import { PRIORITY_ORDER } from './types.js';

/**
 * Сервис для сортировки tools
 */
export class ToolSorter {
  constructor(private readonly logger: Logger) {}

  /**
   * Сортировка инструментов по приоритету
   *
   * Порядок: critical → high → normal → low → алфавит (внутри priority)
   *
   * @param tools - Массив инструментов
   * @returns Отсортированный массив
   */
  sortByPriority(tools: BaseTool[]): BaseTool[] {
    const sorted = tools.sort((a, b) => {
      // Получаем priority из METADATA
      const aClass = a.constructor as typeof BaseTool;
      const bClass = b.constructor as typeof BaseTool;
       
      const aPriority = aClass.METADATA?.priority ?? ToolPriority.NORMAL;
       
      const bPriority = bClass.METADATA?.priority ?? ToolPriority.NORMAL;

      const aPrio = PRIORITY_ORDER[aPriority] ?? 2; // default: normal
      const bPrio = PRIORITY_ORDER[bPriority] ?? 2; // default: normal

      // Сначала по priority
      if (aPrio !== bPrio) {
        return aPrio - bPrio;
      }

      // Затем по имени (алфавит)
      return a.getDefinition().name.localeCompare(b.getDefinition().name);
    });

    // Логируем распределение по приоритетам
    this.logPriorityDistribution(sorted);

    return sorted;
  }

  /**
   * Логирование распределения tools по приоритетам
   *
   * @param tools - Отсортированные tools
   */
  private logPriorityDistribution(tools: BaseTool[]): void {
    const distribution = {
      critical: this.countByPriority(tools, ToolPriority.CRITICAL),
      high: this.countByPriority(tools, ToolPriority.HIGH),
      normal: this.countByPriority(tools, ToolPriority.NORMAL),
      low: this.countByPriority(tools, ToolPriority.LOW),
    };

    this.logger.debug('Tools sorted by priority', distribution);
  }

  /**
   * Подсчет tools с конкретным приоритетом
   *
   * @param tools - Массив tools
   * @param priority - Приоритет для подсчета
   * @returns Количество tools с данным приоритетом
   */
  private countByPriority(tools: BaseTool[], priority: string): number {
    return tools.filter((t) => {
      const tClass = t.constructor as typeof BaseTool;
       
      const toolPriority = tClass.METADATA?.priority ?? ToolPriority.NORMAL;
      return String(toolPriority) === priority;
    }).length;
  }
}
