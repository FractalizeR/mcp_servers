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
 * RAW_API_METHODS (@fractalizer/mcp-core). Деструктивные методы (DELETE)
 * намеренно не поддерживаются.
 */

import { normalizeRawQuery } from '@fractalizer/mcp-core';
import type { RawApiRequestInput } from '@fractalizer/mcp-core';
import { BaseOperation } from '#tracker_api/api_operations/base-operation.js';

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
        // retry уже встроен в httpClient.get; массивы query → строка через запятую
        return this.httpClient.get<unknown>(path, normalizeRawQuery(query));
      default:
        // Защита на случай рассинхрона RAW_API_METHODS и switch при расширении
        throw new Error(`Unsupported raw API method: ${String(method)}`);
    }
  }
}
