/**
 * Тесты `deserializeTickTickConfig` — десериализация из config.json.
 *
 * В отличие от Yandex Tracker/Wiki, миграция orgType отсутствует (OAuth-модель
 * не использует orgType). Тесты фокусируются на валидации типов полей и
 * устойчивости к ручным правкам config.json.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { deserializeTickTickConfig } from '#cli/deserialize-config.js';

describe('deserializeTickTickConfig', () => {
  // Заглушаем console.warn — deserialize пишет предупреждения о неизвестных
  // значениях logLevel (N12), мы их валидируем явно, а в stderr теста они не нужны.
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  describe('пустой/неполный input', () => {
    it('пустой объект {} → пустой результат (нет миграции)', () => {
      const result = deserializeTickTickConfig({});

      expect(result.clientId).toBeUndefined();
      expect(result.redirectUri).toBeUndefined();
      expect(result.logLevel).toBeUndefined();
      // clientSecret в принципе не возвращается deserializer'ом
      expect(result).not.toHaveProperty('clientSecret');
    });
  });

  describe('clientId валидация', () => {
    it('строковый clientId сохраняется', () => {
      const result = deserializeTickTickConfig({ clientId: 'abc' });

      expect(result.clientId).toBe('abc');
    });

    it('clientId не строка (число) → опускается', () => {
      const result = deserializeTickTickConfig({ clientId: 42 });

      expect(result.clientId).toBeUndefined();
    });

    it('clientId не строка (boolean) → опускается', () => {
      const result = deserializeTickTickConfig({ clientId: true });

      expect(result.clientId).toBeUndefined();
    });

    it('clientId не строка (null) → опускается', () => {
      const result = deserializeTickTickConfig({ clientId: null });

      expect(result.clientId).toBeUndefined();
    });
  });

  describe('redirectUri валидация', () => {
    it('строковый redirectUri сохраняется', () => {
      const result = deserializeTickTickConfig({ redirectUri: 'http://localhost/cb' });

      expect(result.redirectUri).toBe('http://localhost/cb');
    });

    it('redirectUri не строка → опускается', () => {
      const result = deserializeTickTickConfig({ redirectUri: 123 });

      expect(result.redirectUri).toBeUndefined();
    });
  });

  describe('logLevel валидация', () => {
    it.each(['debug', 'info', 'warn', 'error'] as const)("logLevel='%s' сохраняется", (level) => {
      const result = deserializeTickTickConfig({ logLevel: level });

      expect(result.logLevel).toBe(level);
    });

    it("неизвестный logLevel='verbose' → опускается", () => {
      const result = deserializeTickTickConfig({ logLevel: 'verbose' });

      expect(result.logLevel).toBeUndefined();
    });

    it("неизвестный logLevel='verbose' → console.warn (N12)", () => {
      deserializeTickTickConfig({ logLevel: 'verbose' });

      expect(warnSpy).toHaveBeenCalledTimes(1);
      const message = String(warnSpy.mock.calls[0]?.[0] ?? '');
      expect(message).toContain('logLevel');
      expect(message).toContain('verbose');
    });

    it('logLevel не строка → опускается', () => {
      const result = deserializeTickTickConfig({ logLevel: 1 });

      expect(result.logLevel).toBeUndefined();
    });
  });

  describe('игнорирование лишних полей', () => {
    it('clientSecret в input игнорируется (никогда не возвращается)', () => {
      const result = deserializeTickTickConfig({
        clientId: 'a',
        clientSecret: 'SHOULD_NOT_BE_RETURNED',
      });

      expect(result).not.toHaveProperty('clientSecret');
      expect(result.clientId).toBe('a');
    });

    it('orgType в input игнорируется (модель OAuth, не Yandex)', () => {
      const result = deserializeTickTickConfig({
        clientId: 'a',
        orgType: 'yandex360',
      });

      // Только то, что в TickTickMCPConfig.
      expect(result.clientId).toBe('a');
      expect(result).not.toHaveProperty('orgType');
    });
  });

  describe('все валидные поля', () => {
    it('возвращает все поля корректно', () => {
      const result = deserializeTickTickConfig({
        clientId: 'cid',
        redirectUri: 'http://localhost/cb',
        logLevel: 'warn',
      });

      expect(result).toEqual({
        clientId: 'cid',
        redirectUri: 'http://localhost/cb',
        logLevel: 'warn',
      });
    });
  });
});
