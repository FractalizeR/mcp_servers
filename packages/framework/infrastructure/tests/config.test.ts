/**
 * Unit тесты для модуля конфигурации
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { loadConfig } from '@mcp-framework/infrastructure/config.js';

describe('loadConfig', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Сохраняем оригинальное окружение
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    // Восстанавливаем оригинальное окружение
    process.env = originalEnv;
  });

  it('должен выбросить ошибку если YANDEX_TRACKER_TOKEN не установлен', () => {
    delete process.env['YANDEX_TRACKER_TOKEN'];
    process.env['YANDEX_ORG_ID'] = 'test-org';

    expect(() => loadConfig()).toThrow('YANDEX_TRACKER_TOKEN не установлен');
  });

  it('должен выбросить ошибку если YANDEX_TRACKER_TOKEN пустая строка', () => {
    process.env['YANDEX_TRACKER_TOKEN'] = '   ';
    process.env['YANDEX_ORG_ID'] = 'test-org';

    expect(() => loadConfig()).toThrow('YANDEX_TRACKER_TOKEN не установлен');
  });

  it('должен выбросить ошибку если ни YANDEX_ORG_ID, ни YANDEX_CLOUD_ORG_ID не установлены', () => {
    process.env['YANDEX_TRACKER_TOKEN'] = 'test-token';
    delete process.env['YANDEX_ORG_ID'];
    delete process.env['YANDEX_CLOUD_ORG_ID'];

    expect(() => loadConfig()).toThrow('Необходимо указать ID организации');
  });

  it('должен выбросить ошибку если оба ID (YANDEX_ORG_ID и YANDEX_CLOUD_ORG_ID) установлены', () => {
    process.env['YANDEX_TRACKER_TOKEN'] = 'test-token';
    process.env['YANDEX_ORG_ID'] = 'test-org';
    process.env['YANDEX_CLOUD_ORG_ID'] = 'test-cloud-org';

    expect(() => loadConfig()).toThrow(
      'Нельзя использовать YANDEX_ORG_ID и YANDEX_CLOUD_ORG_ID одновременно'
    );
  });

  it('должен принять YANDEX_ORG_ID (Яндекс 360)', () => {
    process.env['YANDEX_TRACKER_TOKEN'] = 'test-token';
    process.env['YANDEX_ORG_ID'] = 'test-org';
    delete process.env['YANDEX_CLOUD_ORG_ID'];

    const config = loadConfig();

    expect(config.orgId).toBe('test-org');
    expect(config.cloudOrgId).toBeUndefined();
  });

  it('должен принять YANDEX_CLOUD_ORG_ID (Yandex Cloud)', () => {
    process.env['YANDEX_TRACKER_TOKEN'] = 'test-token';
    delete process.env['YANDEX_ORG_ID'];
    process.env['YANDEX_CLOUD_ORG_ID'] = 'bpf3crucp1v2test';

    const config = loadConfig();

    expect(config.orgId).toBeUndefined();
    expect(config.cloudOrgId).toBe('bpf3crucp1v2test');
  });

  it('должен использовать дефолтное значение для apiBase', () => {
    process.env['YANDEX_TRACKER_TOKEN'] = 'test-token';
    process.env['YANDEX_ORG_ID'] = 'test-org';

    const config = loadConfig();

    expect(config.apiBase).toBe('https://api.tracker.yandex.net');
  });

  it('должен использовать пользовательское значение для apiBase', () => {
    process.env['YANDEX_TRACKER_TOKEN'] = 'test-token';
    process.env['YANDEX_ORG_ID'] = 'test-org';
    process.env['YANDEX_TRACKER_API_BASE'] = 'https://custom.api.url';

    const config = loadConfig();

    expect(config.apiBase).toBe('https://custom.api.url');
  });

  it('должен использовать дефолтный logLevel если не указан', () => {
    process.env['YANDEX_TRACKER_TOKEN'] = 'test-token';
    process.env['YANDEX_ORG_ID'] = 'test-org';

    const config = loadConfig();

    expect(config.logLevel).toBe('info');
  });

  it('должен принять валидный logLevel', () => {
    process.env['YANDEX_TRACKER_TOKEN'] = 'test-token';
    process.env['YANDEX_ORG_ID'] = 'test-org';
    process.env['LOG_LEVEL'] = 'debug';

    const config = loadConfig();

    expect(config.logLevel).toBe('debug');
  });

  it('должен использовать дефолтный logLevel для невалидного значения', () => {
    process.env['YANDEX_TRACKER_TOKEN'] = 'test-token';
    process.env['YANDEX_ORG_ID'] = 'test-org';
    process.env['LOG_LEVEL'] = 'invalid';

    const config = loadConfig();

    expect(config.logLevel).toBe('info');
  });

  it('должен использовать дефолтный таймаут 30000ms', () => {
    process.env['YANDEX_TRACKER_TOKEN'] = 'test-token';
    process.env['YANDEX_ORG_ID'] = 'test-org';

    const config = loadConfig();

    expect(config.requestTimeout).toBe(30000);
  });

  it('должен принять валидный таймаут', () => {
    process.env['YANDEX_TRACKER_TOKEN'] = 'test-token';
    process.env['YANDEX_ORG_ID'] = 'test-org';
    process.env['REQUEST_TIMEOUT'] = '60000';

    const config = loadConfig();

    expect(config.requestTimeout).toBe(60000);
  });

  it('должен отвергнуть слишком маленький таймаут', () => {
    process.env['YANDEX_TRACKER_TOKEN'] = 'test-token';
    process.env['YANDEX_ORG_ID'] = 'test-org';
    process.env['REQUEST_TIMEOUT'] = '1000';

    const config = loadConfig();

    expect(config.requestTimeout).toBe(30000); // дефолтное значение
  });

  it('должен отвергнуть слишком большой таймаут', () => {
    process.env['YANDEX_TRACKER_TOKEN'] = 'test-token';
    process.env['YANDEX_ORG_ID'] = 'test-org';
    process.env['REQUEST_TIMEOUT'] = '200000';

    const config = loadConfig();

    expect(config.requestTimeout).toBe(30000); // дефолтное значение
  });

  it('должен обрезать пробелы из токена и orgId', () => {
    process.env['YANDEX_TRACKER_TOKEN'] = '  test-token  ';
    process.env['YANDEX_ORG_ID'] = '  test-org  ';
    delete process.env['YANDEX_CLOUD_ORG_ID'];

    const config = loadConfig();

    expect(config.token).toBe('test-token');
    expect(config.orgId).toBe('test-org');
  });

  it('должен обрезать пробелы из токена и cloudOrgId', () => {
    process.env['YANDEX_TRACKER_TOKEN'] = '  test-token  ';
    delete process.env['YANDEX_ORG_ID'];
    process.env['YANDEX_CLOUD_ORG_ID'] = '  test-cloud-org  ';

    const config = loadConfig();

    expect(config.token).toBe('test-token');
    expect(config.cloudOrgId).toBe('test-cloud-org');
  });

  it('должен использовать дефолтное значение для maxBatchSize (200)', () => {
    process.env['YANDEX_TRACKER_TOKEN'] = 'test-token';
    process.env['YANDEX_ORG_ID'] = 'test-org';

    const config = loadConfig();

    expect(config.maxBatchSize).toBe(200);
  });

  it('должен принять валидное значение для maxBatchSize', () => {
    process.env['YANDEX_TRACKER_TOKEN'] = 'test-token';
    process.env['YANDEX_ORG_ID'] = 'test-org';
    process.env['MAX_BATCH_SIZE'] = '500';

    const config = loadConfig();

    expect(config.maxBatchSize).toBe(500);
  });

  it('должен отвергнуть слишком маленькое значение maxBatchSize', () => {
    process.env['YANDEX_TRACKER_TOKEN'] = 'test-token';
    process.env['YANDEX_ORG_ID'] = 'test-org';
    process.env['MAX_BATCH_SIZE'] = '0';

    const config = loadConfig();

    expect(config.maxBatchSize).toBe(200); // дефолтное значение
  });

  it('должен отвергнуть слишком большое значение maxBatchSize', () => {
    process.env['YANDEX_TRACKER_TOKEN'] = 'test-token';
    process.env['YANDEX_ORG_ID'] = 'test-org';
    process.env['MAX_BATCH_SIZE'] = '1500';

    const config = loadConfig();

    expect(config.maxBatchSize).toBe(200); // дефолтное значение
  });

  it('должен использовать дефолтное значение для maxConcurrentRequests (5)', () => {
    process.env['YANDEX_TRACKER_TOKEN'] = 'test-token';
    process.env['YANDEX_ORG_ID'] = 'test-org';

    const config = loadConfig();

    expect(config.maxConcurrentRequests).toBe(5);
  });

  it('должен принять валидное значение для maxConcurrentRequests', () => {
    process.env['YANDEX_TRACKER_TOKEN'] = 'test-token';
    process.env['YANDEX_ORG_ID'] = 'test-org';
    process.env['MAX_CONCURRENT_REQUESTS'] = '10';

    const config = loadConfig();

    expect(config.maxConcurrentRequests).toBe(10);
  });

  it('должен отвергнуть слишком маленькое значение maxConcurrentRequests', () => {
    process.env['YANDEX_TRACKER_TOKEN'] = 'test-token';
    process.env['YANDEX_ORG_ID'] = 'test-org';
    process.env['MAX_CONCURRENT_REQUESTS'] = '0';

    const config = loadConfig();

    expect(config.maxConcurrentRequests).toBe(5); // дефолтное значение
  });

  it('должен отвергнуть слишком большое значение maxConcurrentRequests', () => {
    process.env['YANDEX_TRACKER_TOKEN'] = 'test-token';
    process.env['YANDEX_ORG_ID'] = 'test-org';
    process.env['MAX_CONCURRENT_REQUESTS'] = '25';

    const config = loadConfig();

    expect(config.maxConcurrentRequests).toBe(5); // дефолтное значение
  });

  describe('ENABLED_TOOL_CATEGORIES фильтрация', () => {
    beforeEach(() => {
      process.env['YANDEX_TRACKER_TOKEN'] = 'test-token';
      process.env['YANDEX_ORG_ID'] = 'test-org';
    });

    it('должен вернуть undefined если ENABLED_TOOL_CATEGORIES не установлена', () => {
      delete process.env['ENABLED_TOOL_CATEGORIES'];

      const config = loadConfig();

      expect(config.enabledToolCategories).toBeUndefined();
    });

    it('должен распарсить пустую строку как includeAll=true', () => {
      process.env['ENABLED_TOOL_CATEGORIES'] = '';

      const config = loadConfig();

      expect(config.enabledToolCategories).toBeDefined();
      expect(config.enabledToolCategories?.includeAll).toBe(true);
      expect(config.enabledToolCategories?.categories.size).toBe(0);
      expect(config.enabledToolCategories?.categoriesWithSubcategories.size).toBe(0);
    });

    it('должен распарсить категории без подкатегорий', () => {
      process.env['ENABLED_TOOL_CATEGORIES'] = 'issues,comments,queues';

      const config = loadConfig();

      expect(config.enabledToolCategories).toBeDefined();
      expect(config.enabledToolCategories?.includeAll).toBe(false);
      expect(config.enabledToolCategories?.categories).toEqual(
        new Set(['issues', 'comments', 'queues'])
      );
      expect(config.enabledToolCategories?.categoriesWithSubcategories.size).toBe(0);
    });

    it('должен распарсить категории с подкатегориями', () => {
      process.env['ENABLED_TOOL_CATEGORIES'] = 'issues:read,comments:write,queues:read';

      const config = loadConfig();

      expect(config.enabledToolCategories).toBeDefined();
      expect(config.enabledToolCategories?.includeAll).toBe(false);
      expect(config.enabledToolCategories?.categories.size).toBe(0);
      expect(config.enabledToolCategories?.categoriesWithSubcategories.size).toBe(3);
      expect(config.enabledToolCategories?.categoriesWithSubcategories.get('issues')).toEqual(
        new Set(['read'])
      );
      expect(config.enabledToolCategories?.categoriesWithSubcategories.get('comments')).toEqual(
        new Set(['write'])
      );
      expect(config.enabledToolCategories?.categoriesWithSubcategories.get('queues')).toEqual(
        new Set(['read'])
      );
    });

    it('должен распарсить смешанный формат (категории + подкатегории)', () => {
      process.env['ENABLED_TOOL_CATEGORIES'] = 'issues,comments:write,queues:read';

      const config = loadConfig();

      expect(config.enabledToolCategories).toBeDefined();
      expect(config.enabledToolCategories?.includeAll).toBe(false);
      expect(config.enabledToolCategories?.categories).toEqual(new Set(['issues']));
      expect(config.enabledToolCategories?.categoriesWithSubcategories.size).toBe(2);
      expect(config.enabledToolCategories?.categoriesWithSubcategories.get('comments')).toEqual(
        new Set(['write'])
      );
    });

    it('должен поддерживать несколько подкатегорий для одной категории', () => {
      process.env['ENABLED_TOOL_CATEGORIES'] = 'issues:read,issues:write,issues:workflow';

      const config = loadConfig();

      expect(config.enabledToolCategories).toBeDefined();
      expect(config.enabledToolCategories?.categoriesWithSubcategories.get('issues')).toEqual(
        new Set(['read', 'write', 'workflow'])
      );
    });

    it('должен игнорировать пробелы вокруг значений', () => {
      process.env['ENABLED_TOOL_CATEGORIES'] = '  issues  ,  comments : write  ,  queues  ';

      const config = loadConfig();

      expect(config.enabledToolCategories).toBeDefined();
      expect(config.enabledToolCategories?.categories).toEqual(new Set(['issues', 'queues']));
      expect(config.enabledToolCategories?.categoriesWithSubcategories.get('comments')).toEqual(
        new Set(['write'])
      );
    });

    it('должен игнорировать пустые элементы', () => {
      process.env['ENABLED_TOOL_CATEGORIES'] = 'issues,,,comments';

      const config = loadConfig();

      expect(config.enabledToolCategories).toBeDefined();
      expect(config.enabledToolCategories?.categories).toEqual(new Set(['issues', 'comments']));
    });

    it('должен gracefully обработать невалидный формат (слишком много двоеточий)', () => {
      process.env['ENABLED_TOOL_CATEGORIES'] = 'issues::read,comments';

      const config = loadConfig();

      expect(config.enabledToolCategories).toBeDefined();
      // issues::read пропускается, остаётся только comments
      expect(config.enabledToolCategories?.categories).toEqual(new Set(['comments']));
    });

    it('должен gracefully обработать пустые сегменты в формате category:subcategory', () => {
      process.env['ENABLED_TOOL_CATEGORIES'] = 'issues:,comments,:write,queues';

      const config = loadConfig();

      expect(config.enabledToolCategories).toBeDefined();
      // issues: и :write пропускаются, остаются comments и queues
      expect(config.enabledToolCategories?.categories).toEqual(new Set(['comments', 'queues']));
      expect(config.enabledToolCategories?.categoriesWithSubcategories.size).toBe(0);
    });

    it('должен вернуть includeAll=true если все элементы невалидные', () => {
      process.env['ENABLED_TOOL_CATEGORIES'] = ':::,,,   ';

      const config = loadConfig();

      expect(config.enabledToolCategories).toBeDefined();
      expect(config.enabledToolCategories?.includeAll).toBe(true);
    });

    it('должен обрабатывать категории case-insensitive', () => {
      process.env['ENABLED_TOOL_CATEGORIES'] = 'ISSUES,Comments:WRITE,Queues:Read';

      const config = loadConfig();

      expect(config.enabledToolCategories).toBeDefined();
      // Все категории должны быть в lowercase
      expect(config.enabledToolCategories?.categories).toEqual(new Set(['issues']));
      expect(config.enabledToolCategories?.categoriesWithSubcategories.get('comments')).toEqual(
        new Set(['write'])
      );
      expect(config.enabledToolCategories?.categoriesWithSubcategories.get('queues')).toEqual(
        new Set(['read'])
      );
    });
  });
});
