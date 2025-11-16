/**
 * Mock сервер для имитации Яндекс.Трекер API v3
 * Использует axios-mock-adapter для перехвата HTTP запросов
 */

import MockAdapter from 'axios-mock-adapter';
import type { AxiosInstance } from 'axios';
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
  private mockAdapter: MockAdapter;
  private pendingMocks: string[] = [];

  constructor(axiosInstance: AxiosInstance) {
    // Создаём MockAdapter для axios instance
    // delayResponse: 0 - мгновенный ответ для быстрых тестов
    // onNoMatch: 'throwException' - выбрасывать ошибку для незамоканных запросов
    this.mockAdapter = new MockAdapter(axiosInstance, {
      delayResponse: 0,
      onNoMatch: 'throwException',
    });
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

    const mockKey = `GET ${TRACKER_API_V3}/issues/${issueKey}`;
    this.mockAdapter.onGet(`${TRACKER_API_V3}/issues/${issueKey}`).reply(() => {
      const index = this.pendingMocks.indexOf(mockKey);
      if (index !== -1) {
        this.pendingMocks.splice(index, 1);
      }
      return [200, response];
    });
    this.pendingMocks.push(mockKey);

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
    // Матчер проверяет, что body содержит все требуемые ключи
    this.mockAdapter
      .onPost(`${TRACKER_API_V3}/issues/_search`, (data: unknown) => {
        const body =
          typeof data === 'string' ? JSON.parse(data) : (data as Record<string, unknown>);
        const keys = body['keys'] as string[] | undefined;
        const matches = keys !== undefined && issueKeys.every((key) => keys.includes(key));

        // Удаляем из pending если матчится
        if (matches) {
          const index = this.pendingMocks.indexOf(`POST ${TRACKER_API_V3}/issues/_search`);
          if (index !== -1) {
            this.pendingMocks.splice(index, 1);
          }
        }

        return matches;
      })
      .reply(200, responses);

    this.pendingMocks.push(`POST ${TRACKER_API_V3}/issues/_search`);

    return this;
  }

  /**
   * Мок ошибки 404 (задача не найдена)
   */
  mockGetIssue404(issueKey: string): this {
    const response = generateError404();

    const mockKey = `GET ${TRACKER_API_V3}/issues/${issueKey}`;
    this.mockAdapter.onGet(`${TRACKER_API_V3}/issues/${issueKey}`).reply(() => {
      const index = this.pendingMocks.indexOf(mockKey);
      if (index !== -1) {
        this.pendingMocks.splice(index, 1);
      }
      return [404, response];
    });
    this.pendingMocks.push(mockKey);

    return this;
  }

  /**
   * Мок ошибки 401 (не авторизован)
   */
  mockGetIssue401(issueKey: string): this {
    const response = generateError401();

    const mockKey = `GET ${TRACKER_API_V3}/issues/${issueKey}`;
    this.mockAdapter.onGet(`${TRACKER_API_V3}/issues/${issueKey}`).reply(() => {
      const index = this.pendingMocks.indexOf(mockKey);
      if (index !== -1) {
        this.pendingMocks.splice(index, 1);
      }
      return [401, response];
    });
    this.pendingMocks.push(mockKey);

    return this;
  }

  /**
   * Мок ошибки 403 (доступ запрещён)
   */
  mockGetIssue403(issueKey: string): this {
    const response = generateError403();

    const mockKey = `GET ${TRACKER_API_V3}/issues/${issueKey}`;
    this.mockAdapter.onGet(`${TRACKER_API_V3}/issues/${issueKey}`).reply(() => {
      const index = this.pendingMocks.indexOf(mockKey);
      if (index !== -1) {
        this.pendingMocks.splice(index, 1);
      }
      return [403, response];
    });
    this.pendingMocks.push(mockKey);

    return this;
  }

  /**
   * Мок сетевой ошибки (таймаут, connection refused)
   */
  mockNetworkError(issueKey: string, errorCode = 'ETIMEDOUT'): this {
    const mockKey = `GET ${TRACKER_API_V3}/issues/${issueKey}`;
    this.mockAdapter.onGet(`${TRACKER_API_V3}/issues/${issueKey}`).reply(() => {
      const index = this.pendingMocks.indexOf(mockKey);
      if (index !== -1) {
        this.pendingMocks.splice(index, 1);
      }
      // Для networkError возвращаем reject вместо response
      return Promise.reject(new Error(errorCode));
    });
    this.pendingMocks.push(mockKey);

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

    // Если matcher не передан, мокируем все запросы
    if (!matcher) {
      this.mockAdapter.onPost(`${TRACKER_API_V3}/issues/_search`).reply((config) => {
        // Удаляем из pending при вызове
        const index = this.pendingMocks.indexOf(`POST ${TRACKER_API_V3}/issues/_search`);
        if (index !== -1) {
          this.pendingMocks.splice(index, 1);
        }
        return [200, responses];
      });
      this.pendingMocks.push(`POST ${TRACKER_API_V3}/issues/_search`);
      return this;
    }

    // Если matcher передан, используем reply callback для проверки
    this.mockAdapter.onPost(`${TRACKER_API_V3}/issues/_search`).reply((config) => {
      const data = config.data;
      const body = typeof data === 'string' ? JSON.parse(data) : (data as Record<string, unknown>);

      if (matcher(body)) {
        // Удаляем из pending при успешном вызове
        const index = this.pendingMocks.indexOf(`POST ${TRACKER_API_V3}/issues/_search`);
        if (index !== -1) {
          this.pendingMocks.splice(index, 1);
        }
        return [200, responses];
      }

      // Если matcher не совпал, возвращаем 404
      return [404, { statusCode: 404, errorMessages: ['Not found'], errors: {} }];
    });

    this.pendingMocks.push(`POST ${TRACKER_API_V3}/issues/_search`);

    return this;
  }

  /**
   * Мок ошибки 400 при поиске задач (невалидный запрос)
   */
  mockFindIssuesError400(): this {
    this.mockAdapter.onPost(`${TRACKER_API_V3}/issues/_search`).reply((config) => {
      // Удаляем из pending при вызове
      const index = this.pendingMocks.indexOf(`POST ${TRACKER_API_V3}/issues/_search`);
      if (index !== -1) {
        this.pendingMocks.splice(index, 1);
      }
      return [
        400,
        {
          statusCode: 400,
          errorMessages: ['Invalid search query'],
          errors: {},
        },
      ];
    });
    this.pendingMocks.push(`POST ${TRACKER_API_V3}/issues/_search`);

    return this;
  }

  /**
   * Мок пустого результата поиска
   */
  mockFindIssuesEmpty(): this {
    this.mockAdapter.onPost(`${TRACKER_API_V3}/issues/_search`).reply((config) => {
      // Удаляем из pending при вызове
      const index = this.pendingMocks.indexOf(`POST ${TRACKER_API_V3}/issues/_search`);
      if (index !== -1) {
        this.pendingMocks.splice(index, 1);
      }
      return [200, []];
    });
    this.pendingMocks.push(`POST ${TRACKER_API_V3}/issues/_search`);

    return this;
  }

  /**
   * Очистить все моки и восстановить оригинальный адаптер
   */
  cleanup(): void {
    // Восстанавливаем оригинальный адаптер
    this.mockAdapter.restore();
    // Очищаем pending mocks
    this.pendingMocks = [];
  }

  /**
   * Проверить, что все замоканные запросы были выполнены
   * Выбрасывает ошибку если остались неиспользованные моки
   */
  assertAllRequestsDone(): void {
    if (this.pendingMocks.length > 0) {
      throw new Error(
        `Не все HTTP моки были использованы: ${this.pendingMocks.join(', ')}`
      );
    }
  }
}

/**
 * Хелпер для быстрого создания MockServer в тестах
 */
export function createMockServer(axiosInstance: AxiosInstance): MockServer {
  return new MockServer(axiosInstance);
}
