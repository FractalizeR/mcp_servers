/**
 * Базовая абстракция для MCP инструментов
 *
 * Следует принципу Single Responsibility Principle (SRP):
 * - Каждый инструмент отвечает только за свою функциональность
 * - Общая логика вынесена в базовый класс
 * - Валидация делегирована в Zod schemas
 */

import type { YandexTrackerFacade } from '@tracker_api/facade/yandex-tracker.facade.js';
import type { Logger } from '@infrastructure/logger.js';
import type { ToolCallParams, ToolResult } from '@types';
import type { ToolDefinition } from '@mcp/tools/base/base-definition.js';

/**
 * Абстрактный базовый класс для всех инструментов
 *
 * Инкапсулирует общую логику:
 * - Доступ к Yandex Tracker Facade (высокоуровневый API)
 * - Логирование
 * - Обработка ошибок
 * - Форматирование результатов
 */
export abstract class BaseTool {
  protected readonly trackerFacade: YandexTrackerFacade;
  protected readonly logger: Logger;

  constructor(trackerFacade: YandexTrackerFacade, logger: Logger) {
    this.trackerFacade = trackerFacade;
    this.logger = logger;
  }

  /**
   * Получить определение инструмента
   */
  abstract getDefinition(): ToolDefinition;

  /**
   * Выполнить инструмент
   */
  abstract execute(params: ToolCallParams): Promise<ToolResult>;

  /**
   * Форматирование успешного результата
   */
  protected formatSuccess(data: unknown): ToolResult {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              success: true,
              data,
            },
            null,
            2
          ),
        },
      ],
    };
  }

  /**
   * Форматирование ошибки
   */
  protected formatError(message: string, error?: unknown): ToolResult {
    this.logger.error(message, error);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              success: false,
              message,
              error: error instanceof Error ? error.message : undefined,
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
