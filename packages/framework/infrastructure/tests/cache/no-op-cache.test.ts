/**
 * Тесты для NoOpCache
 */

import { describe, it, expect } from 'vitest';
import { NoOpCache } from '@mcp-framework/infrastructure/cache/no-op-cache.js';

describe('NoOpCache', () => {
  let cache: NoOpCache;

  beforeEach(() => {
    cache = new NoOpCache();
  });

  describe('get', () => {
    it('должен всегда возвращать undefined', () => {
      const result = cache.get('any-key');

      expect(result).toBeUndefined();
    });

    it('должен возвращать undefined для любого типа', () => {
      const stringResult = cache.get<string>('key1');
      const numberResult = cache.get<number>('key2');
      const objectResult = cache.get<{ foo: string }>('key3');

      expect(stringResult).toBeUndefined();
      expect(numberResult).toBeUndefined();
      expect(objectResult).toBeUndefined();
    });

    it('должен возвращать undefined даже после set', () => {
      cache.set('key', 'value');
      const result = cache.get('key');

      expect(result).toBeUndefined();
    });
  });

  describe('set', () => {
    it('не должен бросать ошибку при установке значения', () => {
      expect(() => {
        cache.set('key', 'value');
      }).not.toThrow();
    });

    it('не должен бросать ошибку при установке с TTL', () => {
      expect(() => {
        cache.set('key', 'value', 5000);
      }).not.toThrow();
    });

    it('не должен сохранять значение', () => {
      cache.set('key', 'value');

      const result = cache.get('key');
      expect(result).toBeUndefined();
    });

    it('должен работать с любыми типами данных', () => {
      expect(() => {
        cache.set('string', 'value');
        cache.set('number', 123);
        cache.set('object', { foo: 'bar' });
        cache.set('array', [1, 2, 3]);
        cache.set('null', null);
      }).not.toThrow();
    });
  });

  describe('delete', () => {
    it('не должен бросать ошибку при удалении', () => {
      expect(() => {
        cache.delete('any-key');
      }).not.toThrow();
    });

    it('не должен бросать ошибку при удалении несуществующего ключа', () => {
      expect(() => {
        cache.delete('non-existent-key');
      }).not.toThrow();
    });
  });

  describe('clear', () => {
    it('не должен бросать ошибку при очистке', () => {
      expect(() => {
        cache.clear();
      }).not.toThrow();
    });

    it('не должен влиять на работу после очистки', () => {
      cache.set('key', 'value');
      cache.clear();

      const result = cache.get('key');
      expect(result).toBeUndefined();
    });
  });

  describe('prune', () => {
    it('не должен бросать ошибку при очистке устаревших записей', () => {
      expect(() => {
        cache.prune();
      }).not.toThrow();
    });
  });

  describe('Null Object Pattern', () => {
    it('должен предоставлять безопасный API без проверок на null', () => {
      // Проверяем, что можно вызывать все методы без проверок
      cache.set('key', 'value');
      const value = cache.get('key');
      cache.delete('key');
      cache.clear();
      cache.prune();

      expect(value).toBeUndefined();
    });

    it('должен быть взаимозаменяем с реальной реализацией CacheManager', () => {
      // NoOpCache реализует интерфейс CacheManager
      // Проверяем, что все методы присутствуют
      expect(cache.get).toBeDefined();
      expect(cache.set).toBeDefined();
      expect(cache.delete).toBeDefined();
      expect(cache.clear).toBeDefined();
      expect(cache.prune).toBeDefined();
    });
  });
});
