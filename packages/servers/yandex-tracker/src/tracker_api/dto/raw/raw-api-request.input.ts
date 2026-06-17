/**
 * Input DTO для прямого (raw) обращения к API Яндекс.Трекера
 *
 * Единый источник истины для:
 * - списка поддерживаемых HTTP-методов (RAW_API_METHODS)
 * - формы входных данных операции (RawApiRequestInput)
 *
 * Расположен в dto/, т.к. этот тип должен импортироваться И слоем operations
 * (внутри tracker_api), И слоем tools (через facade/entities/dto — единственные
 * разрешённые точки импорта tools → tracker_api, см. .dependency-cruiser.cjs).
 *
 * РАСШИРЕНИЕ (POST/PATCH и т.д.):
 * - добавить метод в RAW_API_METHODS — он автоматически попадёт в Zod-схему
 * - добавить ветку в RawApiRequestOperation.request()
 * - добавить поле body в RawApiRequestInput
 * - выставить requiresExplicitUserConsent: true и blocklist деструктивных методов
 */

/**
 * Поддерживаемые HTTP-методы для raw-запроса.
 *
 * Сейчас намеренно только GET (read-only escape hatch).
 */
export const RAW_API_METHODS = ['GET'] as const;

/**
 * Тип HTTP-метода raw-запроса (выводится из RAW_API_METHODS)
 */
export type RawApiMethod = (typeof RAW_API_METHODS)[number];

/**
 * Query-параметры raw-запроса.
 *
 * Структурно совместимо с QueryParams из @fractalizer/mcp-infrastructure
 * (которое не экспортируется из корня пакета), поэтому объявлено локально.
 */
export type RawApiQueryParams = Record<string, string | number | boolean | string[]>;

/**
 * Входные данные операции raw-запроса
 */
export interface RawApiRequestInput {
  /** HTTP-метод (сейчас только GET) */
  method: RawApiMethod;
  /** Относительный путь API, обязан начинаться с /v2/ или /v3/ */
  path: string;
  /** Опциональные query-параметры */
  query?: RawApiQueryParams;
}
