/**
 * Реестр всех MCP инструментов
 *
 * Ответственность (SRP):
 * - Регистрация инструментов
 * - Получение списка определений
 * - Маршрутизация вызовов к нужному инструменту
 *
 * АВТОМАТИЧЕСКАЯ РЕГИСТРАЦИЯ (Open/Closed Principle):
 * - Tools автоматически извлекаются из DI контейнера
 * - Для добавления нового tool: передай класс в toolClasses конструктора
 * - НЕ нужно модифицировать этот файл при добавлении новых tools
 */

import type { Container } from 'inversify';
import type { Logger } from '@mcp-framework/infrastructure';
import type { ToolCallParams, ToolResult } from '@mcp-framework/infrastructure';
import type { BaseTool, ToolDefinition } from './tools/base/index.js';

/**
 * Конструктор класса Tool для DI
 */
export interface ToolConstructor {
  new (...args: any[]): BaseTool<any>; // eslint-disable-line @typescript-eslint/no-explicit-any
  name: string;
}

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

  /**
   * @param container - DI контейнер с зарегистрированными tools
   * @param logger - Logger для логирования
   * @param toolClasses - Список классов tools для регистрации
   */
  constructor(container: Container, logger: Logger, toolClasses: readonly ToolConstructor[]) {
    this.container = container;
    this.logger = logger;
    this.toolClasses = toolClasses;
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
   * (например, SearchToolsTool с зависимостью от SearchEngine)
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
   * Получить определения всех зарегистрированных инструментов
   */
  getDefinitions(): ToolDefinition[] {
    this.ensureInitialized();
    if (!this.tools) {
      return [];
    }
    return Array.from(this.tools.values()).map((tool) => tool.getDefinition());
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
   * Получить essential инструменты (для lazy discovery)
   *
   * @param essentialNames - список имен essential инструментов
   * @returns Определения только essential инструментов
   */
  getEssentialDefinitions(essentialNames: readonly string[]): ToolDefinition[] {
    this.ensureInitialized();
    if (!this.tools) {
      return [];
    }

    const essentialSet = new Set(essentialNames);
    return Array.from(this.tools.values())
      .filter((tool) => essentialSet.has(tool.getDefinition().name))
      .map((tool) => tool.getDefinition());
  }

  /**
   * Получить определения в зависимости от режима discovery
   *
   * @param mode - режим обнаружения ('lazy' или 'eager')
   * @param essentialNames - список essential инструментов (для lazy режима)
   * @returns Определения инструментов
   */
  getDefinitionsByMode(
    mode: 'lazy' | 'eager',
    essentialNames?: readonly string[]
  ): ToolDefinition[] {
    if (mode === 'eager') {
      return this.getDefinitions();
    }

    // Lazy mode: возвращаем только essential tools
    const names = essentialNames || ['ping', 'search_tools'];
    return this.getEssentialDefinitions(names);
  }

  /**
   * Выполнить инструмент по имени
   */
  async execute(name: string, params: ToolCallParams): Promise<ToolResult> {
    this.ensureInitialized();

    this.logger.info(`🔍 Поиск инструмента: ${name}`);
    this.logger.debug('Параметры вызова:', params);

    const tool = this.tools?.get(name);

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
                    : 'Используйте search_tools для поиска доступных инструментов',
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
}
