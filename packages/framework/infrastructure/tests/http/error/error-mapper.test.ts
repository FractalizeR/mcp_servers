/**
 * Тесты для ErrorMapper
 *
 * ОБНОВЛЕНО:
 * - Проверяет, что возвращается ApiErrorClass (extends Error), а не plain object
 * - Проверяет instanceof Error для всех результатов
 * - Проверяет toJSON() сериализацию
 */

import { describe, it, expect } from 'vitest';
import type { AxiosError, AxiosRequestConfig, AxiosResponse } from 'axios';
import { ErrorMapper, ApiErrorClass } from '@fractalizer/mcp-infrastructure';

/**
 * Вспомогательная функция для создания мок AxiosError
 */
function createAxiosError(overrides: Partial<AxiosError> = {}): AxiosError {
  const baseConfig: AxiosRequestConfig = {
    url: '/test',
    method: 'GET',
  };

  return {
    name: 'AxiosError',
    message: overrides.message ?? 'Test error',
    config: overrides.config ?? baseConfig,
    code: overrides.code,
    request: overrides.request,
    response: overrides.response,
    isAxiosError: true,
    toJSON: () => ({}),
  } as AxiosError;
}

/**
 * Вспомогательная функция для создания мок AxiosResponse
 */
function createAxiosResponse(status: number, data: unknown = {}): AxiosResponse {
  return {
    data,
    status,
    statusText: 'Test Status',
    headers: {},
    config: {
      url: '/test',
      method: 'GET',
    } as AxiosRequestConfig,
  } as AxiosResponse;
}

