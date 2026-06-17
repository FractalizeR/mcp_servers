/**
 * Операция прямого (raw) обращения к API Яндекс.Трекера
 *
 * Ответственность (SRP):
 * - ТОЛЬКО проксирование запроса в HttpClient по указанному методу и пути
 * - НЕТ доменной логики, кеша и трансформации ответа (escape hatch)
 *
 * Назначение: fallback для методов API, у которых ещё нет типизированного tool.
 * Аутентификация, baseURL, retry и логирование берутся из централизованно
 * сконфигурированного HttpClient — данная операция их не переопределяет.
 *
 * РАСШИРЕНИЕ (POST/PATCH/...): добавить ветку в switch ниже и метод в
 * RAW_API_METHODS (dto/raw). Деструктивные методы (DELETE) намеренно не
 * поддерживаются.
 */

import { BaseOperation } from '#tracker_api/api_operations/base-operation.js';
import type { RawApiQueryParams, RawApiRequestInput } from '#tracker_api/dto/raw/index.js';

/**
 * Query-значения после нормализации массивов: только скаляры.
 */
type NormalizedQuery = Record<string, string | number | boolean>;

export class RawApiRequestOperation extends BaseOperation {
  /**
   * Выполняет raw-запрос к API.
   *
   * @param input - метод, путь и query-параметры
   * @returns необработанный ответ API (фильтрация полей — на стороне tool)
   */
  async request(input: RawApiRequestInput): Promise<unknown> {
    const { method, path, query } = input;

    this.logger.debug(`RawApiRequestOperation: ${method} ${path}`);

    switch (method) {
      case 'GET':
        // retry уже встроен в httpClient.get
        return this.httpClient.get<unknown>(path, this.normalizeQuery(query));
      default:
        // Защита на случай рассинхрона RAW_API_METHODS и switch при расширении
        throw new Error(`Unsupported raw API method: ${String(method)}`);
    }
  }

  /**
   * Нормализует query-параметры под формат API Трекера.
   *
   * Массивы сериализуются в строку через запятую (`expand=a,b`) — это
   * конвенция Трекера и общий паттерн проекта (см. find-issues.operation,
   * get-comments.tool). Так поведение детерминировано и не зависит от
   * дефолтного сериализатора axios (`key[]=a&key[]=b`), который Трекер
   * не парсит.
   */
  private normalizeQuery(query?: RawApiQueryParams): NormalizedQuery | undefined {
    if (!query) {
      return undefined;
    }

    const normalized: NormalizedQuery = {};
    for (const [key, value] of Object.entries(query)) {
      normalized[key] = Array.isArray(value) ? value.join(',') : value;
    }
    return normalized;
  }
}
