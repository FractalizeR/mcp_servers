/**
 * Базовая абстракция для MCP инструментов
 *
 * Следует принципу Single Responsibility Principle (SRP):
 * - Каждый инструмент отвечает только за свою функциональность
 * - Общая логика вынесена в базовый класс
 * - Валидация делегирована в Zod schemas
 *
 * Поддержка автоматической генерации definition из schema:
 * - Если определен getParamsSchema(), definition генерируется автоматически
 * - В противном случае используется ручной buildDefinition() (legacy)
 */

import type { Logger } from '@fractalizer/mcp-infrastructure';
import type { ToolCallParams, ToolResult } from '@fractalizer/mcp-infrastructure';
import type { ToolDefinition } from './base-definition.js';
import type { ToolMetadata, StaticToolMetadata } from './tool-metadata.js';
import type { ZodError, ZodSchema } from 'zod';
import type { z } from 'zod';
import { generateDefinitionFromSchema } from '../../definition/index.js';
import { formatZodErrorsToString } from '../../utils/zod-error-formatter.js';
import { ApiErrorClass } from '@fractalizer/mcp-infrastructure';
import type { ApiErrorDetails } from '@fractalizer/mcp-infrastructure';

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
   *
   * Поддерживает два режима:
   * 1. **Автоматическая генерация (рекомендуется):**
   *    - Если определен getParamsSchema(), definition генерируется из schema
   *    - Исключает возможность несоответствия schema ↔ definition
   *    - DRY принцип: schema является единственным источником истины
   *
   * 2. **Ручное определение (legacy):**
   *    - Если getParamsSchema() не определен, используется buildDefinition()
   *    - Сохранено для обратной совместимости
   *
   * Автоматически добавляет category, subcategory, priority из METADATA
   */
  getDefinition(): ToolDefinition {
    const ToolClass = this.constructor as typeof BaseTool;
    const metadata = ToolClass.METADATA;

    // Приоритет 1: Автоматическая генерация из schema (NEW)
    const schema = this.getParamsSchema?.();
    let definition: ToolDefinition;

    if (schema) {
      // Генерируем inputSchema автоматически из Zod schema
      const inputSchema = generateDefinitionFromSchema(schema, {
        includeDescriptions: true,
        includeExamples: true,
        strict: true,
      });

      definition = {
        name: metadata.name,
        description: metadata.description,
        inputSchema,
      };
    } else {
      // Приоритет 2: Ручное определение (legacy)
      definition = this.buildDefinition();
    }

    // Добавляем метаданные из METADATA
    const result: ToolDefinition = {
      ...definition,
      category: metadata.category,
    };

    if (metadata.subcategory !== undefined) {
      result.subcategory = metadata.subcategory;
    }

    if (metadata.priority !== undefined) {
      result.priority = metadata.priority;
    }

    return result;
  }

  /**
   * Получить Zod схему параметров для автогенерации definition
   *
   * **NEW (рекомендуемый подход):**
   * Переопределите этот метод для автоматической генерации definition из schema.
   * Это исключает возможность несоответствия schema ↔ definition.
   *
   * @returns Zod схема параметров или undefined (для legacy режима)
   *
   * @example
   * ```typescript
   * protected getParamsSchema() {
   *   return TransitionIssueParamsSchema;
   * }
   * ```
   */
  protected getParamsSchema?(): z.ZodObject<z.ZodRawShape>;

  /**
   * Построить базовое определение инструмента (LEGACY)
   *
   * **УСТАРЕВШИЙ ПОДХОД:**
   * Используйте getParamsSchema() вместо этого метода для автогенерации definition.
   *
   * Этот метод сохранен для обратной совместимости с существующими инструментами.
   * Переопределите этот метод в наследнике для предоставления
   * name, description и inputSchema вручную.
   *
   * @deprecated Используйте getParamsSchema() для автоматической генерации
   */
  protected buildDefinition(): ToolDefinition {
    throw new Error(
      `${this.constructor.name}: Не определен ни getParamsSchema(), ни buildDefinition(). ` +
        `Реализуйте хотя бы один из этих методов.`
    );
  }

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
  protected validateParams<T>(
    params: ToolCallParams,
    schema: ZodSchema<T>
  ): { success: true; data: T } | { success: false; error: ToolResult } {
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
   *
   * ОБНОВЛЕНО:
   * - Передает полную информацию об ApiErrorClass (statusCode, errors, retryAfter)
   * - Для обычных Error передает только message
   * - Решает проблему потери деталей ошибки при передаче в MCP client
   */
  protected formatError(message: string, error?: unknown): ToolResult {
    this.logger.error(message, error);

    // КРИТИЧЕСКОЕ ИЗМЕНЕНИЕ: Сохраняем полную информацию об ApiErrorClass
    // - Если ApiErrorClass → используем toJSON() (statusCode, message, errors, retryAfter)
    // - Если обычный Error → только message
    // - Иначе → undefined
    let errorDetails: string | ApiErrorDetails | undefined;
    if (error instanceof ApiErrorClass) {
      errorDetails = error.toJSON();
    } else if (error instanceof Error) {
      errorDetails = error.message;
    }

    // Создаем объект результата с условным добавлением error поля
    const result: { success: false; message: string; error?: string | ApiErrorDetails } = {
      success: false,
      message,
    };
    if (errorDetails !== undefined) {
      result.error = errorDetails;
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
      isError: true,
    };
  }

  /**
   * Форматирование ошибки валидации Zod
   *
   * Использует централизованный форматтер для стабильных сообщений,
   * независимых от версии Zod.
   */
  private formatValidationError(zodError: ZodError): ToolResult {
    const errorMessage = formatZodErrorsToString(zodError.issues);
    return this.formatError('Ошибка валидации параметров', new Error(errorMessage));
  }
}
