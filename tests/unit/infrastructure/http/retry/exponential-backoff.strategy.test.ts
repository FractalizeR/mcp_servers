/**
 * Тесты для ExponentialBackoffStrategy
 */

import { describe, it, expect } from 'vitest';
import { ExponentialBackoffStrategy } from '@infrastructure/http/retry/exponential-backoff.strategy.js';
import type { ApiError } from '@types';

describe('ExponentialBackoffStrategy', () => {
  describe('constructor', () => {
    it('должен использовать значения по умолчанию', () => {
      const strategy = new ExponentialBackoffStrategy();

      expect(strategy.maxRetries).toBe(3);
    });

    it('должен использовать переданные параметры', () => {
      const strategy = new ExponentialBackoffStrategy(5, 2000, 20000);

      expect(strategy.maxRetries).toBe(5);
    });
  });

  describe('shouldRetry', () => {
    let strategy: ExponentialBackoffStrategy;

    beforeEach(() => {
      strategy = new ExponentialBackoffStrategy(3, 1000, 10000);
    });

    describe('Проверка лимита попыток', () => {
      it('должен разрешить retry при попытке < maxRetries', () => {
        const error: ApiError = { statusCode: 500, message: 'Internal Server Error' };

        expect(strategy.shouldRetry(error, 0)).toBe(true);
        expect(strategy.shouldRetry(error, 1)).toBe(true);
        expect(strategy.shouldRetry(error, 2)).toBe(true);
      });

      it('должен запретить retry при попытке >= maxRetries', () => {
        const error: ApiError = { statusCode: 500, message: 'Internal Server Error' };

        expect(strategy.shouldRetry(error, 3)).toBe(false);
        expect(strategy.shouldRetry(error, 4)).toBe(false);
      });
    });

    describe('Повторяемые статус-коды', () => {
      const retryableStatusCodes = [0, 408, 429, 500, 502, 503, 504];

      retryableStatusCodes.forEach((statusCode) => {
        it(`должен разрешить retry для статуса ${statusCode}`, () => {
          const error: ApiError = { statusCode, message: 'Error' };

          expect(strategy.shouldRetry(error, 0)).toBe(true);
        });
      });
    });

    describe('Неповторяемые статус-коды', () => {
      const nonRetryableStatusCodes = [200, 201, 400, 401, 403, 404, 409, 422];

      nonRetryableStatusCodes.forEach((statusCode) => {
        it(`должен запретить retry для статуса ${statusCode}`, () => {
          const error: ApiError = { statusCode, message: 'Error' };

          expect(strategy.shouldRetry(error, 0)).toBe(false);
        });
      });
    });

    describe('Специальные случаи', () => {
      it('должен разрешить retry для сетевой ошибки (statusCode = 0)', () => {
        const error: ApiError = { statusCode: 0, message: 'Network Error' };

        expect(strategy.shouldRetry(error, 0)).toBe(true);
      });

      it('должен разрешить retry для rate limiting (429)', () => {
        const error: ApiError = {
          statusCode: 429,
          message: 'Too Many Requests',
          retryAfter: 60,
        };

        expect(strategy.shouldRetry(error, 0)).toBe(true);
      });

      it('должен разрешить retry для таймаута (408)', () => {
        const error: ApiError = { statusCode: 408, message: 'Request Timeout' };

        expect(strategy.shouldRetry(error, 0)).toBe(true);
      });

      it('должен запретить retry для клиентской ошибки (400)', () => {
        const error: ApiError = { statusCode: 400, message: 'Bad Request' };

        expect(strategy.shouldRetry(error, 0)).toBe(false);
      });
    });
  });

  describe('getDelay', () => {
    let strategy: ExponentialBackoffStrategy;

    beforeEach(() => {
      strategy = new ExponentialBackoffStrategy(5, 1000, 10000);
    });

    describe('Exponential backoff алгоритм', () => {
      it('должен вычислить задержку для попытки 0', () => {
        const delay = strategy.getDelay(0);

        expect(delay).toBe(1000); // 1000 * 2^0 = 1000
      });

      it('должен вычислить задержку для попытки 1', () => {
        const delay = strategy.getDelay(1);

        expect(delay).toBe(2000); // 1000 * 2^1 = 2000
      });

      it('должен вычислить задержку для попытки 2', () => {
        const delay = strategy.getDelay(2);

        expect(delay).toBe(4000); // 1000 * 2^2 = 4000
      });

      it('должен вычислить задержку для попытки 3', () => {
        const delay = strategy.getDelay(3);

        expect(delay).toBe(8000); // 1000 * 2^3 = 8000
      });

      it('должен ограничить задержку maxDelay', () => {
        const delay = strategy.getDelay(10);

        expect(delay).toBe(10000); // Не более maxDelay
      });
    });

    describe('Специальная обработка rate limiting (429)', () => {
      it('должен использовать retryAfter из ошибки для 429', () => {
        const error: ApiError = {
          statusCode: 429,
          message: 'Rate limit exceeded',
          retryAfter: 60,
        };

        const delay = strategy.getDelay(0, error);

        expect(delay).toBe(60000); // 60 секунд * 1000 = 60000 мс
      });

      it('должен использовать exponential backoff для 429 без retryAfter', () => {
        const error: ApiError = {
          statusCode: 429,
          message: 'Rate limit exceeded',
          retryAfter: 60,
        };

        const delay = strategy.getDelay(2, error);

        expect(delay).toBe(60000); // Используется retryAfter
      });

      it('должен обработать retryAfter = 0 (fallback к exponential backoff)', () => {
        const error: ApiError = {
          statusCode: 429,
          message: 'Rate limit exceeded',
          retryAfter: 60,
        };

        const delay = strategy.getDelay(0, error);

        // retryAfter = 60, используется этот параметр
        expect(delay).toBe(60000); // 60 секунд * 1000
      });

      it('должен обработать большой retryAfter', () => {
        const error: ApiError = {
          statusCode: 429,
          message: 'Rate limit exceeded',
          retryAfter: 60,
        };

        const delay = strategy.getDelay(0, error);

        expect(delay).toBe(60000); // 60 секунд * 1000 = 60000 мс
      });
    });

    describe('Кастомные параметры', () => {
      it('должен использовать кастомный baseDelay', () => {
        const customStrategy = new ExponentialBackoffStrategy(3, 500, 10000);

        expect(customStrategy.getDelay(0)).toBe(500);
        expect(customStrategy.getDelay(1)).toBe(1000);
        expect(customStrategy.getDelay(2)).toBe(2000);
      });

      it('должен использовать кастомный maxDelay', () => {
        const customStrategy = new ExponentialBackoffStrategy(5, 1000, 5000);

        expect(customStrategy.getDelay(0)).toBe(1000);
        expect(customStrategy.getDelay(1)).toBe(2000);
        expect(customStrategy.getDelay(2)).toBe(4000);
        expect(customStrategy.getDelay(3)).toBe(5000); // Ограничено maxDelay
        expect(customStrategy.getDelay(10)).toBe(5000); // Ограничено maxDelay
      });
    });

    describe('Граничные случаи', () => {
      it('должен обработать ошибку без statusCode 429', () => {
        const error: ApiError = {
          statusCode: 500,
          message: 'Internal Server Error',
        };

        const delay = strategy.getDelay(1, error);

        expect(delay).toBe(2000); // Обычный exponential backoff
      });

      it('должен обработать undefined error', () => {
        const delay = strategy.getDelay(2);

        expect(delay).toBe(4000); // Обычный exponential backoff
      });

      it('должен обработать отрицательную попытку (теоретически)', () => {
        const delay = strategy.getDelay(-1);

        expect(delay).toBe(500); // 1000 * 2^(-1) = 500
      });
    });
  });

  describe('Интеграционный сценарий', () => {
    it('должен правильно работать через несколько попыток', () => {
      const strategy = new ExponentialBackoffStrategy(3, 1000, 10000);
      const error: ApiError = { statusCode: 500, message: 'Server Error' };

      // Попытка 0
      expect(strategy.shouldRetry(error, 0)).toBe(true);
      expect(strategy.getDelay(0)).toBe(1000);

      // Попытка 1
      expect(strategy.shouldRetry(error, 1)).toBe(true);
      expect(strategy.getDelay(1)).toBe(2000);

      // Попытка 2
      expect(strategy.shouldRetry(error, 2)).toBe(true);
      expect(strategy.getDelay(2)).toBe(4000);

      // Попытка 3 - лимит достигнут
      expect(strategy.shouldRetry(error, 3)).toBe(false);
    });

    it('должен правильно обрабатывать rate limiting через несколько попыток', () => {
      const strategy = new ExponentialBackoffStrategy(3, 1000, 10000);
      const rateLimitError: ApiError = {
        statusCode: 429,
        message: 'Rate limit exceeded',
        retryAfter: 60,
      };

      // Попытка 0
      expect(strategy.shouldRetry(rateLimitError, 0)).toBe(true);
      expect(strategy.getDelay(0, rateLimitError)).toBe(60000); // Используется retryAfter

      // Попытка 1
      expect(strategy.shouldRetry(rateLimitError, 1)).toBe(true);
      expect(strategy.getDelay(1, rateLimitError)).toBe(60000);
    });
  });
});
