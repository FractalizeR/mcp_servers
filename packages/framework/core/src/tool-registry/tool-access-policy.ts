/**
 * ToolAccessPolicy — единый источник истины о доступности инструмента
 *
 * Проблема, которую решает этот файл: `tools/list` фильтрует набор
 * инструментов (см. ToolFilterService), а `ToolRegistry.execute()` раньше
 * доставал tool из полной карты без единой проверки — скрытый или
 * отключённый через конфигурацию tool можно было вызвать напрямую,
 * зная его имя.
 *
 * Решение: ОДИН объект (экземпляр `ToolAccessPolicy`), который спрашивают
 * обе точки:
 * - `ToolRegistry.getVisibleDefinitions()` — что показать в tools/list
 *   (adapter вызывает именно её, см. build-mcp-server.ts);
 * - `ToolRegistry.execute(...)` — можно ли исполнить конкретный tool.
 *
 * Оба пути обращаются к ОДНОМУ И ТОМУ ЖЕ экземпляру `this.accessPolicy`,
 * поэтому решение о видимости и решение об исполняемости не могут разойтись:
 * это гарантия на уровне общего объекта, а не на уровне совпадения
 * конфигурации в двух разных местах.
 *
 * `ToolRegistry.getDefinitions(disabledFilter)` — более старый метод с тем же
 * назначением (полный список + негативный фильтр групп), продукт которого
 * adapter больше не использует; согласованность с execute() у него
 * держится лишь на совпадении статического предиката
 * `ToolFilterService.isDisabledByFilter`, а не на общем объекте. Оставлен
 * как `@deprecated` — используется тестами; новый код должен звать
 * `getVisibleDefinitions()`.
 *
 * Единственный рубильник — негативный фильтр отключённых групп
 * (DISABLED_TOOL_GROUPS). Позитивный фильтр категорий (ENABLED_TOOL_CATEGORIES)
 * и essential-список (lazy discovery) удалены: progressive disclosure — забота
 * клиента (Claude Code, Claude Desktop, Codex), не сервера.
 */

import type { BaseTool } from '../tools/base/index.js';
import type { ParsedCategoryFilter } from './types.js';
import { ToolFilterService } from './tool-filter.service.js';

/**
 * Контракт политики доступа к tool
 */
export interface ToolAccessPolicy {
  /** Должен ли инструмент попадать в определения tools/list */
  isVisible(tool: BaseTool): boolean;

  /** Разрешено ли исполнение инструмента через tools/call */
  isCallable(tool: BaseTool): boolean;

  /**
   * Текст отказа для клиента.
   *
   * ВАЖНО: не должен раскрывать список доступных или похожих инструментов —
   * это утечка карты сервера тому, кто перебирает скрытые/отключённые имена.
   */
  denialReason(toolName: string): string;
}

/**
 * Policy, построенная из негативного фильтра категорий (disabled groups) —
 * той же конфигурации (DISABLED_TOOL_GROUPS), что определяет состав tools/list.
 *
 * Конструируется в composition root каждого сервера из `ServerConfig`.
 */
export class ConfiguredToolAccessPolicy implements ToolAccessPolicy {
  constructor(private readonly disabledFilter: ParsedCategoryFilter | undefined) {}

  isVisible(tool: BaseTool): boolean {
    if (this.disabledFilter && ToolFilterService.isDisabledByFilter(tool, this.disabledFilter)) {
      return false;
    }

    return true;
  }

  isCallable(tool: BaseTool): boolean {
    // Граница исполняемости совпадает с границей видимости: всё, что скрыто
    // конфигурацией отключённых групп, также запрещено к вызову.
    return this.isVisible(tool);
  }

  denialReason(toolName: string): string {
    return (
      `Инструмент "${toolName}" недоступен в текущей конфигурации сервера. ` +
      'Обратитесь к администратору сервера, если считаете это ошибкой.'
    );
  }
}

/**
 * Policy по умолчанию — разрешает всё.
 *
 * Используется, когда composition root не передал explicit policy
 * (например, в unit-тестах ToolRegistry, не связанных с access control).
 */
export class AllowAllToolAccessPolicy implements ToolAccessPolicy {
  isVisible(): boolean {
    return true;
  }

  isCallable(): boolean {
    return true;
  }

  denialReason(toolName: string): string {
    return `Инструмент "${toolName}" недоступен`;
  }
}
