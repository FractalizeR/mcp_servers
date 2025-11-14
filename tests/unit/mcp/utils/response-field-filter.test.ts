import { describe, it, expect } from 'vitest';
import { ResponseFieldFilter } from '@mcp/utils/response-field-filter.js';

describe('ResponseFieldFilter', () => {
  describe('filter', () => {
    it('должен выбросить ошибку если fields не указаны', () => {
      const data = { key: 'QUEUE-1', summary: 'Test', status: 'open' };

      expect(() => {
        // Тестирование runtime проверки (обход типов для проверки валидации)
        ResponseFieldFilter.filter(data, undefined as unknown as string[]);
      }).toThrow('Параметр fields обязателен и должен содержать хотя бы один элемент');
    });

    it('должен выбросить ошибку если fields пустой массив', () => {
      const data = { key: 'QUEUE-1', summary: 'Test', status: 'open' };

      expect(() => {
        ResponseFieldFilter.filter(data, []);
      }).toThrow('Параметр fields обязателен и должен содержать хотя бы один элемент');
    });

    it('должен отфильтровать объект по списку полей верхнего уровня', () => {
      const data = {
        key: 'QUEUE-1',
        summary: 'Test',
        status: 'open',
        description: 'Description',
      };

      const result = ResponseFieldFilter.filter(data, ['key', 'summary']);

      expect(result).toEqual({
        key: 'QUEUE-1',
        summary: 'Test',
      });
    });

    it('должен вернуть весь вложенный объект при указании только имени поля', () => {
      const data = {
        key: 'QUEUE-1',
        summary: 'Test',
        assignee: {
          login: 'user1',
          email: 'user1@example.com',
          name: 'User One',
        },
      };

      const result = ResponseFieldFilter.filter(data, ['key', 'assignee']);

      expect(result).toEqual({
        key: 'QUEUE-1',
        assignee: {
          login: 'user1',
          email: 'user1@example.com',
          name: 'User One',
        },
      });
    });

    it('должен поддерживать dot-notation для вложенных полей', () => {
      const data = {
        key: 'QUEUE-1',
        summary: 'Test',
        assignee: {
          login: 'user1',
          email: 'user1@example.com',
          name: 'User One',
        },
      };

      const result = ResponseFieldFilter.filter(data, ['key', 'assignee.login']);

      expect(result).toEqual({
        key: 'QUEUE-1',
        assignee: {
          login: 'user1',
        },
      });
    });

    it('должен обрабатывать несколько вложенных полей из одного объекта', () => {
      const data = {
        key: 'QUEUE-1',
        assignee: {
          login: 'user1',
          email: 'user1@example.com',
          name: 'User One',
        },
      };

      const result = ResponseFieldFilter.filter(data, ['assignee.login', 'assignee.email']);

      expect(result).toEqual({
        assignee: {
          login: 'user1',
          email: 'user1@example.com',
        },
      });
    });

    it('должен обрабатывать глубоко вложенные поля', () => {
      const data = {
        key: 'QUEUE-1',
        meta: {
          author: {
            profile: {
              login: 'admin',
              role: 'superuser',
            },
          },
        },
      };

      const result = ResponseFieldFilter.filter(data, ['meta.author.profile.login']);

      expect(result).toEqual({
        meta: {
          author: {
            profile: {
              login: 'admin',
            },
          },
        },
      });
    });

    it('должен игнорировать несуществующие поля', () => {
      const data = {
        key: 'QUEUE-1',
        summary: 'Test',
      };

      const result = ResponseFieldFilter.filter(data, ['key', 'nonexistent', 'also.nonexistent']);

      expect(result).toEqual({
        key: 'QUEUE-1',
      });
    });

    it('должен обрабатывать массивы объектов', () => {
      const data = [
        { key: 'QUEUE-1', summary: 'Test 1', status: 'open' },
        { key: 'QUEUE-2', summary: 'Test 2', status: 'closed' },
      ];

      const result = ResponseFieldFilter.filter(data, ['key', 'summary']);

      expect(result).toEqual([
        { key: 'QUEUE-1', summary: 'Test 1' },
        { key: 'QUEUE-2', summary: 'Test 2' },
      ]);
    });

    it('должен вернуть примитивное значение как есть', () => {
      expect(ResponseFieldFilter.filter('string', ['field'])).toBe('string');
      expect(ResponseFieldFilter.filter(123, ['field'])).toBe(123);
      expect(ResponseFieldFilter.filter(true, ['field'])).toBe(true);
      expect(ResponseFieldFilter.filter(null, ['field'])).toBe(null);
    });

    it('должен обрабатывать пустой объект', () => {
      const data = {};

      const result = ResponseFieldFilter.filter(data, ['key', 'summary']);

      expect(result).toEqual({});
    });

    it('должен сохранять null значения в выбранных полях', () => {
      const data = {
        key: 'QUEUE-1',
        assignee: null,
        status: 'open',
      };

      const result = ResponseFieldFilter.filter(data, ['key', 'assignee']);

      expect(result).toEqual({
        key: 'QUEUE-1',
        assignee: null,
      });
    });
  });

  describe('normalizeFields', () => {
    it('должен выбросить ошибку для undefined', () => {
      expect(() => {
        // Тестирование runtime проверки (обход типов для проверки валидации)
        ResponseFieldFilter.normalizeFields(undefined as unknown as string[]);
      }).toThrow('Параметр fields обязателен и должен содержать хотя бы один элемент');
    });

    it('должен выбросить ошибку для пустого массива', () => {
      expect(() => {
        ResponseFieldFilter.normalizeFields([]);
      }).toThrow('Параметр fields обязателен и должен содержать хотя бы один элемент');
    });

    it('должен удалить дубликаты', () => {
      const fields = ['key', 'summary', 'key', 'status', 'summary'];

      const result = ResponseFieldFilter.normalizeFields(fields);

      expect(result).toEqual(['key', 'status', 'summary']);
    });

    it('должен отсортировать поля', () => {
      const fields = ['status', 'key', 'summary'];

      const result = ResponseFieldFilter.normalizeFields(fields);

      expect(result).toEqual(['key', 'status', 'summary']);
    });

    it('должен удалить пустые строки', () => {
      const fields = ['key', '', 'summary', '  ', 'status'];

      const result = ResponseFieldFilter.normalizeFields(fields);

      expect(result).toEqual(['key', 'status', 'summary']);
    });

    it('должен обрезать пробелы', () => {
      const fields = ['  key  ', 'summary', '  status'];

      const result = ResponseFieldFilter.normalizeFields(fields);

      expect(result).toEqual(['key', 'status', 'summary']);
    });

    it('должен выбросить ошибку если все поля пустые', () => {
      const fields = ['', '  ', '\t'];

      expect(() => {
        ResponseFieldFilter.normalizeFields(fields);
      }).toThrow('После нормализации массив полей пуст (все элементы были пустыми строками)');
    });
  });

  describe('validateFields', () => {
    it('должен вернуть ошибку для undefined', () => {
      // Тестирование runtime проверки (обход типов для проверки валидации)
      const error = ResponseFieldFilter.validateFields(undefined as unknown as string[]);

      expect(error).toBe('Параметр fields обязателен и должен содержать хотя бы один элемент');
    });

    it('должен вернуть ошибку для пустого массива', () => {
      const error = ResponseFieldFilter.validateFields([]);

      expect(error).toBe('Параметр fields обязателен и должен содержать хотя бы один элемент');
    });

    it('должен вернуть undefined для валидных полей', () => {
      const fields = ['key', 'summary', 'assignee.login', 'meta.author.id'];

      expect(ResponseFieldFilter.validateFields(fields)).toBeUndefined();
    });

    it('должен отклонить пустую строку', () => {
      const fields = ['key', '', 'summary'];

      const error = ResponseFieldFilter.validateFields(fields);

      expect(error).toBe('Поле не может быть пустой строкой');
    });

    it('должен отклонить недопустимые символы', () => {
      const fields = ['key', 'summary', 'invalid-field'];

      const error = ResponseFieldFilter.validateFields(fields);

      expect(error).toContain('Недопустимый формат поля');
      expect(error).toContain('invalid-field');
    });

    it('должен отклонить двойные точки', () => {
      const fields = ['key', 'assignee..login'];

      const error = ResponseFieldFilter.validateFields(fields);

      expect(error).toContain('Двойные точки не разрешены');
    });

    it('должен отклонить точку в начале', () => {
      const fields = ['key', '.assignee.login'];

      const error = ResponseFieldFilter.validateFields(fields);

      expect(error).toContain('не может начинаться или заканчиваться точкой');
    });

    it('должен отклонить точку в конце', () => {
      const fields = ['key', 'assignee.login.'];

      const error = ResponseFieldFilter.validateFields(fields);

      expect(error).toContain('не может начинаться или заканчиваться точкой');
    });

    it('должен принять поля с цифрами и подчёркиваниями', () => {
      const fields = ['field_1', 'field2', 'nested.field_3'];

      expect(ResponseFieldFilter.validateFields(fields)).toBeUndefined();
    });
  });
});
