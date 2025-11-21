/**
 * Тесты для ApiErrorClass
 */

import { describe, it, expect } from 'vitest';
import { ApiErrorClass } from '@mcp-framework/infrastructure/http/error/api-error.class.js';
import { HttpStatusCode } from '@mcp-framework/infrastructure/types.js';

describe('ApiErrorClass', () => {
  describe('Конструктор', () => {
    it('должен создать экземпляр с минимальными параметрами', () => {
      const error = new ApiErrorClass(404, 'Not Found');

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(ApiErrorClass);
      expect(error.statusCode).toBe(404);
      expect(error.message).toBe('Not Found');
      expect(error.name).toBe('ApiErrorClass');
      expect(error.errors).toBeUndefined();
      expect(error.retryAfter).toBeUndefined();
    });

    it('должен создать экземпляр с полями errors', () => {
      const errors = {
        summary: ['Required field', 'Too long'],
        assignee: ['Invalid user ID'],
      };
      const error = new ApiErrorClass(400, 'Validation failed', errors);

      expect(error.statusCode).toBe(400);
      expect(error.message).toBe('Validation failed');
      expect(error.errors).toEqual(errors);
      expect(error.retryAfter).toBeUndefined();
    });

    it('должен создать экземпляр с retryAfter (429 ошибка)', () => {
      const error = new ApiErrorClass(
        HttpStatusCode.TOO_MANY_REQUESTS,
        'Rate limit exceeded',
        undefined,
        60
      );

      expect(error.statusCode).toBe(429);
      expect(error.message).toBe('Rate limit exceeded');
      expect(error.errors).toBeUndefined();
      expect(error.retryAfter).toBe(60);
    });

    it('должен создать экземпляр со всеми параметрами', () => {
      const errors = { field: ['Error'] };
      const error = new ApiErrorClass(400, 'Bad Request', errors, 120);

      expect(error.statusCode).toBe(400);
      expect(error.message).toBe('Bad Request');
      expect(error.errors).toEqual(errors);
      expect(error.retryAfter).toBe(120);
    });
  });

  describe('instanceof Error', () => {
    it('должен работать с instanceof Error', () => {
      const error = new ApiErrorClass(500, 'Internal Server Error');

      expect(error instanceof Error).toBe(true);
      expect(error instanceof ApiErrorClass).toBe(true);
    });

    it('должен работать с try-catch', () => {
      try {
        throw new ApiErrorClass(403, 'Forbidden');
      } catch (error) {
        expect(error instanceof Error).toBe(true);
        expect(error instanceof ApiErrorClass).toBe(true);
        expect((error as ApiErrorClass).statusCode).toBe(403);
      }
    });

    it('должен сохранять stack trace', () => {
      const error = new ApiErrorClass(500, 'Error');

      expect(error.stack).toBeDefined();
      expect(error.stack).toContain('ApiErrorClass');
    });
  });

  describe('toJSON()', () => {
    it('должен сериализовать минимальные поля', () => {
      const error = new ApiErrorClass(404, 'Not Found');
      const json = error.toJSON();

      expect(json).toEqual({
        statusCode: 404,
        message: 'Not Found',
      });
    });

    it('должен сериализовать с errors', () => {
      const errors = {
        summary: ['Required'],
        assignee: ['Invalid'],
      };
      const error = new ApiErrorClass(400, 'Bad Request', errors);
      const json = error.toJSON();

      expect(json).toEqual({
        statusCode: 400,
        message: 'Bad Request',
        errors,
      });
    });

    it('должен сериализовать с retryAfter', () => {
      const error = new ApiErrorClass(429, 'Rate limit', undefined, 60);
      const json = error.toJSON();

      expect(json).toEqual({
        statusCode: 429,
        message: 'Rate limit',
        retryAfter: 60,
      });
    });

    it('должен сериализовать все поля', () => {
      const errors = { field: ['Error'] };
      const error = new ApiErrorClass(400, 'Bad Request', errors, 30);
      const json = error.toJSON();

      expect(json).toEqual({
        statusCode: 400,
        message: 'Bad Request',
        errors,
        retryAfter: 30,
      });
    });

    it('должен работать с JSON.stringify()', () => {
      const error = new ApiErrorClass(404, 'Not Found');
      const jsonString = JSON.stringify(error);
      const parsed = JSON.parse(jsonString);

      expect(parsed).toEqual({
        statusCode: 404,
        message: 'Not Found',
      });
    });
  });

  describe('toString()', () => {
    it('должен возвращать строку с форматом "ApiErrorClass [statusCode]: message"', () => {
      const error = new ApiErrorClass(404, 'Not Found');

      expect(error.toString()).toBe('ApiErrorClass [404]: Not Found');
    });

    it('должен работать с String()', () => {
      const error = new ApiErrorClass(500, 'Internal Server Error');

      expect(String(error)).toBe('ApiErrorClass [500]: Internal Server Error');
    });

    it('должен работать для всех статус-кодов', () => {
      const testCases = [
        { statusCode: 400, message: 'Bad Request' },
        { statusCode: 401, message: 'Unauthorized' },
        { statusCode: 403, message: 'Forbidden' },
        { statusCode: 404, message: 'Not Found' },
        { statusCode: 429, message: 'Too Many Requests' },
        { statusCode: 500, message: 'Internal Server Error' },
      ];

      testCases.forEach(({ statusCode, message }) => {
        const error = new ApiErrorClass(statusCode, message);
        expect(error.toString()).toBe(`ApiErrorClass [${statusCode}]: ${message}`);
      });
    });
  });

  describe('Promise rejection', () => {
    it('должен корректно передаваться через Promise.reject()', async () => {
      const originalError = new ApiErrorClass(404, 'Not Found', { field: ['Error'] });

      try {
        await Promise.reject(originalError);
         
      } catch (error) {
        expect(error).toBeInstanceOf(ApiErrorClass);
        expect((error as ApiErrorClass).statusCode).toBe(404);
        expect((error as ApiErrorClass).message).toBe('Not Found');
        expect((error as ApiErrorClass).errors).toEqual({ field: ['Error'] });
      }
    });

    it('НЕ должен превращаться в "[object Object]" при String()', () => {
      const error = new ApiErrorClass(404, 'Not Found');

      // Это была проблема с plain object ApiError
      expect(String(error)).not.toBe('[object Object]');
      expect(String(error)).toBe('ApiErrorClass [404]: Not Found');
    });
  });

  describe('Граничные случаи', () => {
    it('должен работать с пустым сообщением', () => {
      const error = new ApiErrorClass(400, '');

      expect(error.message).toBe('');
      expect(error.toString()).toBe('ApiErrorClass [400]: ');
    });

    it('должен работать с очень длинным сообщением', () => {
      const longMessage = 'a'.repeat(1000);
      const error = new ApiErrorClass(400, longMessage);

      expect(error.message).toBe(longMessage);
      expect(error.message.length).toBe(1000);
    });

    it('должен работать с пустым объектом errors', () => {
      const error = new ApiErrorClass(400, 'Bad Request', {});

      expect(error.errors).toEqual({});
      expect(error.toJSON().errors).toEqual({});
    });

    it('должен работать с retryAfter = 0', () => {
      const error = new ApiErrorClass(429, 'Rate limit', undefined, 0);

      expect(error.retryAfter).toBe(0);
      expect(error.toJSON().retryAfter).toBe(0);
    });

    it('должен работать с большим retryAfter', () => {
      const error = new ApiErrorClass(429, 'Rate limit', undefined, 3600);

      expect(error.retryAfter).toBe(3600);
      expect(error.toJSON().retryAfter).toBe(3600);
    });
  });

  describe('Сравнение с обычным Error', () => {
    it('должен иметь все свойства Error', () => {
      const error = new ApiErrorClass(500, 'Error');

      // Проверяем, что ApiErrorClass имеет все основные свойства Error
      expect(error.name).toBeDefined();
      expect(error.message).toBeDefined();
      expect(error.stack).toBeDefined();

      // Проверяем типы
      expect(typeof error.name).toBe('string');
      expect(typeof error.message).toBe('string');
      expect(typeof error.stack).toBe('string');
    });

    it('должен отличаться от обычного Error дополнительными полями', () => {
      const apiError = new ApiErrorClass(404, 'Not Found');
      const regularError = new Error('Not Found');

      // ApiErrorClass имеет дополнительные поля
      expect('statusCode' in apiError).toBe(true);
      expect('statusCode' in regularError).toBe(false);
    });
  });
});
