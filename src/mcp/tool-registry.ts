/**
 * Реестр всех MCP инструментов
 *
 * Ответственность (SRP):
 * - Регистрация инструментов
 * - Получение списка определений
 * - Маршрутизация вызовов к нужному инструменту
 *
 * Следует принципу Open/Closed:
 * - Открыт для расширения (легко добавить новый инструмент)
 * - Закрыт для модификации (основная логика не меняется)
 */

import type { YandexTrackerFacade } from '@domain/facade/index.js';
import type { Logger } from '@infrastructure/logger.js';
import type { ToolCallParams, ToolResult } from '@types';
import type { BaseTool, ToolDefinition } from '@mcp/tools/base-tool.js';
import { PingTool, GetIssuesTool } from '@mcp/tools/index.js';

/**
 * Реестр инструментов
 *
 * Централизованное управление всеми инструментами проекта
 */
export class ToolRegistry {
  private tools: Map<string, BaseTool>;
  private logger: Logger;

  constructor(trackerFacade: YandexTrackerFacade, logger: Logger) {
    this.logger = logger;
    this.tools = new Map();

    // Регистрация всех доступных инструментов
    this.registerTool(new PingTool(trackerFacade, logger));
    this.registerTool(new GetIssuesTool(trackerFacade, logger));

    // Здесь будут регистрироваться новые инструменты:
    // this.registerTool(new CreateIssueTool(apiClient, logger));
    // this.registerTool(new UpdateIssueTool(apiClient, logger));
    // this.registerTool(new SearchIssuesTool(apiClient, logger));

    this.logger.debug(`Зарегистрировано инструментов: ${this.tools.size}`);
  }

  /**
   * Регистрация нового инструмента
   */
  private registerTool(tool: BaseTool): void {
    const definition = tool.getDefinition();
    this.tools.set(definition.name, tool);
    this.logger.debug(`Зарегистрирован инструмент: ${definition.name}`);
  }

  /**
   * Получить определения всех зарегистрированных инструментов
   */
  getDefinitions(): ToolDefinition[] {
    return Array.from(this.tools.values()).map((tool) => tool.getDefinition());
  }

  /**
   * Выполнить инструмент по имени
   */
  async execute(name: string, params: ToolCallParams): Promise<ToolResult> {
    this.logger.info(`Вызов инструмента: ${name}`);
    this.logger.debug('Параметры:', params);

    const tool = this.tools.get(name);

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
                availableTools: Array.from(this.tools.keys()),
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
