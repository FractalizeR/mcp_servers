import { describe, it, expect } from 'vitest';
import { ResponseFieldFilter } from '../../src/utils/response-field-filter.js';

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

    it('должен обрабатывать вложенное поле когда промежуточное значение не объект', () => {
      const data = {
        key: 'QUEUE-1',
        assignee: 'string_value', // не объект
      };

      // Пытаемся получить вложенное поле из примитива
      const result = ResponseFieldFilter.filter(data, ['assignee.login']);

      // Должен вернуть пустой объект, т.к. assignee.login не существует (assignee - это строка)
      expect(result).toEqual({});
    });

    it('должен обрабатывать очень глубоко вложенные поля (5+ уровней)', () => {
      const data = {
        level1: {
          level2: {
            level3: {
              level4: {
                level5: {
                  value: 'deep',
                  extra: 'ignored',
                },
                ignored: 'value',
              },
            },
          },
        },
      };

      const result = ResponseFieldFilter.filter(data, ['level1.level2.level3.level4.level5.value']);

      expect(result).toEqual({
        level1: {
          level2: {
            level3: {
              level4: {
                level5: {
                  value: 'deep',
                },
              },
            },
          },
        },
      });
    });

    it('должен обрабатывать вложенные поля с null промежуточными значениями', () => {
      const data = {
        key: 'QUEUE-1',
        parent: null,
      };

      // Пытаемся получить вложенное поле из null
      const result = ResponseFieldFilter.filter(data, ['parent.id']);

      // Должен вернуть пустой объект, т.к. parent.id не существует (parent - это null)
      expect(result).toEqual({});
    });

    it('должен обрабатывать массив примитивов', () => {
      const data = ['string1', 'string2', 'string3'];

      const result = ResponseFieldFilter.filter(data, ['field']);

      // Массив примитивов вернётся как есть (map для примитивов)
      expect(result).toEqual(['string1', 'string2', 'string3']);
    });

    it('должен обрабатывать несуществующие поля', () => {
      const data = {
        key: 'QUEUE-1',
        summary: 'Test',
      };

      const result = ResponseFieldFilter.filter(data, ['nonExistentField']);

      // Должен вернуть пустой объект, т.к. поле не существует
      expect(result).toEqual({});
    });

    it('должен обрабатывать несуществующие вложенные поля', () => {
      const data = {
        key: 'QUEUE-1',
        assignee: {
          login: 'user1',
        },
      };

      const result = ResponseFieldFilter.filter(data, ['assignee.nonExistent.deep']);

      // Должен вернуть объект с пустым assignee (т.к. nonExistent не существует)
      expect(result).toEqual({ assignee: {} });
    });

    it('должен обрабатывать примитивное значение как данные', () => {
      const data = 'simple string';

      const result = ResponseFieldFilter.filter(data, ['field']);

      // Примитивы возвращаем как есть
      expect(result).toBe('simple string');
    });

    it('должен обрабатывать null как данные', () => {
      const data = null;

      const result = ResponseFieldFilter.filter(data, ['field']);

      // null возвращаем как есть
      expect(result).toBeNull();
    });

    describe('фильтрация внутри вложенных массивов', () => {
      it('должен фильтровать поля внутри массива объектов (changelog use case)', () => {
        const data = {
          updatedAt: '2024-01-01T00:00:00.000Z',
          type: 'IssueUpdated',
          fields: [
            {
              field: { id: 'status', display: 'Status' },
              from: { key: 'open', display: 'Open' },
              to: { key: 'closed', display: 'Closed' },
            },
            {
              field: { id: 'assignee', display: 'Assignee' },
              from: { login: 'user1', display: 'User 1' },
              to: { login: 'user2', display: 'User 2' },
            },
          ],
        };

        const result = ResponseFieldFilter.filter(data, [
          'updatedAt',
          'fields.field.display',
          'fields.from.display',
          'fields.to.display',
        ]);

        expect(result).toEqual({
          updatedAt: '2024-01-01T00:00:00.000Z',
          fields: [
            {
              field: { display: 'Status' },
              from: { display: 'Open' },
              to: { display: 'Closed' },
            },
            {
              field: { display: 'Assignee' },
              from: { display: 'User 1' },
              to: { display: 'User 2' },
            },
          ],
        });
      });

      it('должен возвращать весь массив при указании только имени поля-массива', () => {
        const data = {
          id: '123',
          fields: [
            { field: { id: 'status' }, from: 'open', to: 'closed' },
            { field: { id: 'priority' }, from: 'low', to: 'high' },
          ],
        };

        const result = ResponseFieldFilter.filter(data, ['id', 'fields']);

        expect(result).toEqual({
          id: '123',
          fields: [
            { field: { id: 'status' }, from: 'open', to: 'closed' },
            { field: { id: 'priority' }, from: 'low', to: 'high' },
          ],
        });
      });

      it('должен обрабатывать пустой массив', () => {
        const data = {
          id: '123',
          fields: [],
        };

        const result = ResponseFieldFilter.filter(data, ['id', 'fields.field.display']);

        expect(result).toEqual({
          id: '123',
          fields: [],
        });
      });

      it('должен обрабатывать массив с примитивами', () => {
        const data = {
          id: '123',
          tags: ['tag1', 'tag2', 'tag3'],
        };

        // При попытке получить вложенное поле из примитивов, возвращаем примитивы как есть
        const result = ResponseFieldFilter.filter(data, ['id', 'tags.name']);

        expect(result).toEqual({
          id: '123',
          tags: ['tag1', 'tag2', 'tag3'],
        });
      });

      it('должен обрабатывать вложенные массивы на нескольких уровнях', () => {
        const data = {
          id: '123',
          changelog: [
            {
              type: 'update',
              changes: [
                { field: 'status', oldValue: 'open', newValue: 'closed' },
                { field: 'priority', oldValue: 'low', newValue: 'high' },
              ],
            },
          ],
        };

        const result = ResponseFieldFilter.filter(data, ['changelog.changes.field']);

        expect(result).toEqual({
          changelog: [
            {
              changes: [{ field: 'status' }, { field: 'priority' }],
            },
          ],
        });
      });

      it('должен обрабатывать массив с null элементами', () => {
        const data = {
          id: '123',
          items: [{ name: 'item1' }, null, { name: 'item2' }],
        };

        const result = ResponseFieldFilter.filter(data, ['id', 'items.name']);

        expect(result).toEqual({
          id: '123',
          items: [{ name: 'item1' }, null, { name: 'item2' }],
        });
      });

      it('должен обрабатывать несколько полей из одного массива', () => {
        const data = {
          fields: [{ field: { id: 'a', display: 'A' }, from: { x: 1 }, to: { y: 2 } }],
        };

        const result = ResponseFieldFilter.filter(data, [
          'fields.field.id',
          'fields.field.display',
          'fields.to',
        ]);

        expect(result).toEqual({
          fields: [
            {
              field: { id: 'a', display: 'A' },
              to: { y: 2 },
            },
          ],
        });
      });

      it('должен игнорировать несуществующие поля внутри элементов массива', () => {
        const data = {
          fields: [{ field: { id: 'status' } }],
        };

        const result = ResponseFieldFilter.filter(data, ['fields.nonexistent']);

        expect(result).toEqual({
          fields: [{}],
        });
      });

      it('должен корректно обрабатывать реальный changelog с type и transport', () => {
        // Реальный use case из Yandex Tracker API
        const changelog = {
          id: '1',
          self: 'https://api.tracker.yandex.net/v3/issues/TEST-1/changelog/1',
          issue: { id: '123', key: 'TEST-1', display: 'Test issue' },
          updatedAt: '2024-01-01T00:00:00.000Z',
          updatedBy: { login: 'user', display: 'User Name' },
          type: 'IssueUpdated',
          transport: 'web',
          fields: [
            {
              field: { id: 'status', display: 'Status' },
              from: { key: 'open', display: 'Open' },
              to: { key: 'inProgress', display: 'In Progress' },
            },
          ],
        };

        const result = ResponseFieldFilter.filter(changelog, [
          'updatedAt',
          'type',
          'fields.field.display',
          'fields.from.display',
          'fields.to.display',
        ]);

        expect(result).toEqual({
          updatedAt: '2024-01-01T00:00:00.000Z',
          type: 'IssueUpdated',
          fields: [
            {
              field: { display: 'Status' },
              from: { display: 'Open' },
              to: { display: 'In Progress' },
            },
          ],
        });
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