describe('ErrorMapper', () => {
  describe('mapAxiosError', () => {
    describe('Случай 1: Сервер вернул ответ с ошибкой', () => {
      it('должен обработать ошибку 400 с простым сообщением', () => {
        const axiosError = createAxiosError({
          response: createAxiosResponse(400, {
            message: 'Неверный запрос',
          }),
        });

        const result = ErrorMapper.mapAxiosError(axiosError);

        // НОВОЕ: Проверяем, что результат - это ApiErrorClass (extends Error)
        expect(result).toBeInstanceOf(Error);
        expect(result).toBeInstanceOf(ApiErrorClass);
        expect(result.statusCode).toBe(400);
        expect(result.message).toBe('Неверный запрос');
      });

      it('должен обработать ошибку 401 с errorMessages', () => {
        const axiosError = createAxiosError({
          response: createAxiosResponse(401, {
            errorMessages: ['Не авторизован', 'Неверный токен'],
          }),
        });

        const result = ErrorMapper.mapAxiosError(axiosError);

        expect(result.statusCode).toBe(401);
        expect(result.message).toBe('Не авторизован'); // Берёт первое сообщение
      });

      it('должен обработать ошибку 404 с пустым data', () => {
        const axiosError = createAxiosError({
          message: 'Not Found',
          response: createAxiosResponse(404, {}),
        });

        const result = ErrorMapper.mapAxiosError(axiosError);

        expect(result.statusCode).toBe(404);
        expect(result.message).toBe('Not Found'); // Использует error.message
      });

      it('должен обработать ошибку 500 с errors объектом', () => {
        const axiosError = createAxiosError({
          response: createAxiosResponse(500, {
            message: 'Внутренняя ошибка сервера',
            errors: {
              queue: ['Очередь не найдена'],
              summary: ['Поле обязательно'],
            },
          }),
        });

        const result = ErrorMapper.mapAxiosError(axiosError);

        expect(result.statusCode).toBe(500);
        expect(result.message).toBe('Внутренняя ошибка сервера');
        expect(result.errors).toEqual({
          queue: ['Очередь не найдена'],
          summary: ['Поле обязательно'],
        });
      });

      it('должен обработать ошибку без response.data', () => {
        const axiosError = createAxiosError({
          message: 'Generic error',
          response: createAxiosResponse(503, undefined),
        });

        const result = ErrorMapper.mapAxiosError(axiosError);

        expect(result.statusCode).toBe(503);
        expect(result.message).toBe('Generic error');
      });

      it('должен использовать fallback chain для сообщения', () => {
        const axiosError = createAxiosError({
          message: 'Fallback message',
          response: createAxiosResponse(400, {
            // Нет errorMessages и message
          }),
        });

        const result = ErrorMapper.mapAxiosError(axiosError);

        expect(result.statusCode).toBe(400);
        expect(result.message).toBe('Fallback message');
      });

      it('должен игнорировать пустой массив errorMessages', () => {
        const axiosError = createAxiosError({
          message: 'Fallback message',
          response: createAxiosResponse(400, {
            errorMessages: [], // Пустой массив
            message: 'Actual message',
          }),
        });

        const result = ErrorMapper.mapAxiosError(axiosError);

        expect(result.message).toBe('Actual message');
      });
    });

    describe('Случай 2: Специальная обработка rate limiting (429)', () => {
      it('должен обработать 429 с заголовком Retry-After', () => {
        const response = createAxiosResponse(429, {
          message: 'Too Many Requests',
        });
        response.headers = { 'retry-after': '60' };

        const axiosError = createAxiosError({ response });

        const result = ErrorMapper.mapAxiosError(axiosError);

        expect(result.statusCode).toBe(429);
        expect(result.message).toBe('Rate limit exceeded. Retry after 60 seconds.');
        // Discriminated union гарантирует наличие retryAfter для 429
        if (result.statusCode === 429) {
          expect(result.retryAfter).toBe(60);
        }
      });

      it('должен обработать 429 без заголовка Retry-After (использует 60 по умолчанию)', () => {
        const axiosError = createAxiosError({
          response: createAxiosResponse(429, {
            message: 'Too Many Requests',
          }),
        });

        const result = ErrorMapper.mapAxiosError(axiosError);

        expect(result.statusCode).toBe(429);
        expect(result.message).toBe('Rate limit exceeded. Retry after 60 seconds.');
        // Discriminated union гарантирует наличие retryAfter для 429
        if (result.statusCode === 429) {
          expect(result.retryAfter).toBe(60);
        }
      });

      it('должен обработать 429 с невалидным Retry-After (использует 60 по умолчанию)', () => {
        const response = createAxiosResponse(429, {
          message: 'Too Many Requests',
        });
        response.headers = { 'retry-after': 'invalid' };

        const axiosError = createAxiosError({ response });

        const result = ErrorMapper.mapAxiosError(axiosError);

        expect(result.statusCode).toBe(429);
        expect(result.message).toBe('Rate limit exceeded. Retry after 60 seconds.');
        if (result.statusCode === 429) {
          expect(result.retryAfter).toBe(60);
        }
      });

      it('должен обработать 429 с Retry-After = 0 (не валиден, используется 60)', () => {
        const response = createAxiosResponse(429, {
          message: 'Too Many Requests',
        });
        response.headers = { 'retry-after': '0' };

        const axiosError = createAxiosError({ response });

        const result = ErrorMapper.mapAxiosError(axiosError);

        expect(result.statusCode).toBe(429);
        expect(result.message).toBe('Rate limit exceeded. Retry after 60 seconds.');
        if (result.statusCode === 429) {
          expect(result.retryAfter).toBe(60);
        }
      });
    });

    describe('Случай 3: Запрос был отправлен, но нет ответа', () => {
      it('должен обработать сетевую ошибку', () => {
        const axiosError = createAxiosError({
          message: 'Network Error',
          request: {}, // Запрос был отправлен
          // response: undefined - не передаем, если нет ответа
        });

        const result = ErrorMapper.mapAxiosError(axiosError);

        expect(result.statusCode).toBe(0);
        expect(result.message).toBe('Нет ответа от сервера. Проверьте подключение к интернету.');
      });

      it('должен обработать таймаут', () => {
        const axiosError = createAxiosError({
          message: 'timeout of 5000ms exceeded',
          code: 'ECONNABORTED',
          request: {},
          // response: undefined - не передаем, если нет ответа
        });

        const result = ErrorMapper.mapAxiosError(axiosError);

        expect(result.statusCode).toBe(0);
        expect(result.message).toBe('Нет ответа от сервера. Проверьте подключение к интернету.');
      });
    });

    describe('Случай 4: Ошибка при настройке запроса', () => {
      it('должен обработать ошибку конфигурации', () => {
        const axiosError = createAxiosError({
          message: 'Invalid URL',
          // request: undefined, response: undefined - не передаем, если нет
        });

        const result = ErrorMapper.mapAxiosError(axiosError);

        expect(result.statusCode).toBe(0);
        expect(result.message).toBe('Invalid URL');
      });

      it('должен обработать отсутствие сообщения', () => {
        const axiosError = createAxiosError({
          message: '', // Пустое сообщение
          // request: undefined, response: undefined - не передаем, если нет
        });

        const result = ErrorMapper.mapAxiosError(axiosError);

        expect(result.statusCode).toBe(0);
        expect(result.message).toBe('Неизвестная ошибка');
      });
    });

    describe('Граничные случаи', () => {
      it('должен обработать null data в response', () => {
        const axiosError = createAxiosError({
          message: 'Error',
          response: createAxiosResponse(500, null),
        });

        const result = ErrorMapper.mapAxiosError(axiosError);

        expect(result.statusCode).toBe(500);
        expect(result.message).toBe('Error');
      });

      it('должен обработать data как примитив (не объект)', () => {
        const axiosError = createAxiosError({
          message: 'Error',
          response: createAxiosResponse(500, 'Plain string error'),
        });

        const result = ErrorMapper.mapAxiosError(axiosError);

        expect(result.statusCode).toBe(500);
        expect(result.message).toBe('Error');
      });

      it('должен обработать отсутствие status в response', () => {
        const response = createAxiosResponse(0, {});
        delete (response as Partial<AxiosResponse>).status;

        const axiosError = createAxiosError({
          message: 'No status',
          response,
        });

        const result = ErrorMapper.mapAxiosError(axiosError);

        // Когда status undefined, используется response?.status ?? 0
        expect(result.statusCode).toBeUndefined();
        expect(result.message).toBe('No status');
      });
    });

    describe('НОВОЕ: Интеграция с ApiErrorClass', () => {
      it('должен возвращать ApiErrorClass (extends Error) вместо plain object', () => {
        const axiosError = createAxiosError({
          response: createAxiosResponse(404, {
            message: 'Not Found',
          }),
        });

        const result = ErrorMapper.mapAxiosError(axiosError);

        // КРИТИЧЕСКАЯ ПРОВЕРКА: результат должен быть instanceof Error
        expect(result).toBeInstanceOf(Error);
        expect(result).toBeInstanceOf(ApiErrorClass);
        expect(result.name).toBe('ApiErrorClass');
      });

      it('НЕ должен превращаться в "[object Object]" при String()', () => {
        const axiosError = createAxiosError({
          response: createAxiosResponse(404, {
            message: 'Not Found',
          }),
        });

        const result = ErrorMapper.mapAxiosError(axiosError);

        // Это была критическая проблема с plain object ApiError
        expect(String(result)).not.toBe('[object Object]');
        expect(String(result)).toBe('ApiErrorClass [404]: Not Found');
      });

      it('должен корректно передаваться через Promise.reject()', async () => {
        const axiosError = createAxiosError({
          response: createAxiosResponse(500, {
            message: 'Internal Server Error',
            errors: { field: ['Error message'] },
          }),
        });

        const error = ErrorMapper.mapAxiosError(axiosError);

        try {
          await Promise.reject(error);
           
        } catch (caught) {
          // КРИТИЧЕСКАЯ ПРОВЕРКА: все детали должны сохраниться
          expect(caught).toBeInstanceOf(ApiErrorClass);
          expect((caught as ApiErrorClass).statusCode).toBe(500);
          expect((caught as ApiErrorClass).message).toBe('Internal Server Error');
          expect((caught as ApiErrorClass).errors).toEqual({ field: ['Error message'] });
        }
      });

      it('должен иметь работающий toJSON() метод', () => {
        const axiosError = createAxiosError({
          response: createAxiosResponse(400, {
            message: 'Bad Request',
            errors: {
              summary: ['Required field'],
              assignee: ['Invalid user'],
            },
          }),
        });

        const result = ErrorMapper.mapAxiosError(axiosError);
        const json = result.toJSON();

        expect(json).toEqual({
          statusCode: 400,
          message: 'Bad Request',
          errors: {
            summary: ['Required field'],
            assignee: ['Invalid user'],
          },
        });
      });

      it('должен сериализоваться через JSON.stringify()', () => {
        const axiosError = createAxiosError({
          response: createAxiosResponse(404, {
            message: 'Not Found',
          }),
        });

        const result = ErrorMapper.mapAxiosError(axiosError);
        const jsonString = JSON.stringify(result);
        const parsed = JSON.parse(jsonString);

        expect(parsed).toEqual({
          statusCode: 404,
          message: 'Not Found',
        });
      });

      it('должен сохранять retryAfter для 429 ошибок', () => {
        const response = createAxiosResponse(429, {});
        response.headers = { 'retry-after': '120' };

        const axiosError = createAxiosError({ response });
        const result = ErrorMapper.mapAxiosError(axiosError);

        expect(result).toBeInstanceOf(ApiErrorClass);
        expect(result.statusCode).toBe(429);
        expect(result.retryAfter).toBe(120);

        const json = result.toJSON();
        expect(json.retryAfter).toBe(120);
      });

      it('должен работать с try-catch блоками', () => {
        const axiosError = createAxiosError({
          response: createAxiosResponse(403, {
            message: 'Forbidden',
          }),
        });

        const error = ErrorMapper.mapAxiosError(axiosError);

        try {
          throw error;
        } catch (caught) {
          expect(caught instanceof Error).toBe(true);
          expect(caught instanceof ApiErrorClass).toBe(true);
          expect((caught as ApiErrorClass).statusCode).toBe(403);
          expect((caught as ApiErrorClass).message).toBe('Forbidden');
        }
      });

      it('должен сохранять stack trace', () => {
        const axiosError = createAxiosError({
          response: createAxiosResponse(500, {
            message: 'Error',
          }),
        });

        const result = ErrorMapper.mapAxiosError(axiosError);

        expect(result.stack).toBeDefined();
        expect(result.stack).toContain('ApiErrorClass');
      });
    });
  });
});
