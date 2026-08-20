/**
 * Generic-типы для raw-API-passthrough инструментов.
 *
 * Используются всеми серверами (tracker, wiki) для единообразной
 * реализации «escape hatch» — прямого обращения к API для методов, у которых
 * ещё нет типизированного инструмента.
 *
 * РАСШИРЕНИЕ (POST/PATCH/...): добавить метод в RAW_API_METHODS, ветку в
 * операции каждого сервера, поле body в RawApiRequestInput; деструктивные
 * методы (DELETE) поддерживать нельзя.
 */

/**
 * Поддерживаемые HTTP-методы raw-запроса. Сейчас только GET (read-only).
 */
export const RAW_API_METHODS = ['GET'] as const;

/**
 * Тип HTTP-метода raw-запроса (выводится из RAW_API_METHODS).
 */
export type RawApiMethod = (typeof RAW_API_METHODS)[number];

/**
 * Query-параметры raw-запроса (до нормализации массивов).
 *
 * Структурно совместимо с QueryParams из @fractalizer/mcp-infrastructure
 * (которое не экспортируется из корня пакета), объявлено локально.
 */
export type RawApiQueryParams = Record<string, string | number | boolean | string[]>;

/**
 * Входные данные raw-запроса.
 */
export interface RawApiRequestInput {
  /** HTTP-метод (сейчас только GET) */
  method: RawApiMethod;
  /** Относительный путь API (валидируется server-specific схемой) */
  path: string;
  /** Опциональные query-параметры */
  query?: RawApiQueryParams;
}

/**
 * Контракт фасада, умеющего выполнять raw-запрос.
 *
 * Реализуется фасадом каждого сервера; требуется как ограничение generic-типа
 * в BaseRawApiRequestTool.
 */
export interface RawApiCapable {
  rawApiRequest(input: RawApiRequestInput): Promise<unknown>;
}
