/**
 * Операция поиска задач через API v3 /issues/_search
 *
 * Ответственность (SRP):
 * - ТОЛЬКО поиск задач по query/filter/keys/queue
 * - Отправка POST запроса на /v3/issues/_search
 * - Парсинг массива задач из ответа
 * - НЕТ batch-режима (это единичный POST запрос)
 * - НЕТ параллелизации (не требуется)
 * - НЕТ кеширования (результаты поиска динамичны)
 *
 * API Endpoint: POST /v3/issues/_search
 * Документация: https://yandex.ru/support/tracker/ru/concepts/issues/search-issues
 */

import { BaseOperation } from '@tracker_api/api_operations/base-operation.js';
import type { FindIssuesInputDto } from '@tracker_api/dto/index.js';
import type { IssueWithUnknownFields } from '@tracker_api/entities/index.js';

/**
 * Результат поиска задач
 *
 * ВАЖНО: Возвращается массив задач, НЕ BatchResult (это не batch-операция)
 */
export type FindIssuesResult = IssueWithUnknownFields[];

export class FindIssuesOperation extends BaseOperation {
  /**
   * Ищет задачи по заданным критериям
   *
   * @param params - параметры поиска (query/filter/keys/queue)
   * @returns массив найденных задач
   * @throws {Error} при ошибках HTTP или если не указан ни один способ поиска
   *
   * ВАЖНО:
   * - Поддерживается 4 способа поиска (взаимоисключающие): query, filter, keys, queue
   * - Retry делается автоматически через HttpClient.post
   * - Кеширование НЕ используется (результаты динамичны)
   * - Пагинация поддерживается через perPage и page параметры
   */
  // TODO: Рефакторинг - разбить на меньшие функции
  // eslint-disable-next-line max-lines-per-function, complexity
  async execute(params: FindIssuesInputDto): Promise<FindIssuesResult> {
    // Валидация: хотя бы один способ поиска должен быть указан
    const hasSearchMethod =
      params.query !== undefined ||
      params.filter !== undefined ||
      (params.keys !== undefined && params.keys.length > 0) ||
      params.queue !== undefined ||
      params.filterId !== undefined;

    if (!hasSearchMethod) {
      throw new Error(
        'FindIssuesOperation: не указан способ поиска (укажи query, filter, keys, queue или filterId)'
      );
    }

    this.logger.info('Поиск задач:', {
      hasQuery: !!params.query,
      hasFilter: !!params.filter,
      keysCount: params.keys?.length ?? 0,
      hasQueue: !!params.queue,
      hasFilterId: !!params.filterId,
      perPage: params.perPage,
      page: params.page,
    });

    // Подготовка тела запроса (согласно API документации)
    const requestBody: Record<string, unknown> = {};

    // Основные параметры поиска (body)
    if (params['query'] !== undefined) {
      requestBody['query'] = params['query'];
    }
    if (params['filter'] !== undefined) {
      requestBody['filter'] = params['filter'];
    }
    if (params['keys'] !== undefined) {
      requestBody['keys'] = params['keys'];
    }
    if (params['queue'] !== undefined) {
      requestBody['queue'] = params['queue'];
    }
    if (params['filterId'] !== undefined) {
      requestBody['filterId'] = params['filterId'];
    }
    if (params['order'] !== undefined) {
      requestBody['order'] = params['order'];
    }

    // Query параметры (URL)
    const queryParams: Record<string, string> = {};
    if (params['perPage'] !== undefined) {
      queryParams['perPage'] = String(params['perPage']);
    }
    if (params['page'] !== undefined) {
      queryParams['page'] = String(params['page']);
    }
    if (
      params['expand'] !== undefined &&
      Array.isArray(params['expand']) &&
      params['expand'].length > 0
    ) {
      const expandArray = params['expand'] as unknown[];
      queryParams['expand'] = expandArray.map(String).join(',');
    }

    // Формирование URL с query параметрами
    const queryString =
      Object.keys(queryParams).length > 0
        ? `?${Object.entries(queryParams)
            .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
            .join('&')}`
        : '';

    const endpoint = `/v3/issues/_search${queryString}`;

    this.logger.debug('Отправка POST запроса:', { endpoint, bodyKeys: Object.keys(requestBody) });

    // Выполняем POST запрос
    // ВАЖНО: retry автоматически через HttpClient.post
    const issues = await this.httpClient.post<FindIssuesResult>(endpoint, requestBody);

    this.logger.info(`Найдено задач: ${issues.length}`);

    return issues;
  }
}
