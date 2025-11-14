/**
 * Mock сервер для имитации Яндекс.Трекер API v3
 * Использует nock для перехвата HTTP запросов
 */

import nock from 'nock';
import {
  generateIssue,
  generateError404,
  generateError401,
  generateError403,
} from './template-based-generator.js';

export const TRACKER_API_BASE = 'https://api.tracker.yandex.net';
export const TRACKER_API_V3 = '/v3';

/**
 * MockServer для настройки HTTP моков
 */
export class MockServer {
  private scope: nock.Scope;

  constructor() {
    // Отключаем реальные HTTP запросы
    nock.disableNetConnect();

    this.scope = nock(TRACKER_API_BASE);
  }

  /**
   * Мок успешного получения задачи по ключу
   */
  mockGetIssueSuccess(issueKey: string, overrides?: Record<string, unknown>): this {
    const response = generateIssue({
      overrides: {
        key: issueKey,
        ...overrides,
      },
    });

    this.scope.get(`${TRACKER_API_V3}/issues/${issueKey}`).reply(200, response);

    return this;
  }

  /**
   * Мок успешного получения нескольких задач (batch)
   */
  mockGetIssuesBatchSuccess(issueKeys: string[]): this {
    // Генерируем уникальную фикстуру для каждой задачи
    const responses = issueKeys.map((key) =>
      generateIssue({
        overrides: { key },
      })
    );

    // Для batch запроса используется POST с параметром keys
    this.scope
      .post(`${TRACKER_API_V3}/issues/_search`, (body: Record<string, unknown>) => {
        const keys = body['keys'] as string[] | undefined;
        return keys !== undefined && issueKeys.every((key) => keys.includes(key));
      })
      .reply(200, responses);

    return this;
  }

  /**
   * Мок ошибки 404 (задача не найдена)
   */
  mockGetIssue404(issueKey: string): this {
    const response = generateError404();

    this.scope.get(`${TRACKER_API_V3}/issues/${issueKey}`).reply(404, response);

    return this;
  }

  /**
   * Мок ошибки 401 (не авторизован)
   */
  mockGetIssue401(issueKey: string): this {
    const response = generateError401();

    this.scope.get(`${TRACKER_API_V3}/issues/${issueKey}`).reply(401, response);

    return this;
  }

  /**
   * Мок ошибки 403 (доступ запрещён)
   */
  mockGetIssue403(issueKey: string): this {
    const response = generateError403();

    this.scope.get(`${TRACKER_API_V3}/issues/${issueKey}`).reply(403, response);

    return this;
  }

  /**
   * Мок сетевой ошибки (таймаут, connection refused)
   */
  mockNetworkError(issueKey: string, errorCode = 'ETIMEDOUT'): this {
    this.scope.get(`${TRACKER_API_V3}/issues/${issueKey}`).replyWithError({
      code: errorCode,
      message: 'Network error',
    });

    return this;
  }

  /**
   * Мок успешного поиска задач (POST /v3/issues/_search)
   */
  mockFindIssuesSuccess(
    issueKeys: string[],
    matcher?: (body: Record<string, unknown>) => boolean
  ): this {
    const responses = issueKeys.map((key) =>
      generateIssue({
        overrides: { key },
      })
    );

    this.scope
      .post(`${TRACKER_API_V3}/issues/_search`, matcher ?? (() => true))
      .reply(200, responses);

    return this;
  }

  /**
   * Мок ошибки 400 при поиске задач (невалидный запрос)
   */
  mockFindIssuesError400(): this {
    this.scope.post(`${TRACKER_API_V3}/issues/_search`).reply(400, {
      statusCode: 400,
      errorMessages: ['Invalid search query'],
      errors: {},
    });

    return this;
  }

  /**
   * Мок пустого результата поиска
   */
  mockFindIssuesEmpty(): this {
    this.scope.post(`${TRACKER_API_V3}/issues/_search`).reply(200, []);

    return this;
  }

  /**
   * Очистить все моки и восстановить HTTP
   */
  cleanup(): void {
    nock.cleanAll();
    nock.enableNetConnect();
  }

  /**
   * Проверить, что все замоканные запросы были выполнены
   */
  assertAllRequestsDone(): void {
    this.scope.done();
  }
}

/**
 * Хелпер для быстрого создания MockServer в тестах
 */
export function createMockServer(): MockServer {
  return new MockServer();
}
