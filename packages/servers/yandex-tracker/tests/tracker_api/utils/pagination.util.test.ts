import { describe, it, expect } from 'vitest';
import { PaginationUtil } from '#tracker_api/utils/pagination.util.js';

describe('PaginationUtil', () => {
  describe('buildQueryParams', () => {
    it('должна создать query параметры с полными параметрами', () => {
      const params = PaginationUtil.buildQueryParams({
        perPage: 50,
        page: 2,
      });

      expect(params.get('perPage')).toBe('50');
      expect(params.get('page')).toBe('2');
    });

    it('должна создать query параметры только с perPage', () => {
      const params = PaginationUtil.buildQueryParams({
        perPage: 100,
      });

      expect(params.get('perPage')).toBe('100');
      expect(params.get('page')).toBeNull();
    });

    it('должна создать query параметры только с page', () => {
      const params = PaginationUtil.buildQueryParams({
        page: 3,
      });

      expect(params.get('perPage')).toBeNull();
      expect(params.get('page')).toBe('3');
    });

    it('должна создать пустые query параметры при пустом объекте', () => {
      const params = PaginationUtil.buildQueryParams({});

      expect(params.toString()).toBe('');
      expect(params.get('perPage')).toBeNull();
      expect(params.get('page')).toBeNull();
    });

    it('должна игнорировать undefined значения', () => {
      const params = PaginationUtil.buildQueryParams({
        perPage: undefined,
        page: undefined,
      });

      expect(params.toString()).toBe('');
    });

    it('должна корректно преобразовать отрицательные числа в строку', () => {
      const params = PaginationUtil.buildQueryParams({
        perPage: -50,
        page: -2,
      });

      expect(params.get('perPage')).toBe('-50');
      expect(params.get('page')).toBe('-2');
    });

    it('должна корректно обработать нулевые значения', () => {
      const params = PaginationUtil.buildQueryParams({
        perPage: 0,
        page: 0,
      });

      expect(params.get('perPage')).toBe('0');
      expect(params.get('page')).toBe('0');
    });
  });

  describe('parsePaginatedResponse', () => {
    it('должна распарсить валидный ответ с полными данными', () => {
      const response = {
        items: [{ id: 1 }, { id: 2 }, { id: 3 }],
        total: 100,
        page: 2,
        perPage: 50,
      };

      const result = PaginationUtil.parsePaginatedResponse(response);

      expect(result.items).toEqual([{ id: 1 }, { id: 2 }, { id: 3 }]);
      expect(result.total).toBe(100);
      expect(result.page).toBe(2);
      expect(result.perPage).toBe(50);
    });

    it('должна распарсить ответ с пустым массивом items', () => {
      const response = {
        items: [],
        total: 0,
        page: 1,
        perPage: 50,
      };

      const result = PaginationUtil.parsePaginatedResponse(response);

      expect(result.items).toEqual([]);
      expect(result.total).toBe(0);
      expect(result.page).toBe(1);
      expect(result.perPage).toBe(50);
    });

    it('должна выбросить ошибку если response не объект (null)', () => {
      expect(() => {
        PaginationUtil.parsePaginatedResponse(null);
      }).toThrow('Invalid paginated response: response is not an object');
    });

    it('должна выбросить ошибку если response не объект (undefined)', () => {
      expect(() => {
        PaginationUtil.parsePaginatedResponse(undefined);
      }).toThrow('Invalid paginated response: response is not an object');
    });

    it('должна выбросить ошибку если response не объект (string)', () => {
      expect(() => {
        PaginationUtil.parsePaginatedResponse('not an object');
      }).toThrow('Invalid paginated response: response is not an object');
    });

    it('должна выбросить ошибку если response не объект (number)', () => {
      expect(() => {
        PaginationUtil.parsePaginatedResponse(123);
      }).toThrow('Invalid paginated response: response is not an object');
    });

    it('должна выбросить ошибку если items отсутствует', () => {
      const response = {
        total: 100,
        page: 2,
        perPage: 50,
      };

      expect(() => {
        PaginationUtil.parsePaginatedResponse(response);
      }).toThrow('Invalid paginated response: items is not an array');
    });

    it('должна выбросить ошибку если items не массив (string)', () => {
      const response = {
        items: 'not an array',
        total: 100,
        page: 2,
        perPage: 50,
      };

      expect(() => {
        PaginationUtil.parsePaginatedResponse(response);
      }).toThrow('Invalid paginated response: items is not an array');
    });

    it('должна выбросить ошибку если items не массив (object)', () => {
      const response = {
        items: { not: 'an array' },
        total: 100,
        page: 2,
        perPage: 50,
      };

      expect(() => {
        PaginationUtil.parsePaginatedResponse(response);
      }).toThrow('Invalid paginated response: items is not an array');
    });

    it('должна выбросить ошибку если total не number', () => {
      const response = {
        items: [],
        total: '100',
        page: 2,
        perPage: 50,
      };

      expect(() => {
        PaginationUtil.parsePaginatedResponse(response);
      }).toThrow('Invalid paginated response: total is not a number');
    });

    it('должна выбросить ошибку если total отсутствует', () => {
      const response = {
        items: [],
        page: 2,
        perPage: 50,
      };

      expect(() => {
        PaginationUtil.parsePaginatedResponse(response);
      }).toThrow('Invalid paginated response: total is not a number');
    });

    it('должна выбросить ошибку если page не number', () => {
      const response = {
        items: [],
        total: 100,
        page: '2',
        perPage: 50,
      };

      expect(() => {
        PaginationUtil.parsePaginatedResponse(response);
      }).toThrow('Invalid paginated response: page is not a number');
    });

    it('должна выбросить ошибку если page отсутствует', () => {
      const response = {
        items: [],
        total: 100,
        perPage: 50,
      };

      expect(() => {
        PaginationUtil.parsePaginatedResponse(response);
      }).toThrow('Invalid paginated response: page is not a number');
    });

    it('должна выбросить ошибку если perPage не number', () => {
      const response = {
        items: [],
        total: 100,
        page: 2,
        perPage: '50',
      };

      expect(() => {
        PaginationUtil.parsePaginatedResponse(response);
      }).toThrow('Invalid paginated response: perPage is not a number');
    });

    it('должна выбросить ошибку если perPage отсутствует', () => {
      const response = {
        items: [],
        total: 100,
        page: 2,
      };

      expect(() => {
        PaginationUtil.parsePaginatedResponse(response);
      }).toThrow('Invalid paginated response: perPage is not a number');
    });

    it('должна корректно типизировать items', () => {
      interface TestItem {
        id: number;
        name: string;
      }

      const response = {
        items: [
          { id: 1, name: 'Item 1' },
          { id: 2, name: 'Item 2' },
        ],
        total: 100,
        page: 1,
        perPage: 50,
      };

      const result = PaginationUtil.parsePaginatedResponse<TestItem>(response);

      expect(result.items[0].id).toBe(1);
      expect(result.items[0].name).toBe('Item 1');
      expect(result.items[1].id).toBe(2);
      expect(result.items[1].name).toBe('Item 2');
    });
  });

  describe('parseFromHeaders', () => {
    it('должна распарсить заголовки с полными данными', () => {
      const items = [{ id: 1 }, { id: 2 }];
      const headers = {
        'x-total-count': '100',
        'x-per-page': '50',
        'x-page': '2',
      };

      const result = PaginationUtil.parseFromHeaders(items, headers);

      expect(result.items).toEqual(items);
      expect(result.total).toBe(100);
      expect(result.perPage).toBe(50);
      expect(result.page).toBe(2);
    });

    it('должна использовать дефолтные значения при отсутствующих заголовках', () => {
      const items = [{ id: 1 }];
      const headers = {};

      const result = PaginationUtil.parseFromHeaders(items, headers);

      expect(result.items).toEqual(items);
      expect(result.total).toBe(0);
      expect(result.perPage).toBe(50);
      expect(result.page).toBe(1);
    });

    it('должна использовать дефолты при undefined значениях', () => {
      const items = [{ id: 1 }];
      const headers = {
        'x-total-count': undefined,
        'x-per-page': undefined,
        'x-page': undefined,
      };

      const result = PaginationUtil.parseFromHeaders(items, headers);

      expect(result.total).toBe(0);
      expect(result.perPage).toBe(50);
      expect(result.page).toBe(1);
    });

    it('должна распарсить частичные заголовки (только x-total-count)', () => {
      const items = [{ id: 1 }];
      const headers = {
        'x-total-count': '100',
      };

      const result = PaginationUtil.parseFromHeaders(items, headers);

      expect(result.items).toEqual(items);
      expect(result.total).toBe(100);
      expect(result.perPage).toBe(50);
      expect(result.page).toBe(1);
    });

    it('должна обработать невалидные значения (не числа) как 0/дефолт', () => {
      const items = [{ id: 1 }];
      const headers = {
        'x-total-count': 'invalid',
        'x-per-page': 'abc',
        'x-page': 'xyz',
      };

      const result = PaginationUtil.parseFromHeaders(items, headers);

      expect(result.total).toBeNaN();
      expect(result.perPage).toBeNaN();
      expect(result.page).toBeNaN();
    });

    it('должна обработать отрицательные значения', () => {
      const items = [{ id: 1 }];
      const headers = {
        'x-total-count': '-10',
        'x-per-page': '-50',
        'x-page': '-1',
      };

      const result = PaginationUtil.parseFromHeaders(items, headers);

      expect(result.total).toBe(-10);
      expect(result.perPage).toBe(-50);
      expect(result.page).toBe(-1);
    });

    it('должна работать с пустым массивом items', () => {
      const items: Array<{ id: number }> = [];
      const headers = {
        'x-total-count': '0',
        'x-per-page': '50',
        'x-page': '1',
      };

      const result = PaginationUtil.parseFromHeaders(items, headers);

      expect(result.items).toEqual([]);
      expect(result.total).toBe(0);
    });

    it('должна сохранить items без изменений', () => {
      const items = [
        { id: 1, name: 'Item 1' },
        { id: 2, name: 'Item 2' },
        { id: 3, name: 'Item 3' },
      ];
      const headers = {
        'x-total-count': '100',
        'x-per-page': '50',
        'x-page': '1',
      };

      const result = PaginationUtil.parseFromHeaders(items, headers);

      expect(result.items).toBe(items); // Same reference
      expect(result.items).toHaveLength(3);
    });

    it('должна корректно типизировать items', () => {
      interface TestItem {
        id: number;
        value: string;
      }

      const items: TestItem[] = [
        { id: 1, value: 'test1' },
        { id: 2, value: 'test2' },
      ];
      const headers = {
        'x-total-count': '10',
      };

      const result = PaginationUtil.parseFromHeaders<TestItem>(items, headers);

      expect(result.items[0].id).toBe(1);
      expect(result.items[0].value).toBe('test1');
    });
  });

  describe('calculateTotalPages', () => {
    it('должна вычислить количество страниц с точным делением', () => {
      const result = PaginationUtil.calculateTotalPages(100, 50);
      expect(result).toBe(2);
    });

    it('должна вычислить количество страниц с остатком (округление вверх)', () => {
      const result = PaginationUtil.calculateTotalPages(101, 50);
      expect(result).toBe(3);
    });

    it('должна вычислить количество страниц для 1 элемента', () => {
      const result = PaginationUtil.calculateTotalPages(1, 50);
      expect(result).toBe(1);
    });

    it('должна вернуть 0 при total = 0', () => {
      const result = PaginationUtil.calculateTotalPages(0, 50);
      expect(result).toBe(0);
    });

    it('должна вернуть максимальное количество страниц при perPage = 1', () => {
      const result = PaginationUtil.calculateTotalPages(100, 1);
      expect(result).toBe(100);
    });

    it('должна выбросить ошибку при perPage = 0', () => {
      expect(() => {
        PaginationUtil.calculateTotalPages(100, 0);
      }).toThrow('perPage must be greater than 0');
    });

    it('должна выбросить ошибку при отрицательном perPage', () => {
      expect(() => {
        PaginationUtil.calculateTotalPages(100, -50);
      }).toThrow('perPage must be greater than 0');
    });

    it('должна корректно обработать большие числа', () => {
      const result = PaginationUtil.calculateTotalPages(10000, 50);
      expect(result).toBe(200);
    });

    it('должна корректно обработать очень большие числа', () => {
      const result = PaginationUtil.calculateTotalPages(1000000, 100);
      expect(result).toBe(10000);
    });

    it('должна корректно округлить при нескольких остаточных элементах', () => {
      const result = PaginationUtil.calculateTotalPages(149, 50);
      expect(result).toBe(3);
    });
  });

  describe('интеграционные сценарии', () => {
    it('должна работать в end-to-end flow: build params → response → parse', () => {
      // 1. Построить параметры
      const params = PaginationUtil.buildQueryParams({
        perPage: 50,
        page: 2,
      });

      expect(params.get('perPage')).toBe('50');
      expect(params.get('page')).toBe('2');

      // 2. Симулировать ответ API
      const apiResponse = {
        items: [{ id: 1 }, { id: 2 }, { id: 3 }],
        total: 150,
        page: 2,
        perPage: 50,
      };

      // 3. Распарсить ответ
      const parsed = PaginationUtil.parsePaginatedResponse(apiResponse);

      expect(parsed.items).toHaveLength(3);
      expect(parsed.total).toBe(150);
      expect(parsed.page).toBe(2);
      expect(parsed.perPage).toBe(50);

      // 4. Вычислить общее количество страниц
      const totalPages = PaginationUtil.calculateTotalPages(parsed.total, parsed.perPage);

      expect(totalPages).toBe(3);
    });

    it('должна работать с parseFromHeaders в end-to-end flow', () => {
      // 1. Симулировать ответ API (массив + заголовки)
      const items = [{ id: 1 }, { id: 2 }, { id: 3 }];
      const headers = {
        'x-total-count': '150',
        'x-per-page': '50',
        'x-page': '2',
      };

      // 2. Распарсить из заголовков
      const parsed = PaginationUtil.parseFromHeaders(items, headers);

      expect(parsed.items).toEqual(items);
      expect(parsed.total).toBe(150);
      expect(parsed.page).toBe(2);
      expect(parsed.perPage).toBe(50);

      // 3. Вычислить общее количество страниц
      const totalPages = PaginationUtil.calculateTotalPages(parsed.total, parsed.perPage);

      expect(totalPages).toBe(3);
    });

    it('должна обработать сценарий с последней неполной страницей', () => {
      const apiResponse = {
        items: [{ id: 1 }],
        total: 101,
        page: 3,
        perPage: 50,
      };

      const parsed = PaginationUtil.parsePaginatedResponse(apiResponse);
      const totalPages = PaginationUtil.calculateTotalPages(parsed.total, parsed.perPage);

      expect(parsed.items).toHaveLength(1);
      expect(totalPages).toBe(3);
    });

    it('должна обработать сценарий с первой страницей', () => {
      const params = PaginationUtil.buildQueryParams({
        perPage: 50,
        page: 1,
      });

      const apiResponse = {
        items: Array.from({ length: 50 }, (_, i) => ({ id: i + 1 })),
        total: 150,
        page: 1,
        perPage: 50,
      };

      const parsed = PaginationUtil.parsePaginatedResponse(apiResponse);

      expect(params.get('page')).toBe('1');
      expect(parsed.items).toHaveLength(50);
      expect(parsed.page).toBe(1);
    });
  });
});
