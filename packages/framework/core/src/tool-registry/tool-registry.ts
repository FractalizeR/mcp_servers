/**
 * Реестр всех MCP инструментов
 *
 * Ответственность (SRP):
 * - Регистрация инструментов
 * - Получение списка определений
 * - Маршрутизация вызовов к нужному инструменту
 * - Делегирование фильтрации и сортировки специализированным сервисам
 *
 * АВТОМАТИЧЕСКАЯ РЕГИСТРАЦИЯ (Open/Closed Principle):
 * - Tools автоматически извлекаются из DI контейнера
 * - Для добавления нового tool: передай класс в toolClasses конструктора
 * - НЕ нужно модифицировать этот файл при добавлении новых tools
 */

import type { Container } from 'inversify';
import type { Logger, ToolCallParams, ToolResult } from '@fractalizer/mcp-infrastructure';
import { BaseTool } from '../tools/base/index.js';
import type { ToolDefinition } from '../tools/base/index.js';
import type { ToolConstructor, ParsedCategoryFilter } from './types.js';
import { ToolFilterService } from './tool-filter.service.js';
import { ToolSorter } from './tool-sorter.js';
import type { ToolAccessPolicy } from './tool-access-policy.js';
import { AllowAllToolAccessPolicy } from './tool-access-policy.js';
import { redactParams } from './params-redactor.js';

/**
 * Реестр инструментов
 *
 * Централизованное управление всеми инструментами проекта
 */
export class ToolRegistry {
  private tools: Map<string, BaseTool> | null = null; // Lazy initialization
  private readonly container: Container;
  private readonly logger: Logger;
  private readonly toolClasses: readonly ToolConstructor[];
  private readonly filterService: ToolFilterService;
  private readonly sorter: ToolSorter;
  private readonly accessPolicy: ToolAccessPolicy;

  /**
   * @param container - DI контейнер с зарегистрированными tools
   * @param logger - Logger для логирования
   * @param toolClasses - Список классов tools для регистрации
   * @param accessPolicy - Единый источник истины о доступности tool, спрашивается
   *   и при построении tools/list (косвенно, через ту же фильтрующую логику), и
   *   при исполнении в execute(). По умолчанию — разрешает всё (для тестов и
   *   серверов без конфигурации access control).
   */
  constructor(
    container: Container,
    logger: Logger,
    toolClasses: readonly ToolConstructor[],
    accessPolicy: ToolAccessPolicy = new AllowAllToolAccessPolicy()
  ) {
    this.container = container;
    this.logger = logger;
    this.toolClasses = toolClasses;
    this.filterService = new ToolFilterService(logger);
    this.sorter = new ToolSorter(logger);
    this.accessPolicy = accessPolicy;
    // Не инициализируем tools сразу — делаем это lazy
  }

  /**
   * Lazy initialization всех tools из DI контейнера
   */
  private ensureInitialized(): void {
    if (this.tools !== null) {
      return; // Уже инициализировано
    }

    this.tools = new Map();

    // АВТОМАТИЧЕСКАЯ регистрация всех tools из DI контейнера
    for (const ToolClass of this.toolClasses) {
      const symbol = Symbol.for(ToolClass.name);
      const tool = this.container.get<BaseTool>(symbol);
      this.registerTool(tool);
    }

    this.logger.debug(`Зарегистрировано инструментов: ${this.tools.size}`);
  }

  /**
   * Регистрация нового инструмента
   */
  private registerTool(tool: BaseTool): void {
    // tools всегда не null здесь, т.к. вызывается только из ensureInitialized
    if (this.tools) {
      this.tools.set(tool.getDefinition().name, tool);
      this.logger.debug(`Зарегистрирован инструмент: ${tool.getDefinition().name}`);
    }
  }

