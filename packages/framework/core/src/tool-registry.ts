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
   * Выполнить инструмент по имени
   */
  async execute(name: string, params: ToolCallParams): Promise<ToolResult> {
    this.ensureInitialized();

    this.logger.info(`Вызов инструмента: ${name}`);
    this.logger.debug('Параметры:', params);

    const tool = this.tools?.get(name);

    if (!tool) {
      this.logger.error(`Инструмент не найден: ${name}`);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                success: false,
                message: `Инструмент "${name}" не найден`,
                availableTools: this.tools ? Array.from(this.tools.keys()) : [],
              },
              null,
              2
            ),
          },
        ],
        isError: true,
      };
    }

    try {
      const result = await tool.execute(params);
      this.logger.info(`Инструмент ${name} выполнен успешно`);
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
