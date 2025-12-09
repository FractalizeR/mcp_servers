/**
 * Тесты для NoOpCache
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { NoOpCache } from '@fractalizer/mcp-infrastructure/cache/no-op-cache.js';

describe('NoOpCache', () => {
  let cache: NoOpCache;

  beforeEach(() => {
    cache = new NoOpCache();
  });

  describe('get', () => {
    it('должен всегда возвращать null', async () => {
      const result = await cache.get('any-key');

      expect(result).toBeNull();
    });

    it('должен возвращать null для любого типа', async () => {
      const stringResult = await cache.get<string>('key1');
      const numberResult = await cache.get<number>('key2');
      const objectResult = await cache.get<{ foo: string }>('key3');

      expect(stringResult).toBeNull();
      expect(numberResult).toBeNull();
      expect(objectResult).toBeNull();
    });

    it('должен возвращать null даже после set', async () => {
      await cache.set('key', 'value');
      const result = await cache.get('key');

      expect(result).toBeNull();
    });
  });

  describe('set', () => {
    it('не должен бросать ошибку при установке значения', async () => {
      await expect(cache.set('key', 'value')).resolves.toBeUndefined();
    });

    it('не должен бросать ошибку при установке с TTL', async () => {
      await expect(cache.set('key', 'value', 5000)).resolves.toBeUndefined();
    });

    it('не должен сохранять значение', async () => {
      await cache.set('key', 'value');

      const result = await cache.get('key');
      expect(result).toBeNull();
    });

    it('должен работать с любыми типами данных', async () => {
      await expect(async () => {
        await cache.set('string', 'value');
        await cache.set('number', 123);
        await cache.set('object', { foo: 'bar' });
        await cache.set('array', [1, 2, 3]);
        await cache.set('null', null);
      }).not.toThrow();
    });
  });

  describe('delete', () => {
    it('не должен бросать ошибку при удалении', async () => {
      await expect(cache.delete('any-key')).resolves.toBeUndefined();
    });

    it('не должен бросать ошибку при удалении несуществующего ключа', async () => {
      await expect(cache.delete('non-existent-key')).resolves.toBeUndefined();
    });
  });

  describe('clear', () => {
    it('не должен бросать ошибку при очистке', async () => {
      await expect(cache.clear()).resolves.toBeUndefined();
    });

    it('не должен влиять на работу после очистки', async () => {
      await cache.set('key', 'value');
      await cache.clear();

      const result = await cache.get('key');
      expect(result).toBeNull();
    });
  });

  describe('prune', () => {
    it('не должен бросать ошибку при очистке устаревших записей', async () => {
      await expect(cache.prune()).resolves.toBeUndefined();
    });
  });

  describe('Null Object Pattern', () => {
    it('должен предоставлять безопасный API без проверок на null', async () => {
      // Проверяем, что можно вызывать все методы без проверок
      await cache.set('key', 'value');
      const value = await cache.get('key');
      await cache.delete('key');
      await cache.clear();
      await cache.prune();

      expect(value).toBeNull();
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
