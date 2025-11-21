/**
 * Класс для ошибок API
 *
 * Ответственность (SRP):
 * - Extends Error для корректной работы с instanceof
 * - Хранит все детали ошибки API (statusCode, message, errors, retryAfter)
 * - Правильная сериализация в JSON для передачи через MCP
 *
 * Решает проблему:
 * - ApiError (plain object) не работает с instanceof Error
 * - Plain object превращается в "[object Object]" при String()
 * - Детали ошибки теряются при передаче через Promise.reject()
 *
 * Использование:
 * - ErrorMapper возвращает ApiErrorClass вместо plain ApiError
 * - ParallelExecutor корректно обрабатывает через instanceof
 * - BatchResultProcessor сохраняет полную информацию
 * - BaseTool.formatError() передает все детали в MCP client
 */

import type { HttpStatusCode } from '../../types.js';

/**
 * Расширенная информация об ошибке API
 *
 * Используется в toJSON() для передачи всех деталей клиенту
 */
export interface ApiErrorDetails {
  /** HTTP статус-код */
  statusCode: number;
  /** Сообщение об ошибке */
  message: string;
  /** Детализированные ошибки по полям (для 400 ошибок) */
  errors?: Record<string, string[]> | undefined;
  /** Время ожидания перед повторной попыткой (в секундах, для 429 ошибок) */
  retryAfter?: number | undefined;
}

/**
 * Класс ошибки API (extends Error)
 *
 * Generic Error class для всех HTTP ошибок от API Яндекс.Трекера.
 * Сохраняет statusCode, детали по полям, retryAfter для rate limiting.
 *
 * @example
 * ```typescript
 * // 404 Not Found
 * throw new ApiErrorClass(404, "Issue not found");
 *
 * // 400 Bad Request с деталями по полям
 * throw new ApiErrorClass(400, "Validation failed", {
 *   summary: ["Required field"],
 *   assignee: ["Invalid user ID"]
 * });
 *
 * // 429 Rate Limiting
 * throw new ApiErrorClass(429, "Rate limit exceeded", undefined, 60);
 * ```
 */
export class ApiErrorClass extends Error {
  /**
   * HTTP статус-код ошибки
   */
  readonly statusCode: HttpStatusCode;

  /**
   * Детализированные ошибки по полям (для 400 ошибок)
   *
   * @example
   * {
   *   "summary": ["Required field", "Too long"],
   *   "assignee": ["Invalid user ID"]
   * }
   */
  readonly errors?: Record<string, string[]> | undefined;

  /**
   * Время ожидания перед повторной попыткой (в секундах, для 429 ошибок)
   */
  readonly retryAfter?: number | undefined;

  constructor(
    statusCode: HttpStatusCode,
    message: string,
    errors?: Record<string, string[]>,
    retryAfter?: number
  ) {
    super(message);

    // Устанавливаем правильное имя для Error
    this.name = 'ApiErrorClass';

    // Сохраняем все детали ошибки
    this.statusCode = statusCode;
    this.errors = errors;
    this.retryAfter = retryAfter;

    // Сохраняем правильный stack trace (для Node.js)
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ApiErrorClass);
    }
  }

  /**
   * Сериализация в JSON для передачи через MCP
   *
   * Этот метод вызывается автоматически при JSON.stringify()
   *
   * @returns Объект с всеми деталями ошибки
   *
   * @example
   * ```typescript
   * const error = new ApiErrorClass(404, "Not found");
   * JSON.stringify(error);
   * // {"statusCode": 404, "message": "Not found"}
   * ```
   */
  toJSON(): ApiErrorDetails {
    // Создаем объект динамически, чтобы избежать проблем с exactOptionalPropertyTypes
    return {
      statusCode: this.statusCode,
      message: this.message,
      ...(this.errors !== undefined && { errors: this.errors }),
      ...(this.retryAfter !== undefined && { retryAfter: this.retryAfter }),
    };
  }

  /**
   * Строковое представление ошибки
   *
   * Используется при console.log() и String()
   *
   * @returns Строка в формате "ApiErrorClass [statusCode]: message"
   */
  override toString(): string {
    return `${this.name} [${this.statusCode}]: ${this.message}`;
  }
}
