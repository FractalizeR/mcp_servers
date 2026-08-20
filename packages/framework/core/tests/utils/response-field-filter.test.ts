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

      // Проекция внутри assignee ничего не извлекла (nonExistent не существует) —
      // ключ assignee не создаётся вовсе, а не превращается в пустой объект-мусор.
      expect(result).toEqual({});
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

      it('должен опускать ключ-обёртку массива целиком, если путь не извлёк ничего ни у одного элемента', () => {
        const data = {
          fields: [{ field: { id: 'status' } }],
        };

        const result = ResponseFieldFilter.filter(data, ['fields.nonexistent']);

        // Находка 4 внешнего ревью: путь, ничего не извлёкший ни у одного элемента
        // массива, не оставляет пустышку "fields: []" — ключ-обёртка не создаётся вовсе.
        // (Раньше, до находки 2/4, тот же эффект достигался ДРУГИМ способом — удалением
        // всех элементов массива внутри compact(), что попутно молча меняло длину массива
        // и в смешанных случаях, где часть элементов совпадала. Теперь длина массива
        // сохраняется всегда — см. следующий тест — а пустышка убирается только когда
        // из массива в принципе нечего вернуть.)
        expect(result).toEqual({});
      });

      it('элемент массива без запрошенного вложенного поля заменяется на {}, а не выбрасывается (regression, находка 2)', () => {
        // Реальный сценарий из бага: у части элементов changelog.fields нет display в "to"
        // (например sla, boards), у части — есть.
        //
        // Находка 2 внешнего ревью (MAJOR, проверено исполнением ревьюером): раньше
        // элемент, для которого проекция ничего не извлекла, ВЫБРАСЫВАЛСЯ из массива —
        // array.length менялся молча относительно исходных данных (3 элемента источника →
        // 1 элемент результата), и агент, считающий количество по длине массива, получал
        // неверное число. Теперь элемент заменяется на "{}" (честно: "у элемента нет
        // запрошенных полей"), позиционное соответствие и длина сохраняются.
        const data = {
          fields: [
            { field: { id: 'status' }, to: { key: 'closed', display: 'Closed' } },
            { field: { id: 'sla' }, to: { value: 42 } }, // нет display
            { field: { id: 'boards' }, to: { ids: [1, 2] } }, // нет display
          ],
        };

        const result = ResponseFieldFilter.filter(data, ['fields.to.display']);

        expect(result.fields).toHaveLength(3);
        expect(result).toEqual({
          fields: [{ to: { display: 'Closed' } }, {}, {}],
        });
      });

      it('должен сохранять {} как результат запроса заведомо несуществующего поля на корневом уровне (контракт)', () => {
        // Это НЕ мусор от неудачной вложенной проекции внутри массива, а законный ответ
        // фильтрации верхнего уровня: filterObject всегда возвращает объект.
        const data = { key: 'QUEUE-1', summary: 'Test' };

        const result = ResponseFieldFilter.filter(data, ['nosuchfield']);

        expect(result).toEqual({});
      });

      it('должен сохранять пустое значение, реально пришедшее из API (null/{}/[])', () => {
        const data = {
          key: 'QUEUE-1',
          assignee: null,
          meta: {},
          tags: [] as string[],
        };

        const result = ResponseFieldFilter.filter(data, ['key', 'assignee', 'meta', 'tags']);

        expect(result).toEqual({
          key: 'QUEUE-1',
          assignee: null,
          meta: {},
          tags: [],
        });
      });

      it('должен сохранять поэлементное соответствие при мерже нескольких проекций одного массива, когда часть элементов не имеет ни одного из полей (mergeArrayResults)', () => {
        const data = {
          fields: [
            {
              field: { id: 'status', display: 'Status' },
              to: { key: 'closed', display: 'Closed' },
            },
            { field: { id: 'sla' }, to: { value: 42 } }, // ни field.display, ни to.display
            { field: { id: 'priority', display: 'Priority' }, to: { key: 'high' } }, // есть field.display, нет to.display
          ],
        };

        const result = ResponseFieldFilter.filter(data, [
          'fields.field.display',
          'fields.to.display',
        ]);

        // Находка 2: элемент с id 'sla' раньше выпадал целиком (ни одна из двух проекций
        // ничего не извлекла); теперь остаётся на своей позиции как {}, длина сохраняется.
        expect(result.fields).toHaveLength(3);
        expect(result).toEqual({
          fields: [
            { field: { display: 'Status' }, to: { display: 'Closed' } },
            {},
            { field: { display: 'Priority' } },
          ],
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

    // Регрессия находки 2 внешнего ревью (BLOCKER/MAJOR): `compact()` пересобирал
    // КАЖДЫЙ объект по Object.keys(), включая Date/Map/Set — у них нет собственных
    // enumerable-ключей, поэтому они превращались в "{}", теряя значение целиком.
    // Раньше значения копировались по ссылке и Date корректно сериализовался в ISO.
    describe('находка 2: значения без собственных enumerable-ключей (Date/Map/Set) не теряются', () => {
      it('Date сохраняется как Date-инстанс (сериализуется в ISO при JSON.stringify)', () => {
        const date = new Date('2020-01-01T00:00:00.000Z');
        const result = ResponseFieldFilter.filter({ d: date, n: 1 }, ['d', 'n']);

        expect(result.d).toBeInstanceOf(Date);
        expect((result.d as Date).toISOString()).toBe('2020-01-01T00:00:00.000Z');
        expect(result.n).toBe(1);
        // Доказательство "как раньше" — JSON.stringify выдаёт ISO-строку, а не "{}"
        expect(JSON.parse(JSON.stringify(result))).toEqual({
          d: '2020-01-01T00:00:00.000Z',
          n: 1,
        });
      });

      it('Map сохраняется как Map-инстанс, а не превращается в plain object "{}"', () => {
        const map = new Map([['a', 1]]);
        const result = ResponseFieldFilter.filter({ m: map }, ['m']);

        expect(result.m).toBeInstanceOf(Map);
        expect(result.m).toBe(map);
      });

      it('Set сохраняется как Set-инстанс, а не превращается в plain object "{}"', () => {
        const set = new Set([1, 2, 3]);
        const result = ResponseFieldFilter.filter({ s: set }, ['s']);

        expect(result.s).toBeInstanceOf(Set);
        expect(result.s).toBe(set);
      });
    });

    // Регрессия находки 2 внешнего ревью: элемент массива, у которого проекция не
    // извлекла ни одного из запрошенных полей, раньше ВЫБРАСЫВАЛСЯ из результата —
    // длина массива менялась молча относительно исходных данных. Теперь такой
    // элемент заменяется на "{}" (честно: "у элемента нет запрошенных полей"),
    // а длина и позиционное соответствие сохраняются.
    describe('находка 2: проекция не усекает длину массива', () => {
      it('элемент без совпавшего поля заменяется на {}, а не выбрасывается', () => {
        const result = ResponseFieldFilter.filter({ c: [{ a: 1 }, { b: 8 }] }, ['c.a']);

        expect(result.c).toHaveLength(2);
        expect(result.c).toEqual([{ a: 1 }, {}]);
      });
    });

    // Регрессия находки 4 внешнего ревью (MINOR): ветка массива в extractField
    // возвращала true безусловно, поэтому путь, не извлёкший НИ ОДНОГО поля ни у
    // одного элемента массива, всё равно оставлял в результате пустышку "поле: []".
    // Не конфликтует с находкой 2: пустышка убирается только когда ключ-обёртка
    // массива целиком ничего не извлёк, а не когда отдельные элементы разнородны.
    describe('находка 4: путь, ничего не извлёкший ни у одного элемента, не оставляет пустышку', () => {
      it('несуществующее вложенное поле во всех элементах массива — ключ массива отсутствует', () => {
        const result = ResponseFieldFilter.filter({ items: [{ tags: [{ y: 1 }] }] }, [
          'items.tags.x',
        ]);

        expect(result).toEqual({});
      });

      it('легитимно пустой вложенный массив — ключ сохраняется как []', () => {
        const result = ResponseFieldFilter.filter({ items: [{ tags: [] }] }, ['items.tags.x']);

        expect(result).toEqual({ items: [{ tags: [] }] });
      });

      it('смешанный случай: часть элементов даёт данные — пустышка для остальных не появляется на уровне массива-обёртки', () => {
        const result = ResponseFieldFilter.filter({ items: [{ a: 1 }, { b: 2 }] }, ['items.a']);

        expect(result).toEqual({ items: [{ a: 1 }, {}] });
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

  /**
   * DoD 1.1 п.3 плана plan_tool_contract_unification: таблица случаев
   * детектора незаполненных полей (README §4 — тот же boolean extractField
   * уже возвращал, здесь проверяется, что filterWithReport() поднимает его
   * наверх без второй реализации).
   */
  describe('filterWithReport (детектор незаполненных полей)', () => {
    it('заполнено везде — fieldsWithoutValue пуст (одиночный объект)', () => {
      const data = { key: 'QUEUE-1', summary: 'Test', assignee: { login: 'user' } };

      const { result, fieldsWithoutValue } = ResponseFieldFilter.filterWithReport(data, [
        'key',
        'summary',
        'assignee.login',
      ]);

      expect(result).toEqual({ key: 'QUEUE-1', summary: 'Test', assignee: { login: 'user' } });
      expect(fieldsWithoutValue).toEqual([]);
    });

    it('пусто везде — путь отсутствует у единственного элемента', () => {
      const data = { key: 'QUEUE-1' };

      const { fieldsWithoutValue } = ResponseFieldFilter.filterWithReport(data, [
        'key',
        'assignee.login',
      ]);

      expect(fieldsWithoutValue).toEqual(['assignee.login']);
    });

    it('пусто частично (массив элементов) — предупреждения НЕТ, если хотя бы один элемент дал значение', () => {
      const data = [
        { key: 'QUEUE-1', assignee: { login: 'user' } },
        { key: 'QUEUE-2' }, // assignee.login у этого элемента отсутствует
      ];

      const { fieldsWithoutValue } = ResponseFieldFilter.filterWithReport(data, [
        'key',
        'assignee.login',
      ]);

      // Частичная пустота — не повод предупреждать (шум важнее сигнала).
      expect(fieldsWithoutValue).toEqual([]);
    });

    it('пусто у ВСЕХ элементов массива — путь помечается как без значения', () => {
      const data = [{ key: 'QUEUE-1' }, { key: 'QUEUE-2' }];

      const { fieldsWithoutValue } = ResponseFieldFilter.filterWithReport(data, [
        'key',
        'assignee.login',
      ]);

      expect(fieldsWithoutValue).toEqual(['assignee.login']);
    });

    it('вложенный путь — null/{}/[] считаются извлечёнными, а не "без значения"', () => {
      const data = { key: 'QUEUE-1', assignee: null, tags: [], meta: {} };

      const { result, fieldsWithoutValue } = ResponseFieldFilter.filterWithReport(data, [
        'key',
        'assignee',
        'tags',
        'meta',
      ]);

      expect(result).toEqual({ key: 'QUEUE-1', assignee: null, tags: [], meta: {} });
      expect(fieldsWithoutValue).toEqual([]);
    });

    it('пустая коллекция (0 элементов) — предупреждений нет: сказать нечего', () => {
      const data: Array<{ key: string }> = [];

      const { result, fieldsWithoutValue } = ResponseFieldFilter.filterWithReport(data, [
        'key',
        'assignee.login',
      ]);

      expect(result).toEqual([]);
      expect(fieldsWithoutValue).toEqual([]);
    });

    it('режим links (find_issues) — тела заменены на resource_link заглушки: детектор БЕЗ явного выключения даст предупреждение на весь fields, поэтому вызывающий инструмент обязан не звать его в этом режиме', () => {
      // Элементы этой формы — то, что реально видит filterWithReport, если
      // ошибочно вызвать его в режиме links (заглушки вместо тел сущностей).
      const resourceLinkStubs = [{ uri: 'issue://QUEUE-1' }, { uri: 'issue://QUEUE-2' }];

      const { fieldsWithoutValue } = ResponseFieldFilter.filterWithReport(resourceLinkStubs, [
        'key',
        'summary',
      ]);

      // Полностью корректный вызов дал бы предупреждение на весь список —
      // ровно граничный случай 1.1, из-за которого детектор обязан быть
      // выключен в режиме links на стороне инструмента (не здесь).
      expect(fieldsWithoutValue).toEqual(['key', 'summary']);
    });

    it('filter() и filterWithReport() дают идентичный result — единственная реализация фильтрации', () => {
      const data = { key: 'QUEUE-1', summary: 'Test' };

      const viaFilter = ResponseFieldFilter.filter(data, ['key', 'summary', 'missing']);
      const viaReport = ResponseFieldFilter.filterWithReport(data, ['key', 'summary', 'missing']);

      expect(viaFilter).toEqual(viaReport.result);
    });
  });

  describe('toWarnings (сведение хелпера предупреждений, пакет 2.8)', () => {
    it('пустой список путей даёт пустой массив предупреждений', () => {
      expect(ResponseFieldFilter.toWarnings([])).toEqual([]);
    });

    it('непустой список путей даёт ровно одно агрегированное предупреждение', () => {
      const warnings = ResponseFieldFilter.toWarnings(['assignee.login', 'summary']);

      expect(warnings).toHaveLength(1);
      expect(warnings[0]).toMatchObject({
        code: 'FIELDS_WITHOUT_VALUE',
        details: { fields: ['assignee.login', 'summary'] },
      });
    });
  });
});
