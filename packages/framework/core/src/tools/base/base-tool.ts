/**
 * Базовая абстракция для MCP инструментов
 *
 * Следует принципу Single Responsibility Principle (SRP):
 * - Каждый инструмент отвечает только за свою функциональность
 * - Общая логика вынесена в базовый класс
 * - Валидация делегирована в Zod schemas
 *
 * Поддержка автоматической генерации definition из schema:
 * - definition генерируется автоматически из getParamsSchema() (единственный путь;
 *   legacy-путь buildDefinition() удалён в пакете 3.1.B — ни один из 97 инструментов
 *   его не переопределял)
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
 * Единый success envelope — форма и content[0].text, и structuredContent
 * результата formatSuccess(). Контракт для следующей волны (outputSchema
 * пакета 3.1.C должен описывать именно эту форму).
 */
interface SuccessEnvelope {
  success: true;
  data: unknown;
}

/**
 * Единый error envelope — форма и content[0].text, и structuredContent
 * результата formatError().
 */
interface ErrorEnvelope {
  success: false;
  message: string;
  error?: string | ApiErrorDetails;
}

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
   * **Автоматическая генерация:** definition генерируется из getParamsSchema().
   * Исключает возможность несоответствия schema ↔ definition — DRY принцип,
   * schema является единственным источником истины.
   *
   * Автоматически добавляет category, subcategory, priority, title, outputSchema,
   * annotations из METADATA (пакет 3.1.G — раньше эти три поля должен был
   * проецировать каждый инструмент сам, переопределяя getDefinition() целиком;
   * теперь единственная проекция живёт здесь).
   */
  getDefinition(): ToolDefinition {
    const ToolClass = this.constructor as typeof BaseTool;
    const metadata = ToolClass.METADATA;

    const schema = this.getParamsSchema?.();
    if (!schema) {
      throw new Error(
        `${this.constructor.name}: getParamsSchema() не определён. ` +
          `Переопределите getParamsSchema() (buildDefinition() удалён — legacy-путь ` +
          `без переопределений во всех 97 инструментах проекта) либо getDefinition() целиком.`
      );
    }

    // Генерируем inputSchema автоматически из Zod schema
    const inputSchema = generateDefinitionFromSchema(schema, {
      includeDescriptions: true,
      includeExamples: true,
      strict: true,
    });

    const definition: ToolDefinition = {
      name: metadata.name,
      description: metadata.description,
      inputSchema,
    };

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

    if (metadata.title !== undefined) {
      result.title = metadata.title;
    }

    if (metadata.outputSchema !== undefined) {
      result.outputSchema = metadata.outputSchema;
    }

    if (metadata.annotations !== undefined) {
      result.annotations = metadata.annotations;
    }

    return result;
  }

  /**
   * Получить Zod схему параметров для автогенерации definition
   *
   * Переопределите этот метод для автоматической генерации definition из schema.
   * Это исключает возможность несоответствия schema ↔ definition. Объявлен
   * опциональным на уровне типа (не abstract), чтобы не ломать тестовые
   * дублёры, переопределяющие getDefinition() целиком и никогда не вызывающие
   * getParamsSchema() — в проде переопределён во всех 97 инструментах.
   *
   * @returns Zod схема параметров
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
   *
   * Единый success envelope: `{ success: true, data }`. Отдаётся ДВАЖДЫ — как
   * `structuredContent` (машиночитаемо, описывается опциональным outputSchema
   * инструмента) и как сериализованный JSON в `content[0].text` (текстовый
   * дубль для обратной совместимости с клиентами без поддержки
   * structuredContent — спека MCP 2025-06-18 требует именно это дублирование).
   */
  protected formatSuccess(data: unknown): ToolResult {
    const payload: SuccessEnvelope = { success: true, data };

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(payload, null, 2),
        },
      ],
      structuredContent: payload,
    };
  }

  /**
   * Форматирование ошибки
   *
   * ОБНОВЛЕНО:
   * - Передает полную информацию об ApiErrorClass (statusCode, errors, retryAfter)
   * - Для обычных Error передает только message
   * - Решает проблему потери деталей ошибки при передаче в MCP client
   *
   * Единый error envelope: `{ success: false, message, error? }`, отдаётся тем
   * же способом, что и formatSuccess() — structuredContent + текстовый дубль
   * (см. комментарий там).
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
    const payload: ErrorEnvelope = {
      success: false,
      message,
    };
    if (errorDetails !== undefined) {
      payload.error = errorDetails;
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(payload, null, 2),
        },
      ],
      structuredContent: payload,
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
