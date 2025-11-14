/**
 * Тесты для ErrorMapper
 */

import {describe, it, expect} from 'vitest';
import type { AxiosError, AxiosRequestConfig, AxiosResponse } from 'axios';
import { ErrorMapper } from '@infrastructure/http/error/error-mapper.js';
import type { ApiError } from '@types';

/**
 * Вспомогательная функция для создания мок AxiosError
 */
function createAxiosError(
  overrides: Partial<AxiosError> = {}
): AxiosError {
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
function createAxiosResponse(
  status: number,
  data: unknown = {}
): AxiosResponse {
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

        const result: ApiError = ErrorMapper.mapAxiosError(axiosError);

        expect(result.statusCode).toBe(400);
        expect(result.message).toBe('Неверный запрос');
      });

      it('должен обработать ошибку 401 с errorMessages', () => {
        const axiosError = createAxiosError({
          response: createAxiosResponse(401, {
            errorMessages: ['Не авторизован', 'Неверный токен'],
          }),
        });

        const result: ApiError = ErrorMapper.mapAxiosError(axiosError);

        expect(result.statusCode).toBe(401);
        expect(result.message).toBe('Не авторизован'); // Берёт первое сообщение
      });

      it('должен обработать ошибку 404 с пустым data', () => {
        const axiosError = createAxiosError({
          message: 'Not Found',
          response: createAxiosResponse(404, {}),
        });

        const result: ApiError = ErrorMapper.mapAxiosError(axiosError);

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

        const result: ApiError = ErrorMapper.mapAxiosError(axiosError);

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

        const result: ApiError = ErrorMapper.mapAxiosError(axiosError);

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

        const result: ApiError = ErrorMapper.mapAxiosError(axiosError);

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

        const result: ApiError = ErrorMapper.mapAxiosError(axiosError);

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

        const result: ApiError = ErrorMapper.mapAxiosError(axiosError);

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

        const result: ApiError = ErrorMapper.mapAxiosError(axiosError);

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

        const result: ApiError = ErrorMapper.mapAxiosError(axiosError);

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

        const result: ApiError = ErrorMapper.mapAxiosError(axiosError);

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
          response: undefined, // Нет ответа
        });

        const result: ApiError = ErrorMapper.mapAxiosError(axiosError);

        expect(result.statusCode).toBe(0);
        expect(result.message).toBe('Нет ответа от сервера. Проверьте подключение к интернету.');
      });

      it('должен обработать таймаут', () => {
        const axiosError = createAxiosError({
          message: 'timeout of 5000ms exceeded',
          code: 'ECONNABORTED',
          request: {},
          response: undefined,
        });

        const result: ApiError = ErrorMapper.mapAxiosError(axiosError);

        expect(result.statusCode).toBe(0);
        expect(result.message).toBe('Нет ответа от сервера. Проверьте подключение к интернету.');
      });
    });

    describe('Случай 4: Ошибка при настройке запроса', () => {
      it('должен обработать ошибку конфигурации', () => {
        const axiosError = createAxiosError({
          message: 'Invalid URL',
          request: undefined,
          response: undefined,
        });

        const result: ApiError = ErrorMapper.mapAxiosError(axiosError);

        expect(result.statusCode).toBe(0);
        expect(result.message).toBe('Invalid URL');
      });

      it('должен обработать отсутствие сообщения', () => {
        const axiosError = createAxiosError({
          message: '', // Пустое сообщение
          request: undefined,
          response: undefined,
        });

        const result: ApiError = ErrorMapper.mapAxiosError(axiosError);

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

        const result: ApiError = ErrorMapper.mapAxiosError(axiosError);

        expect(result.statusCode).toBe(500);
        expect(result.message).toBe('Error');
      });

      it('должен обработать data как примитив (не объект)', () => {
        const axiosError = createAxiosError({
          message: 'Error',
          response: createAxiosResponse(500, 'Plain string error'),
        });

        const result: ApiError = ErrorMapper.mapAxiosError(axiosError);

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

        const result: ApiError = ErrorMapper.mapAxiosError(axiosError);

        // Когда status undefined, используется response?.status ?? 0
        expect(result.statusCode).toBeUndefined();
        expect(result.message).toBe('No status');
      });
    });
  });
});
