import { describe, it, expect } from 'vitest';
import {
  formatZodErrors,
  formatZodErrorsToString,
  ValidationErrorCode,
} from '../../src/utils/zod-error-formatter.js';
import type { ZodIssueMinimal } from '../../src/utils/zod-error-formatter.js';

describe('ZodErrorFormatter', () => {
  describe('formatZodErrors', () => {
    it('должен форматировать invalid_type (integer)', () => {
      const issues: ZodIssueMinimal[] = [
        {
          code: 'invalid_type',
          expected: 'integer',
          received: 'float',
          path: ['limit'],
          message: 'Expected integer, received float',
        },
      ];

      const result = formatZodErrors(issues);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        code: ValidationErrorCode.INVALID_TYPE,
        message: "Поле 'limit': ожидается целое число",
        path: 'limit',
      });
    });

    it('должен форматировать invalid_type (undefined = обязательное поле)', () => {
      const issues: ZodIssueMinimal[] = [
        {
          code: 'invalid_type',
          expected: 'string',
          received: 'undefined',
          path: ['name'],
          message: 'Required',
        },
      ];

      const result = formatZodErrors(issues);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        code: ValidationErrorCode.INVALID_TYPE,
        message: "Поле 'name' обязательно",
        path: 'name',
      });
    });

    it('должен форматировать invalid_enum_value', () => {
      const issues: ZodIssueMinimal[] = [
        {
          code: 'invalid_enum_value',
          options: ['a', 'b', 'c'],
          received: 'invalid',
          path: ['detailLevel'],
          message: 'Invalid enum value...',
        },
      ];

      const result = formatZodErrors(issues);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        code: ValidationErrorCode.INVALID_ENUM,
        message: "Поле 'detailLevel': недопустимое значение 'invalid'",
        path: 'detailLevel',
      });
    });

    it('должен форматировать too_small (inclusive)', () => {
      const issues: ZodIssueMinimal[] = [
        {
          code: 'too_small',
          minimum: 1,
          type: 'number',
          inclusive: true,
          path: ['limit'],
          message: 'Number must be greater than or equal to 1',
        },
      ];

      const result = formatZodErrors(issues);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        code: ValidationErrorCode.TOO_SMALL,
        message: "Поле 'limit': значение должно быть >= 1",
        path: 'limit',
      });
    });

    it('должен форматировать too_small (exclusive)', () => {
      const issues: ZodIssueMinimal[] = [
        {
          code: 'too_small',
          minimum: 0,
          type: 'number',
          inclusive: false,
          path: ['count'],
          message: 'Number must be greater than 0',
        },
      ];

      const result = formatZodErrors(issues);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        code: ValidationErrorCode.TOO_SMALL,
        message: "Поле 'count': значение должно быть > 0",
        path: 'count',
      });
    });

    it('должен форматировать too_big', () => {
      const issues: ZodIssueMinimal[] = [
        {
          code: 'too_big',
          maximum: 100,
          type: 'number',
          inclusive: true,
          path: ['limit'],
          message: 'Number must be less than or equal to 100',
        },
      ];

      const result = formatZodErrors(issues);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        code: ValidationErrorCode.TOO_BIG,
        message: "Поле 'limit': значение должно быть <= 100",
        path: 'limit',
      });
    });

    it('должен форматировать invalid_string (email)', () => {
      const issues: ZodIssueMinimal[] = [
        {
          code: 'invalid_string',
          validation: 'email',
          path: ['email'],
          message: 'Invalid email',
        },
      ];

      const result = formatZodErrors(issues);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        code: ValidationErrorCode.INVALID_STRING,
        message: "Поле 'email': неверный формат (email)",
        path: 'email',
      });
    });

    it('должен форматировать ошибку без path', () => {
      const issues: ZodIssueMinimal[] = [
        {
          code: 'invalid_type',
          expected: 'integer',
          received: 'float',
          path: [],
          message: 'Expected integer, received float',
        },
      ];

      const result = formatZodErrors(issues);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        code: ValidationErrorCode.INVALID_TYPE,
        message: 'Ожидается целое число',
        path: '',
      });
    });

    it('должен форматировать несколько ошибок', () => {
      const issues: ZodIssueMinimal[] = [
        {
          code: 'invalid_type',
          expected: 'string',
          received: 'undefined',
          path: ['name'],
          message: 'Required',
        },
        {
          code: 'too_small',
          minimum: 1,
          type: 'number',
          inclusive: true,
          path: ['limit'],
          message: 'Number must be >= 1',
        },
      ];

      const result = formatZodErrors(issues);

      expect(result).toHaveLength(2);
      expect(result[0]!.code).toBe(ValidationErrorCode.INVALID_TYPE);
      expect(result[1]!.code).toBe(ValidationErrorCode.TOO_SMALL);
    });
  });

  describe('formatZodErrorsToString', () => {
    it('должен объединять ошибки через разделитель', () => {
      const issues: ZodIssueMinimal[] = [
        {
          code: 'invalid_type',
          expected: 'string',
          received: 'undefined',
          path: ['name'],
          message: 'Required',
        },
        {
          code: 'too_small',
          minimum: 1,
          type: 'number',
          inclusive: true,
          path: ['limit'],
          message: 'Number must be >= 1',
        },
      ];

      const result = formatZodErrorsToString(issues);

      expect(result).toBe("Поле 'name' обязательно; Поле 'limit': значение должно быть >= 1");
    });

    it('должен поддерживать кастомный разделитель', () => {
      const issues: ZodIssueMinimal[] = [
        {
          code: 'invalid_enum_value',
          options: ['a', 'b'],
          received: 'x',
          path: ['type'],
          message: 'Invalid',
        },
        {
          code: 'invalid_enum_value',
          options: ['c', 'd'],
          received: 'y',
          path: ['status'],
          message: 'Invalid',
        },
      ];

      const result = formatZodErrorsToString(issues, ' | ');

      expect(result).toBe(
        "Поле 'type': недопустимое значение 'x' | Поле 'status': недопустимое значение 'y'"
      );
    });

    it('должен возвращать пустую строку для пустого массива', () => {
      const result = formatZodErrorsToString([]);

      expect(result).toBe('');
    });
  });
});
