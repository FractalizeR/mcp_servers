/**
 * Базовая абстракция для MCP инструментов
 *
 * Следует принципу Single Responsibility Principle (SRP):
 * - Каждый инструмент отвечает только за свою функциональность
 * - Общая логика вынесена в базовый класс
 * - Определения инструментов отделены от реализации
 */

import type { YandexTrackerFacade } from '@domain/facade/yandex-tracker.facade.js';
import type { Logger } from '@infrastructure/logger.js';
import type { ToolCallParams, ToolResult } from '@types';

/**
 * Определение инструмента для MCP
 */
export interface ToolDefinition {
  /** Уникальное имя инструмента */
  name: string;
  /** Описание функциональности инструмента */
  description: string;
  /** JSON Schema для валидации входных параметров */
  inputSchema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

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

  /**
   * Валидация обязательного параметра
   */
  protected validateRequired(
    params: ToolCallParams,
    paramName: string,
    paramType: 'string' | 'number' | 'boolean' | 'object'
  ): string | undefined {
    const value = params[paramName];

    if (value === undefined || value === null) {
      return `Параметр "${paramName}" обязателен`;
    }

    if (typeof value !== paramType) {
      return `Параметр "${paramName}" должен быть типа ${paramType}`;
    }

    if (paramType === 'string' && (value as string).trim() === '') {
      return `Параметр "${paramName}" не может быть пустой строкой`;
    }

    return undefined;
  }

  /**
   * Валидация всех обязательных параметров
   */
  protected validateRequiredParams(
    params: ToolCallParams,
    requirements: Array<{ name: string; type: 'string' | 'number' | 'boolean' | 'object' }>
  ): string | undefined {
    for (const req of requirements) {
      const error = this.validateRequired(params, req.name, req.type);
      if (error) {
        return error;
      }
    }
    return undefined;
  }

  /**
   * Валидация ключа задачи Яндекс.Трекера (формат: PROJ-123)
   */
  protected validateIssueKey(key: string): string | undefined {
    const issueKeyRegex = /^[A-Z][A-Z0-9]+-\d+$/;
    if (!issueKeyRegex.test(key)) {
      return `Неверный формат ключа задачи: "${key}". Ожидается формат: PROJ-123`;
    }
    return undefined;
  }

  /**
   * Валидация email адреса
   */
  protected validateEmail(email: string): string | undefined {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return `Неверный формат email: "${email}"`;
    }
    return undefined;
  }

  /**
   * Валидация URL адреса
   */
  protected validateUrl(url: string): string | undefined {
    try {
      new URL(url);
      return undefined;
    } catch {
      return `Неверный формат URL: "${url}"`;
    }
  }

  /**
   * Валидация числового диапазона
   */
  protected validateNumberRange(
    value: number,
    min: number,
    max: number,
    fieldName: string
  ): string | undefined {
    if (value < min || value > max) {
      return `Значение "${fieldName}" должно быть между ${min} и ${max}, получено: ${value}`;
    }
    return undefined;
  }

  /**
   * Валидация длины строки
   */
  protected validateStringLength(
    value: string,
    min: number,
    max: number,
    fieldName: string
  ): string | undefined {
    if (value.length < min || value.length > max) {
      return (
        `Длина "${fieldName}" должна быть между ${min} и ${max} символов, ` +
        `получено: ${value.length}`
      );
    }
    return undefined;
  }

  /**
   * Валидация значения из списка допустимых (enum)
   */
  protected validateEnum<T extends string>(
    value: string,
    allowedValues: T[],
    fieldName: string
  ): string | undefined {
    if (!allowedValues.includes(value as T)) {
      return (
        `Недопустимое значение для "${fieldName}": "${value}". ` +
        `Допустимые значения: ${allowedValues.join(', ')}`
      );
    }
    return undefined;
  }

  /**
   * Валидация массива (минимальная и максимальная длина)
   */
  protected validateArray(
    value: unknown,
    min: number,
    max: number,
    fieldName: string
  ): string | undefined {
    if (!Array.isArray(value)) {
      return `Поле "${fieldName}" должно быть массивом`;
    }

    if (value.length < min || value.length > max) {
      return (
        `Количество элементов в "${fieldName}" должно быть между ${min} и ${max}, ` +
        `получено: ${value.length}`
      );
    }

    return undefined;
  }

  /**
   * Санитизация строки (удаление потенциально опасных символов)
   */
  protected sanitizeString(value: string): string {
    // Удаляем HTML теги и script блоки
    return value
      .replace(/<script[^>]*>.*?<\/script>/gi, '')
      .replace(/<[^>]+>/g, '')
      .trim();
  }
}
