/**
 * Типы для работы с API Яндекс.Трекера
 */

/**
 * HTTP статус-коды
 *
 * Использование enum вместо магических чисел улучшает читаемость
 * и предотвращает опечатки.
 */
export enum HttpStatusCode {
  // 2xx Success
  OK = 200,
  CREATED = 201,
  NO_CONTENT = 204,

  // 4xx Client Errors
  BAD_REQUEST = 400,
  UNAUTHORIZED = 401,
  FORBIDDEN = 403,
  NOT_FOUND = 404,
  REQUEST_TIMEOUT = 408,
  CONFLICT = 409,
  TOO_MANY_REQUESTS = 429,

  // 5xx Server Errors
  INTERNAL_SERVER_ERROR = 500,
  BAD_GATEWAY = 502,
  SERVICE_UNAVAILABLE = 503,
  GATEWAY_TIMEOUT = 504,

  // Special case: network error (no response)
  NETWORK_ERROR = 0,
}

/**
 * Конфигурация сервера из переменных окружения
 */
export interface ServerConfig {
  /** OAuth токен для API Яндекс.Трекера */
  token: string;
  /** ID организации (Яндекс 360 для бизнеса) */
  orgId?: string;
  /** ID организации (Yandex Cloud Organization) */
  cloudOrgId?: string;
  /** Базовый URL API */
  apiBase: string;
  /** Уровень логирования */
  logLevel: LogLevel;
  /** Таймаут запросов в миллисекундах */
  requestTimeout: number;
  /** Максимальное количество элементов в одном batch-запросе (бизнес-лимит) */
  maxBatchSize: number;
  /** Максимальное количество одновременных HTTP-запросов (технический лимит, throttling) */
  maxConcurrentRequests: number;
  /** Директория для лог-файлов */
  logsDir: string;
  /** Включить pretty-printing логов (для development) */
  prettyLogs: boolean;
  /** Максимальный размер лог-файла в байтах (по умолчанию: 50KB) */
  logMaxSize: number;
  /** Количество ротируемых лог-файлов (по умолчанию: 20) */
  logMaxFiles: number;
}

/**
 * Уровни логирования
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'silent';

/**
 * Структура ошибки API (Discriminated Union)
 *
 * ВАЖНО: Использование discriminated union для специальной обработки 429 ошибок:
 * - Rate Limit ошибки (429) ВСЕГДА имеют retryAfter
 * - Обычные ошибки НИКОГДА не имеют retryAfter
 * - TypeScript автоматически делает narrowing по statusCode
 */
export type ApiError =
  | {
      /** HTTP статус-код ошибки */
      readonly statusCode: Exclude<HttpStatusCode, HttpStatusCode.TOO_MANY_REQUESTS>;
      /** Сообщение об ошибке */
      readonly message: string;
      /** Детализированные ошибки по полям (для 400 ошибок) */
      readonly errors?: Record<string, string[]>;
    }
  | {
      /** HTTP статус-код: 429 (Rate Limiting) */
      readonly statusCode: HttpStatusCode.TOO_MANY_REQUESTS;
      /** Сообщение об ошибке */
      readonly message: string;
      /** Время ожидания перед повторной попыткой (в секундах) */
      readonly retryAfter: number;
      /** Детализированные ошибки по полям (обычно отсутствуют для 429) */
      readonly errors?: Record<string, string[]>;
    };

/**
 * Базовая структура ответа от API Яндекс.Трекера
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: ApiError;
}

/**
 * Допустимые типы значений для query-параметров HTTP запросов
 */
export type QueryParamValue = string | number | boolean | string[] | undefined;

/**
 * Типизированные query-параметры для HTTP запросов
 *
 * Используйте вместо Record<string, unknown> для:
 * - Автокомплита в IDE
 * - Предотвращения передачи недопустимых типов
 * - Отсутствия необходимости в type assertions
 */
export type QueryParams = Record<string, QueryParamValue>;

/**
 * Параметры для вызова инструмента
 */
export interface ToolCallParams {
  [key: string]: unknown;
}

/**
 * Результат выполнения инструмента
 * Соответствует CallToolResult из MCP SDK
 */
export interface ToolResult {
  content: Array<{
    type: 'text';
    text: string;
    [key: string]: unknown;
  }>;
  isError?: boolean;
  [key: string]: unknown;
}

/**
 * Успешный результат batch-операции
 *
 * Generic параметры:
 * - TKey: тип ключа сущности (string для issueKey, number для ID, etc.)
 * - TValue: тип данных результата
 *
 * @example
 * // Для операций с задачами
 * type IssueResult = FulfilledResult<string, IssueWithUnknownFields>;
 * // key = issueKey (QUEUE-123)
 * // value = Issue data
 */
export interface FulfilledResult<TKey, TValue> {
  /** Статус: успешное выполнение */
  status: 'fulfilled';
  /** Ключ сущности (например, issueKey, queueKey) */
  key: TKey;
  /** Данные результата */
  value: TValue;
  /** Индекс в исходном массиве для сопоставления */
  index: number;
}

/**
 * Неудачный результат batch-операции
 *
 * @example
 * // Для операций с задачами
 * type IssueError = RejectedResult<string>;
 * // key = issueKey (QUEUE-123)
 */
export interface RejectedResult<TKey> {
  /** Статус: ошибка выполнения */
  status: 'rejected';
  /** Ключ сущности (например, issueKey, queueKey) */
  key: TKey;
  /** Причина ошибки */
  reason: Error;
  /** Индекс в исходном массиве для сопоставления */
  index: number;
}

/**
 * Результат batch-операции (массив успешных и неудачных результатов)
 *
 * Unified формат для всех batch-операций:
 * - Infrastructure (ParallelExecutor, HttpClient)
 * - Operations (GetIssuesOperation, etc.)
 * - MCP Tools (BatchResultProcessor)
 *
 * @example
 * // Type alias для операций с задачами
 * type BatchIssueResult = BatchResult<string, IssueWithUnknownFields>;
 */
export type BatchResult<TKey, TValue> = Array<FulfilledResult<TKey, TValue> | RejectedResult<TKey>>;
