/**
 * Mock сервер для имитации Яндекс.Трекер API v3
 * Использует axios-mock-adapter для перехвата HTTP запросов
 */

import MockAdapter from 'axios-mock-adapter';
import type { AxiosInstance } from 'axios';
import {
  generateIssue,
  generateComment,
  generateQueue,
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
      this.mockAdapter.onPost(`${TRACKER_API_V3}/issues/_search`).reply((_config) => {
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
    this.mockAdapter.onPost(`${TRACKER_API_V3}/issues/_search`).reply((_config) => {
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
    this.mockAdapter.onPost(`${TRACKER_API_V3}/issues/_search`).reply((_config) => {
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

  // ============================================================
  // E2E МЕТОДЫ (префикс e2e_) - для E2E workflows тестов
  // ============================================================

  /**
   * E2E: Mock успешного создания задачи
   */
  e2e_createIssueSuccess(issueData?: Record<string, unknown>): this {
    const issue = generateIssue(issueData ? { overrides: issueData } : {});
    const mockKey = `POST ${TRACKER_API_V3}/issues`;
    this.mockAdapter.onPost(`${TRACKER_API_V3}/issues`).reply(() => {
      const index = this.pendingMocks.indexOf(mockKey);
      if (index !== -1) {
        this.pendingMocks.splice(index, 1);
      }
      return [201, issue];
    });
    this.pendingMocks.push(mockKey);
    return this;
  }

  /**
   * E2E: Mock успешного обновления задачи
   */
  e2e_updateIssueSuccess(issueKey: string, updates?: Record<string, unknown>): this {
    const issue = generateIssue({
      overrides: { key: issueKey, ...updates },
    });
    const mockKey = `PATCH ${TRACKER_API_V3}/issues/${issueKey}`;
    this.mockAdapter.onPatch(`${TRACKER_API_V3}/issues/${issueKey}`).reply(() => {
      const index = this.pendingMocks.indexOf(mockKey);
      if (index !== -1) {
        this.pendingMocks.splice(index, 1);
      }
      return [200, issue];
    });
    this.pendingMocks.push(mockKey);
    return this;
  }

  /**
   * E2E: Mock успешного перехода
   */
  e2e_transitionIssueSuccess(issueKey: string, transition: string): this {
    const issue = generateIssue({ overrides: { key: issueKey } });
    const mockKey = `POST ${TRACKER_API_V3}/issues/${issueKey}/transitions/${transition}/_execute`;
    this.mockAdapter
      .onPost(`${TRACKER_API_V3}/issues/${issueKey}/transitions/${transition}/_execute`)
      .reply(() => {
        const index = this.pendingMocks.indexOf(mockKey);
        if (index !== -1) {
          this.pendingMocks.splice(index, 1);
        }
        return [200, issue];
      });
    this.pendingMocks.push(mockKey);
    return this;
  }

  /**
   * E2E: Mock успешного получения changelog
   */
  e2e_getChangelogSuccess(issueKey: string): this {
    const changelog = [
      {
        id: '1',
        updatedAt: '2024-01-01T00:00:00.000Z',
        updatedBy: { login: 'test-user', display: 'Test User' },
        fields: [{ field: { key: 'summary', display: 'Summary' } }],
      },
    ];
    const mockKey = `GET ${TRACKER_API_V3}/issues/${issueKey}/changelog`;
    this.mockAdapter.onGet(`${TRACKER_API_V3}/issues/${issueKey}/changelog`).reply(() => {
      const index = this.pendingMocks.indexOf(mockKey);
      if (index !== -1) {
        this.pendingMocks.splice(index, 1);
      }
      return [200, changelog];
    });
    this.pendingMocks.push(mockKey);
    return this;
  }

  /**
   * E2E: Mock успешного получения transitions
   */
  e2e_getTransitionsSuccess(
    issueKey: string,
    transitions?: Array<{ id: string; to: { key: string } }>
  ): this {
    const defaultTransitions = [
      { id: 'start', to: { key: 'inProgress', display: 'In Progress' } },
      { id: 'close', to: { key: 'closed', display: 'Closed' } },
    ];
    const mockKey = `GET ${TRACKER_API_V3}/issues/${issueKey}/transitions`;
    this.mockAdapter.onGet(`${TRACKER_API_V3}/issues/${issueKey}/transitions`).reply(() => {
      const index = this.pendingMocks.indexOf(mockKey);
      if (index !== -1) {
        this.pendingMocks.splice(index, 1);
      }
      return [200, transitions ?? defaultTransitions];
    });
    this.pendingMocks.push(mockKey);
    return this;
  }

  // ============================================================
  // INTEGRATION МЕТОДЫ (БЕЗ префикса) - для integration тестов
  // ============================================================

  /**
   * Mock успешного создания задачи
   */
  mockCreateIssueSuccess(issueData?: Record<string, unknown>): this {
    const issue = generateIssue(issueData ? { overrides: issueData } : {});
    const mockKey = `POST ${TRACKER_API_V3}/issues`;
    this.mockAdapter.onPost(`${TRACKER_API_V3}/issues`).reply(() => {
      const index = this.pendingMocks.indexOf(mockKey);
      if (index !== -1) {
        this.pendingMocks.splice(index, 1);
      }
      return [201, issue];
    });
    this.pendingMocks.push(mockKey);
    return this;
  }

  /**
   * Mock ошибки 403 при создании
   */
  mockCreateIssue403(): this {
    const response = generateError403();
    const mockKey = `POST ${TRACKER_API_V3}/issues`;
    this.mockAdapter.onPost(`${TRACKER_API_V3}/issues`).reply(() => {
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
   * Mock успешного обновления задачи
   */
  mockUpdateIssueSuccess(issueKey: string, updates?: Record<string, unknown>): this {
    const issue = generateIssue({
      overrides: { key: issueKey, ...updates },
    });
    const mockKey = `PATCH ${TRACKER_API_V3}/issues/${issueKey}`;
    this.mockAdapter.onPatch(`${TRACKER_API_V3}/issues/${issueKey}`).reply(() => {
      const index = this.pendingMocks.indexOf(mockKey);
      if (index !== -1) {
        this.pendingMocks.splice(index, 1);
      }
      return [200, issue];
    });
    this.pendingMocks.push(mockKey);
    return this;
  }

  /**
   * Mock ошибки 404 при обновлении
   */
  mockUpdateIssue404(issueKey: string): this {
    const response = generateError404();
    const mockKey = `PATCH ${TRACKER_API_V3}/issues/${issueKey}`;
    this.mockAdapter.onPatch(`${TRACKER_API_V3}/issues/${issueKey}`).reply(() => {
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
   * Mock успешного перехода
   */
  mockTransitionIssueSuccess(issueKey: string, transition: string): this {
    const issue = generateIssue({ overrides: { key: issueKey } });
    const mockKey = `POST ${TRACKER_API_V3}/issues/${issueKey}/transitions/${transition}/_execute`;
    this.mockAdapter
      .onPost(`${TRACKER_API_V3}/issues/${issueKey}/transitions/${transition}/_execute`)
      .reply(() => {
        const index = this.pendingMocks.indexOf(mockKey);
        if (index !== -1) {
          this.pendingMocks.splice(index, 1);
        }
        return [200, issue];
      });
    this.pendingMocks.push(mockKey);
    return this;
  }

  /**
   * Mock ошибки 404 при переходе
   */
  mockTransitionIssue404(issueKey: string, transition: string): this {
    const response = generateError404();
    const mockKey = `POST ${TRACKER_API_V3}/issues/${issueKey}/transitions/${transition}/_execute`;
    this.mockAdapter
      .onPost(`${TRACKER_API_V3}/issues/${issueKey}/transitions/${transition}/_execute`)
      .reply(() => {
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
   * Mock успешного получения changelog
   */
  mockGetChangelogSuccess(issueKey: string): this {
    const changelog = [
      {
        id: '1',
        updatedAt: '2024-01-01T00:00:00.000Z',
        updatedBy: { login: 'test-user', display: 'Test User' },
        fields: [{ field: { key: 'summary', display: 'Summary' } }],
      },
    ];
    const mockKey = `GET ${TRACKER_API_V3}/issues/${issueKey}/changelog`;
    this.mockAdapter.onGet(`${TRACKER_API_V3}/issues/${issueKey}/changelog`).reply(() => {
      const index = this.pendingMocks.indexOf(mockKey);
      if (index !== -1) {
        this.pendingMocks.splice(index, 1);
      }
      return [200, changelog];
    });
    this.pendingMocks.push(mockKey);
    return this;
  }

  /**
   * Mock ошибки 404 при получении changelog
   */
  mockGetChangelog404(issueKey: string): this {
    const response = generateError404();
    const mockKey = `GET ${TRACKER_API_V3}/issues/${issueKey}/changelog`;
    this.mockAdapter.onGet(`${TRACKER_API_V3}/issues/${issueKey}/changelog`).reply(() => {
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
   * Mock успешного получения transitions
   */
  mockGetTransitionsSuccess(issueKey: string): this {
    const transitions = [
      { id: 'start', to: { key: 'inProgress', display: 'In Progress' } },
      { id: 'close', to: { key: 'closed', display: 'Closed' } },
    ];
    const mockKey = `GET ${TRACKER_API_V3}/issues/${issueKey}/transitions`;
    this.mockAdapter.onGet(`${TRACKER_API_V3}/issues/${issueKey}/transitions`).reply(() => {
      const index = this.pendingMocks.indexOf(mockKey);
      if (index !== -1) {
        this.pendingMocks.splice(index, 1);
      }
      return [200, transitions];
    });
    this.pendingMocks.push(mockKey);
    return this;
  }

  /**
   * Mock ошибки 404 при получении transitions
   */
  mockGetTransitions404(issueKey: string): this {
    const response = generateError404();
    const mockKey = `GET ${TRACKER_API_V3}/issues/${issueKey}/transitions`;
    this.mockAdapter.onGet(`${TRACKER_API_V3}/issues/${issueKey}/transitions`).reply(() => {
      const index = this.pendingMocks.indexOf(mockKey);
      if (index !== -1) {
        this.pendingMocks.splice(index, 1);
      }
      return [404, response];
    });
    this.pendingMocks.push(mockKey);
    return this;
  }

  // ============================================================
  // ATTACHMENTS API МЕТОДЫ
  // ============================================================

  /**
   * Mock успешного получения списка файлов задачи
   */
  mockGetAttachmentsSuccess(issueKey: string, attachments: unknown[]): this {
    const mockKey = `GET /v2/issues/${issueKey}/attachments`;
    this.mockAdapter.onGet(`/v2/issues/${issueKey}/attachments`).reply(() => {
      const index = this.pendingMocks.indexOf(mockKey);
      if (index !== -1) {
        this.pendingMocks.splice(index, 1);
      }
      return [200, attachments];
    });
    this.pendingMocks.push(mockKey);
    return this;
  }

  /**
   * Mock ошибки 404 при получении списка файлов
   */
  mockGetAttachments404(issueKey: string): this {
    const response = generateError404();
    const mockKey = `GET /v2/issues/${issueKey}/attachments`;
    this.mockAdapter.onGet(`/v2/issues/${issueKey}/attachments`).reply(() => {
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
   * Mock успешной загрузки файла
   */
  mockUploadAttachmentSuccess(issueKey: string, attachment: unknown): this {
    const mockKey = `POST /v2/issues/${issueKey}/attachments`;
    this.mockAdapter.onPost(`/v2/issues/${issueKey}/attachments`).reply(() => {
      const index = this.pendingMocks.indexOf(mockKey);
      if (index !== -1) {
        this.pendingMocks.splice(index, 1);
      }
      return [201, attachment];
    });
    this.pendingMocks.push(mockKey);
    return this;
  }

  /**
   * Mock ошибки 403 при загрузке файла
   */
  mockUploadAttachment403(issueKey: string): this {
    const response = generateError403();
    const mockKey = `POST /v2/issues/${issueKey}/attachments`;
    this.mockAdapter.onPost(`/v2/issues/${issueKey}/attachments`).reply(() => {
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
   * Mock успешного скачивания файла
   */
  mockDownloadAttachmentSuccess(issueKey: string, attachmentId: string, filename: string): this {
    const mockKey = `GET /v2/issues/${issueKey}/attachments/${attachmentId}/${filename}`;
    const fileContent = Buffer.from('test file content');
    this.mockAdapter
      .onGet(`/v2/issues/${issueKey}/attachments/${attachmentId}/${filename}`)
      .reply(() => {
        const index = this.pendingMocks.indexOf(mockKey);
        if (index !== -1) {
          this.pendingMocks.splice(index, 1);
        }
        return [
          200,
          fileContent,
          {
            'content-type': 'application/octet-stream',
            'content-disposition': `attachment; filename="${filename}"`,
          },
        ];
      });
    this.pendingMocks.push(mockKey);
    return this;
  }

  /**
   * Mock ошибки 404 при скачивании файла
   */
  mockDownloadAttachment404(issueKey: string, attachmentId: string, filename: string): this {
    const response = generateError404();
    const mockKey = `GET /v2/issues/${issueKey}/attachments/${attachmentId}/${filename}`;
    this.mockAdapter
      .onGet(`/v2/issues/${issueKey}/attachments/${attachmentId}/${filename}`)
      .reply(() => {
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
   * Mock успешного удаления файла
   */
  mockDeleteAttachmentSuccess(issueKey: string, attachmentId: string): this {
    const mockKey = `DELETE /v2/issues/${issueKey}/attachments/${attachmentId}`;
    this.mockAdapter.onDelete(`/v2/issues/${issueKey}/attachments/${attachmentId}`).reply(() => {
      const index = this.pendingMocks.indexOf(mockKey);
      if (index !== -1) {
        this.pendingMocks.splice(index, 1);
      }
      return [204, ''];
    });
    this.pendingMocks.push(mockKey);
    return this;
  }

  /**
   * Mock ошибки 404 при удалении файла
   */
  mockDeleteAttachment404(issueKey: string, attachmentId: string): this {
    const response = generateError404();
    const mockKey = `DELETE /v2/issues/${issueKey}/attachments/${attachmentId}`;
    this.mockAdapter.onDelete(`/v2/issues/${issueKey}/attachments/${attachmentId}`).reply(() => {
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
   * Mock успешного получения миниатюры
   */
  mockGetThumbnailSuccess(issueKey: string, attachmentId: string): this {
    const mockKey = `GET /v2/issues/${issueKey}/thumbnails/${attachmentId}`;
    const thumbnailContent = Buffer.from('thumbnail image content');
    this.mockAdapter.onGet(`/v2/issues/${issueKey}/thumbnails/${attachmentId}`).reply(() => {
      const index = this.pendingMocks.indexOf(mockKey);
      if (index !== -1) {
        this.pendingMocks.splice(index, 1);
      }
      return [
        200,
        thumbnailContent,
        {
          'content-type': 'image/png',
        },
      ];
    });
    this.pendingMocks.push(mockKey);
    return this;
  }

  /**
   * Mock ошибки 404 при получении миниатюры
   */
  mockGetThumbnail404(issueKey: string, attachmentId: string): this {
    const response = generateError404();
    const mockKey = `GET /v2/issues/${issueKey}/thumbnails/${attachmentId}`;
    this.mockAdapter.onGet(`/v2/issues/${issueKey}/thumbnails/${attachmentId}`).reply(() => {
      const index = this.pendingMocks.indexOf(mockKey);
      if (index !== -1) {
        this.pendingMocks.splice(index, 1);
      }
      return [404, response];
    });
    this.pendingMocks.push(mockKey);
    return this;
  }

  // ============================================================
  // LINKS API МЕТОДЫ
  // ============================================================

  /**
   * Mock успешного создания связи между задачами
   */
  mockCreateLinkSuccess(issueKey: string, targetIssue: string, link: unknown): this {
    const mockKey = `POST ${TRACKER_API_V3}/issues/${issueKey}/links`;
    this.mockAdapter.onPost(`${TRACKER_API_V3}/issues/${issueKey}/links`).reply(() => {
      const index = this.pendingMocks.indexOf(mockKey);
      if (index !== -1) {
        this.pendingMocks.splice(index, 1);
      }
      return [200, link];
    });
    this.pendingMocks.push(mockKey);
    return this;
  }

  /**
   * Mock ошибки 404 при создании связи (задача не найдена)
   */
  mockCreateLink404(issueKey: string): this {
    const response = generateError404();
    const mockKey = `POST ${TRACKER_API_V3}/issues/${issueKey}/links`;
    this.mockAdapter.onPost(`${TRACKER_API_V3}/issues/${issueKey}/links`).reply(() => {
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
   * Mock успешного получения списка связей задачи
   */
  mockGetLinksSuccess(issueKey: string, links: unknown[]): this {
    const mockKey = `GET ${TRACKER_API_V3}/issues/${issueKey}/links`;
    this.mockAdapter.onGet(`${TRACKER_API_V3}/issues/${issueKey}/links`).reply(() => {
      const index = this.pendingMocks.indexOf(mockKey);
      if (index !== -1) {
        this.pendingMocks.splice(index, 1);
      }
      return [200, links];
    });
    this.pendingMocks.push(mockKey);
    return this;
  }

  /**
   * Mock ошибки 404 при получении связей (задача не найдена)
   */
  mockGetLinks404(issueKey: string): this {
    const response = generateError404();
    const mockKey = `GET ${TRACKER_API_V3}/issues/${issueKey}/links`;
    this.mockAdapter.onGet(`${TRACKER_API_V3}/issues/${issueKey}/links`).reply(() => {
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
   * Mock успешного удаления связи
   */
  mockDeleteLinkSuccess(issueKey: string, linkId: string): this {
    const mockKey = `DELETE ${TRACKER_API_V3}/issues/${issueKey}/links/${linkId}`;
    this.mockAdapter.onDelete(`${TRACKER_API_V3}/issues/${issueKey}/links/${linkId}`).reply(() => {
      const index = this.pendingMocks.indexOf(mockKey);
      if (index !== -1) {
        this.pendingMocks.splice(index, 1);
      }
      return [204];
    });
    this.pendingMocks.push(mockKey);
    return this;
  }

  /**
   * Mock ошибки 404 при удалении связи (связь не найдена)
   */
  mockDeleteLink404(issueKey: string, linkId: string): this {
    const response = generateError404();
    const mockKey = `DELETE ${TRACKER_API_V3}/issues/${issueKey}/links/${linkId}`;
    this.mockAdapter.onDelete(`${TRACKER_API_V3}/issues/${issueKey}/links/${linkId}`).reply(() => {
      const index = this.pendingMocks.indexOf(mockKey);
      if (index !== -1) {
        this.pendingMocks.splice(index, 1);
      }
      return [404, response];
    });
    this.pendingMocks.push(mockKey);
    return this;
  }

  // ============================================================
  // COMMENTS API МЕТОДЫ
  // ============================================================

  /**
   * Mock успешного добавления комментария
   */
  mockAddCommentSuccess(issueKey: string, commentData?: Record<string, unknown>): this {
    const comment = generateComment(commentData ? { overrides: commentData } : {});
    const mockKey = `POST ${TRACKER_API_V3}/issues/${issueKey}/comments`;
    this.mockAdapter.onPost(`${TRACKER_API_V3}/issues/${issueKey}/comments`).reply(() => {
      const index = this.pendingMocks.indexOf(mockKey);
      if (index !== -1) {
        this.pendingMocks.splice(index, 1);
      }
      return [201, comment];
    });
    this.pendingMocks.push(mockKey);
    return this;
  }

  /**
   * Mock ошибки 404 при добавлении комментария (задача не найдена)
   */
  mockAddComment404(issueKey: string): this {
    const response = generateError404();
    const mockKey = `POST ${TRACKER_API_V3}/issues/${issueKey}/comments`;
    this.mockAdapter.onPost(`${TRACKER_API_V3}/issues/${issueKey}/comments`).reply(() => {
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
   * Mock успешного получения списка комментариев
   */
  mockGetCommentsSuccess(issueKey: string, comments?: unknown[]): this {
    const defaultComments = [
      generateComment({ overrides: { text: 'First comment' } }),
      generateComment({ overrides: { text: 'Second comment' } }),
    ];
    const mockKey = `GET ${TRACKER_API_V3}/issues/${issueKey}/comments`;
    // Используем RegExp для поддержки query параметров (perPage, page, expand)
    const urlPattern = new RegExp(`^${TRACKER_API_V3}/issues/${issueKey}/comments(\\?.*)?$`);
    this.mockAdapter.onGet(urlPattern).reply(() => {
      const index = this.pendingMocks.indexOf(mockKey);
      if (index !== -1) {
        this.pendingMocks.splice(index, 1);
      }
      return [200, comments ?? defaultComments];
    });
    this.pendingMocks.push(mockKey);
    return this;
  }

  /**
   * Mock пустого списка комментариев
   */
  mockGetCommentsEmpty(issueKey: string): this {
    const mockKey = `GET ${TRACKER_API_V3}/issues/${issueKey}/comments`;
    this.mockAdapter.onGet(`${TRACKER_API_V3}/issues/${issueKey}/comments`).reply(() => {
      const index = this.pendingMocks.indexOf(mockKey);
      if (index !== -1) {
        this.pendingMocks.splice(index, 1);
      }
      return [200, []];
    });
    this.pendingMocks.push(mockKey);
    return this;
  }

  /**
   * Mock ошибки 404 при получении комментариев (задача не найдена)
   */
  mockGetComments404(issueKey: string): this {
    const response = generateError404();
    const mockKey = `GET ${TRACKER_API_V3}/issues/${issueKey}/comments`;
    this.mockAdapter.onGet(`${TRACKER_API_V3}/issues/${issueKey}/comments`).reply(() => {
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
   * Mock успешного редактирования комментария
   */
  mockEditCommentSuccess(
    issueKey: string,
    commentId: string,
    updates?: Record<string, unknown>
  ): this {
    const comment = generateComment({
      overrides: { id: commentId, ...updates },
    });
    const mockKey = `PATCH ${TRACKER_API_V3}/issues/${issueKey}/comments/${commentId}`;
    this.mockAdapter
      .onPatch(`${TRACKER_API_V3}/issues/${issueKey}/comments/${commentId}`)
      .reply(() => {
        const index = this.pendingMocks.indexOf(mockKey);
        if (index !== -1) {
          this.pendingMocks.splice(index, 1);
        }
        return [200, comment];
      });
    this.pendingMocks.push(mockKey);
    return this;
  }

  /**
   * Mock ошибки 404 при редактировании комментария
   */
  mockEditComment404(issueKey: string, commentId: string): this {
    const response = generateError404();
    const mockKey = `PATCH ${TRACKER_API_V3}/issues/${issueKey}/comments/${commentId}`;
    this.mockAdapter
      .onPatch(`${TRACKER_API_V3}/issues/${issueKey}/comments/${commentId}`)
      .reply(() => {
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
   * Mock успешного удаления комментария
   */
  mockDeleteCommentSuccess(issueKey: string, commentId: string): this {
    const mockKey = `DELETE ${TRACKER_API_V3}/issues/${issueKey}/comments/${commentId}`;
    this.mockAdapter
      .onDelete(`${TRACKER_API_V3}/issues/${issueKey}/comments/${commentId}`)
      .reply(() => {
        const index = this.pendingMocks.indexOf(mockKey);
        if (index !== -1) {
          this.pendingMocks.splice(index, 1);
        }
        return [204, ''];
      });
    this.pendingMocks.push(mockKey);
    return this;
  }

  /**
   * Mock ошибки 404 при удалении комментария
   */
  mockDeleteComment404(issueKey: string, commentId: string): this {
    const response = generateError404();
    const mockKey = `DELETE ${TRACKER_API_V3}/issues/${issueKey}/comments/${commentId}`;
    this.mockAdapter
      .onDelete(`${TRACKER_API_V3}/issues/${issueKey}/comments/${commentId}`)
      .reply(() => {
        const index = this.pendingMocks.indexOf(mockKey);
        if (index !== -1) {
          this.pendingMocks.splice(index, 1);
        }
        return [404, response];
      });
    this.pendingMocks.push(mockKey);
    return this;
  }

  // ============================================================
  // QUEUES API МЕТОДЫ
  // ============================================================

  /**
   * Mock успешного получения списка очередей
   */
  mockGetQueuesSuccess(queues?: unknown[]): this {
    const defaultQueues = [
      generateQueue({ overrides: { key: 'TEST1', name: 'Test Queue 1' } }),
      generateQueue({ overrides: { key: 'TEST2', name: 'Test Queue 2' } }),
    ];
    const mockKey = `GET ${TRACKER_API_V3}/queues`;
    const urlPattern = new RegExp(`^${TRACKER_API_V3}/queues(\\?.*)?$`);
    this.mockAdapter.onGet(urlPattern).reply(() => {
      const index = this.pendingMocks.indexOf(mockKey);
      if (index !== -1) {
        this.pendingMocks.splice(index, 1);
      }
      return [200, queues ?? defaultQueues];
    });
    this.pendingMocks.push(mockKey);
    return this;
  }

  /**
   * Mock пустого списка очередей
   */
  mockGetQueuesEmpty(): this {
    const mockKey = `GET ${TRACKER_API_V3}/queues`;
    const urlPattern = new RegExp(`^${TRACKER_API_V3}/queues(\\?.*)?$`);
    this.mockAdapter.onGet(urlPattern).reply(() => {
      const index = this.pendingMocks.indexOf(mockKey);
      if (index !== -1) {
        this.pendingMocks.splice(index, 1);
      }
      return [200, []];
    });
    this.pendingMocks.push(mockKey);
    return this;
  }

  /**
   * Mock успешного получения очереди по ключу
   */
  mockGetQueueSuccess(queueKey: string, overrides?: Record<string, unknown>): this {
    const queue = generateQueue({ overrides: { key: queueKey, ...overrides } });
    const mockKey = `GET ${TRACKER_API_V3}/queues/${queueKey}`;
    const urlPattern = new RegExp(`^${TRACKER_API_V3}/queues/${queueKey}(\\?.*)?$`);
    this.mockAdapter.onGet(urlPattern).reply(() => {
      const index = this.pendingMocks.indexOf(mockKey);
      if (index !== -1) {
        this.pendingMocks.splice(index, 1);
      }
      return [200, queue];
    });
    this.pendingMocks.push(mockKey);
    return this;
  }

  /**
   * Mock ошибки 404 при получении очереди (очередь не найдена)
   */
  mockGetQueue404(queueKey: string): this {
    const response = generateError404();
    const mockKey = `GET ${TRACKER_API_V3}/queues/${queueKey}`;
    this.mockAdapter.onGet(`${TRACKER_API_V3}/queues/${queueKey}`).reply(() => {
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
   * Mock успешного создания очереди
   */
  mockCreateQueueSuccess(queueData?: Record<string, unknown>): this {
    const queue = generateQueue({ overrides: queueData });
    const mockKey = `POST ${TRACKER_API_V3}/queues`;
    this.mockAdapter.onPost(`${TRACKER_API_V3}/queues`).reply(() => {
      const index = this.pendingMocks.indexOf(mockKey);
      if (index !== -1) {
        this.pendingMocks.splice(index, 1);
      }
      return [201, queue];
    });
    this.pendingMocks.push(mockKey);
    return this;
  }

  /**
   * Mock ошибки 403 при создании очереди (нет прав)
   */
  mockCreateQueue403(): this {
    const response = generateError403();
    const mockKey = `POST ${TRACKER_API_V3}/queues`;
    this.mockAdapter.onPost(`${TRACKER_API_V3}/queues`).reply(() => {
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
   * Mock успешного обновления очереди
   */
  mockUpdateQueueSuccess(queueKey: string, updates?: Record<string, unknown>): this {
    const queue = generateQueue({ overrides: { key: queueKey, ...updates } });
    const mockKey = `PATCH ${TRACKER_API_V3}/queues/${queueKey}`;
    this.mockAdapter.onPatch(`${TRACKER_API_V3}/queues/${queueKey}`).reply(() => {
      const index = this.pendingMocks.indexOf(mockKey);
      if (index !== -1) {
        this.pendingMocks.splice(index, 1);
      }
      return [200, queue];
    });
    this.pendingMocks.push(mockKey);
    return this;
  }

  /**
   * Mock ошибки 404 при обновлении очереди
   */
  mockUpdateQueue404(queueKey: string): this {
    const response = generateError404();
    const mockKey = `PATCH ${TRACKER_API_V3}/queues/${queueKey}`;
    this.mockAdapter.onPatch(`${TRACKER_API_V3}/queues/${queueKey}`).reply(() => {
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
   * Mock успешного получения полей очереди
   */
  mockGetQueueFieldsSuccess(queueKey: string): this {
    const fields = [
      {
        id: 'summary',
        name: 'Summary',
        key: 'summary',
        type: 'string',
        required: true,
      },
      {
        id: 'description',
        name: 'Description',
        key: 'description',
        type: 'text',
        required: false,
      },
    ];
    const mockKey = `GET ${TRACKER_API_V3}/queues/${queueKey}/fields`;
    this.mockAdapter.onGet(`${TRACKER_API_V3}/queues/${queueKey}/fields`).reply(() => {
      const index = this.pendingMocks.indexOf(mockKey);
      if (index !== -1) {
        this.pendingMocks.splice(index, 1);
      }
      return [200, fields];
    });
    this.pendingMocks.push(mockKey);
    return this;
  }

  /**
   * Mock успешного управления доступом к очереди
   */
  mockManageQueueAccessSuccess(queueKey: string): this {
    const mockKey = `POST ${TRACKER_API_V3}/queues/${queueKey}/access`;
    this.mockAdapter.onPost(`${TRACKER_API_V3}/queues/${queueKey}/access`).reply(() => {
      const index = this.pendingMocks.indexOf(mockKey);
      if (index !== -1) {
        this.pendingMocks.splice(index, 1);
      }
      return [200, { success: true }];
    });
    this.pendingMocks.push(mockKey);
    return this;
  }

  /**
   * Mock ошибки 403 при управлении доступом (нет прав)
   */
  mockManageQueueAccess403(queueKey: string): this {
    const response = generateError403();
    const mockKey = `POST ${TRACKER_API_V3}/queues/${queueKey}/access`;
    this.mockAdapter.onPost(`${TRACKER_API_V3}/queues/${queueKey}/access`).reply(() => {
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
      throw new Error(`Не все HTTP моки были использованы: ${this.pendingMocks.join(', ')}`);
    }
  }
}

/**
 * Хелпер для быстрого создания MockServer в тестах
 */
export function createMockServer(axiosInstance: AxiosInstance): MockServer {
  return new MockServer(axiosInstance);
}
