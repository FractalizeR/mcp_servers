/**
 * Базовая абстракция для MCP инструментов
 *
 * Следует принципу Single Responsibility Principle (SRP):
 * - Каждый инструмент отвечает только за свою функциональность
 * - Общая логика вынесена в базовый класс
 * - Валидация делегирована в Zod schemas
 */

import type { Logger } from '@mcp-framework/infrastructure';
import type { ToolCallParams, ToolResult } from '@mcp-framework/infrastructure';
import type { ToolDefinition } from './base-definition.js';
import type { ToolMetadata, StaticToolMetadata } from './tool-metadata.js';
import type { ZodError } from 'zod';

/**
 * Абстрактный базовый класс для всех инструментов
 *
 * Generic параметры:
 * - TFacade: Тип фасада API (например, YandexTrackerFacade)
 *
 * Инкапсулирует общую логику:
 * - Доступ к API Facade (высокоуровневый API)
 * - Логирование
 * - Валидация параметров через Zod
 * - Обработка ошибок
 * - Форматирование результатов
 */
export abstract class BaseTool<TFacade = unknown> {
  /**
   * Статические метаданные (для compile-time индексации)
   *
   * ОБЯЗАТЕЛЬНО для всех tools!
   * Используется в scripts/generate-tool-index.ts
   */
  static readonly METADATA: StaticToolMetadata;

  protected readonly facade: TFacade;
  protected readonly logger: Logger;

  constructor(facade: TFacade, logger: Logger) {
    this.facade = facade;
    this.logger = logger;
  }

  /**
   * Получить определение инструмента
   */
  abstract getDefinition(): ToolDefinition;

  /**
   * Получить метаданные (runtime)
   *
   * Комбинирует static METADATA с runtime definition
   */
  getMetadata(): ToolMetadata {
    const ToolClass = this.constructor as typeof BaseTool;
    const metadata = ToolClass.METADATA;

    // Все tools должны определять METADATA, но TypeScript не знает об этом
    // т.к. это abstract class без конкретной реализации
    // В runtime это всегда будет определено для конкретных классов
    return {
      definition: this.getDefinition(),
      category: metadata.category,
      tags: metadata.tags,
      isHelper: metadata.isHelper,
      ...(metadata.examples && { examples: metadata.examples }),
    };
  }

  /**
   * Выполнить инструмент
   */
  abstract execute(params: ToolCallParams): Promise<ToolResult>;

  /**
   * Валидация параметров через Zod
   *
   * @param params - параметры для валидации
   * @param schema - Zod схема валидации
   * @returns результат валидации или ToolResult с ошибкой
   */
  protected validateParams(
    params: ToolCallParams,
    schema: any // eslint-disable-line @typescript-eslint/no-explicit-any
  ): { success: true; data: any } | { success: false; error: ToolResult } {
    const validationResult = schema.safeParse(params);

    if (!validationResult.success) {
      return {
        success: false,
        error: this.formatValidationError(validationResult.error),
      };
    }

    return {
      success: true,
      data: validationResult.data,
    };
  }

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

  /**
   * Форматирование ошибки валидации Zod
   */
  private formatValidationError(zodError: ZodError): ToolResult {
    const errorMessage = zodError.issues.map((e: { message: string }) => e.message).join('; ');
    return this.formatError('Ошибка валидации параметров', new Error(errorMessage));
  }
}