  /**
   * Добавить дополнительный инструмент из контейнера
   *
   * Используется для регистрации инструментов с нестандартными зависимостями
   * (конструктор которых отличается от стандартного (facade, logger))
   *
   * @param symbolKey - Строковый ключ для Symbol.for() или Symbol
   */
  public registerToolFromContainer(symbolKey: string | symbol): void {
    // ВАЖНО: Сначала инициализируем все стандартные tools
    // Иначе создание this.tools здесь заблокирует ensureInitialized()
    this.ensureInitialized();

    const symbol = typeof symbolKey === 'string' ? Symbol.for(symbolKey) : symbolKey;
    const tool = this.container.get<BaseTool>(symbol);

    this.registerTool(tool);
  }

  /**
   * @deprecated Второй, более старый путь построения видимости — adapter его
   *   не вызывает (см. build-mcp-server.ts), для tools/list используется
   *   `getVisibleDefinitions()`, построенная на общем `this.accessPolicy` с
   *   `execute()`. Этот метод фильтрует НЕЗАВИСИМО, через тот же статический
   *   предикат `ToolFilterService.isDisabledByFilter`, что и `accessPolicy` —
   *   согласованность держится на совпадении конфигурации, а не на общем
   *   объекте, и это ровно то расхождение, ради устранения которого
   *   появилась `getVisibleDefinitions()`. Оставлен ради существующих тестов
   *   (используется в tracker/wiki test suites); новый код должен
   *   звать `getVisibleDefinitions()`.
   *
   * Возвращает ПОЛНЫЙ набор зарегистрированных инструментов, прошедший
   * негативный фильтр — `disabledFilter` (см. `DISABLED_TOOL_GROUPS`).
   *
   * Порядок — часть контракта (см. ToolSorter.sortByPriority): приоритет —
   * первый ключ сортировки, имя — обязательный tie-breaker. При неизменном
   * наборе инструментов два последовательных вызова возвращают побайтово
   * одинаковый список.
   *
   * @param disabledFilter - негативный фильтр (отключённые группы инструментов).
   */
  getDefinitions(disabledFilter?: ParsedCategoryFilter): ToolDefinition[] {
    this.ensureInitialized();
    if (!this.tools) {
      return [];
    }

    let tools = Array.from(this.tools.values());
    if (disabledFilter) {
      tools = this.filterService.applyDisabledFilter(tools, disabledFilter);
    }

    const sorted = this.sorter.sortByPriority(tools);
    return sorted.map((tool) => tool.getDefinition());
  }

  /**
   * Получить определения инструментов для tools/list, отфильтрованные ЧЕРЕЗ
   * ТОТ ЖЕ объект accessPolicy, который спрашивает execute() при tools/call.
   *
   * Контекст (пакет 4.1.B плана модернизации, долг пакета 1.1.A): раньше
   * видимость в tools/list (getDefinitions(disabledFilter)) и исполняемость в
   * tools/call (execute() → this.accessPolicy) были согласованы только тем,
   * что оба пути используют один и тот же СТАТИЧЕСКИЙ предикат
   * (ToolFilterService.isDisabledByFilter) — т.е. единство держалось на
   * совпадении конфигурации в двух разных вызовах, а не на общем объекте.
   * Этот метод убирает разделение окончательно: единственный источник
   * истины о видимости tool — `this.accessPolicy`, тот же экземпляр, что
   * хранит и использует execute().
   *
   * Порядок — тот же контракт, что и у getDefinitions() (см. ToolSorter).
   */
  getVisibleDefinitions(): ToolDefinition[] {
    this.ensureInitialized();
    if (!this.tools) {
      return [];
    }

    const visible = Array.from(this.tools.values()).filter((tool) =>
      this.accessPolicy.isVisible(tool)
    );
    const sorted = this.sorter.sortByPriority(visible);
    return sorted.map((tool) => tool.getDefinition());
  }

  /**
   * Получить tool по имени
   */
  getTool(name: string): BaseTool | undefined {
    this.ensureInitialized();
    return this.tools?.get(name);
  }

  /**
   * Получить все зарегистрированные tools
   */
  getAllTools(): BaseTool[] {
    this.ensureInitialized();
    if (!this.tools) {
      return [];
    }
    return Array.from(this.tools.values());
  }

  /**
   * Выполнить инструмент по имени
   */
  // eslint-disable-next-line max-lines-per-function
  async execute(name: string, params: ToolCallParams): Promise<ToolResult> {
    this.ensureInitialized();

    this.logger.info(`🔍 Поиск инструмента: ${name}`);

    const tool = this.tools?.get(name);

    // ВАЖНО: не логировать params «как есть» — значения могут содержать
    // тексты комментариев, содержимое страниц Wiki и другие произвольные
    // пользовательские данные. В лог попадает только ФОРМА вызова (имена
    // ключей, типы, размеры); allow-list для точечного раскрытия значений
    // (например, идентификаторов задач/очередей) берётся из
    // `StaticToolMetadata.redactionAllowlist` найденного tool (пакет 3.1.F) —
    // см. redactParams(). Пока конкретный tool его не заполняет, allow-list
    // пуст и поведение не меняется: раскрывается только форма вызова.
    this.logger.debug(
      'Параметры вызова (redacted):',
      redactParams(params, { allowedKeys: this.getRedactionAllowlist(tool) })
    );

    if (!tool) {
      const allTools = Array.from(this.tools?.keys() || []);

      // Fuzzy поиск похожих имен
      const similarTools = allTools.filter((t) => t.includes(name) || name.includes(t));

      this.logger.error(`❌ Инструмент "${name}" не найден`, {
        requestedTool: name,
        availableTools: allTools,
        totalAvailable: allTools.length,
        similarTools,
      });

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                success: false,
                message: `Инструмент "${name}" не найден`,
                availableTools: allTools,
                hint:
                  similarTools.length > 0
                    ? `Возможно вы имели в виду: ${similarTools.join(', ')}`
                    : 'Полный список доступных инструментов — в поле availableTools этого ответа',
              },
              null,
              2
            ),
          },
        ],
        isError: true,
      };
    }

    if (!this.accessPolicy.isCallable(tool)) {
      // ВАЖНО: отказ на исполнении — tool execution error (isError: true),
      // а не протокольная ошибка "не найден": модель должна суметь себя
      // поправить, но текст НЕ должен раскрывать список доступных или
      // похожих инструментов (см. ветку "не найден" выше) — это утечка
      // карты сервера тому, кто перебирает скрытые/отключённые имена.
      this.logger.warn(`⛔ Инструмент "${name}" найден, но недоступен по политике доступа`, {
        toolName: name,
      });

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                success: false,
                message: this.accessPolicy.denialReason(name),
              },
              null,
              2
            ),
          },
        ],
        isError: true,
      };
    }

    this.logger.debug(`✅ Инструмент найден, выполняем...`, {
      toolName: name,
    });

    try {
      const result = await tool.execute(params);
      this.logger.info(`✅ Инструмент ${name} выполнен успешно`);
      return result;
    } catch (error) {
      this.logger.error(`Ошибка при выполнении инструмента ${name}:`, error);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                success: false,
                message: error instanceof Error ? error.message : 'Неизвестная ошибка',
                tool: name,
              },
              null,
              2
            ),
          },
        ],
        isError: true,
      };
    }
  }

  /**
   * Allow-list имён параметров, безопасных для лога, для конкретного tool.
   *
   * Источник — `StaticToolMetadata.redactionAllowlist` найденного класса tool
   * (пакет 3.1.F). Если tool не найден или поле не заполнено — возвращает
   * пустой массив, и `redactParams()` работает с пустым allow-list (текущее
   * поведение, ничего не раскрывается).
   */
  private getRedactionAllowlist(tool: BaseTool | undefined): readonly string[] {
    if (!tool) {
      return [];
    }
    const ToolClass = tool.constructor as typeof BaseTool;
    return ToolClass.METADATA?.redactionAllowlist ?? [];
  }
}
