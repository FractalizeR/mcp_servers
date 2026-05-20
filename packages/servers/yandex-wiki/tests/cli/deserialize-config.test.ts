/**
 * Тесты `deserializeYwConfig` — десериализация из config.json с миграцией
 * старого формата (без orgType) в текущий.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { deserializeYwConfig } from '#cli/deserialize-config.js';

describe('deserializeYwConfig', () => {
  // Заглушаем console.warn — deserialize пишет предупреждения о неизвестных
  // значениях (N12), мы их валидируем явно, а в stderr теста они не нужны.
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  describe('миграция: отсутствие orgType', () => {
    it("старый config без orgType → orgType: 'yandex360'", () => {
      const result = deserializeYwConfig({ orgId: 'org-legacy' });

      expect(result.orgType).toBe('yandex360');
      expect(result.orgId).toBe('org-legacy');
    });

    it("пустой объект {} → только orgType: 'yandex360' (миграция)", () => {
      const result = deserializeYwConfig({});

      expect(result.orgType).toBe('yandex360');
      expect(result.orgId).toBeUndefined();
      expect(result.requestTimeout).toBeUndefined();
      expect(result.logLevel).toBeUndefined();
    });
  });

  describe('валидация orgType', () => {
    it("orgType: 'yandex360' сохраняется", () => {
      const result = deserializeYwConfig({ orgType: 'yandex360', orgId: 'o' });

      expect(result.orgType).toBe('yandex360');
    });

    it("orgType: 'cloud' сохраняется", () => {
      const result = deserializeYwConfig({ orgType: 'cloud', orgId: 'o' });

      expect(result.orgType).toBe('cloud');
    });

    it("orgType: 'invalid' опускается", () => {
      const result = deserializeYwConfig({ orgType: 'invalid', orgId: 'o' });

      expect(result.orgType).toBeUndefined();
    });

    it("orgType: 'invalid' → console.warn о неизвестном значении (N12)", () => {
      deserializeYwConfig({ orgType: 'invalid', orgId: 'o' });

      expect(warnSpy).toHaveBeenCalledTimes(1);
      const message = String(warnSpy.mock.calls[0]?.[0] ?? '');
      expect(message).toContain('orgType="invalid"');
      expect(message).toContain('yandex360');
      expect(message).toContain('cloud');
    });

    it('orgType: 123 (не строка) опускается (нет миграции по умолчанию)', () => {
      const result = deserializeYwConfig({ orgType: 123 });

      expect(result.orgType).toBeUndefined();
    });
  });

  describe('orgId, requestTimeout', () => {
    it('строковый orgId сохраняется', () => {
      const result = deserializeYwConfig({ orgType: 'yandex360', orgId: 'org-1' });

      expect(result.orgId).toBe('org-1');
    });

    it('orgId не строка → опускается', () => {
      const result = deserializeYwConfig({ orgType: 'yandex360', orgId: 42 });

      expect(result.orgId).toBeUndefined();
    });

    it('числовой requestTimeout сохраняется', () => {
      const result = deserializeYwConfig({ orgType: 'yandex360', requestTimeout: 7000 });

      expect(result.requestTimeout).toBe(7000);
    });

    it('requestTimeout строкой → опускается', () => {
      const result = deserializeYwConfig({ orgType: 'yandex360', requestTimeout: '7000' });

      expect(result.requestTimeout).toBeUndefined();
    });
  });

  describe('logLevel валидация', () => {
    it.each(['debug', 'info', 'warn', 'error'] as const)("logLevel='%s' сохраняется", (level) => {
      const result = deserializeYwConfig({ orgType: 'yandex360', logLevel: level });

      expect(result.logLevel).toBe(level);
    });

    it("неизвестный logLevel='verbose' → опускается", () => {
      const result = deserializeYwConfig({ orgType: 'yandex360', logLevel: 'verbose' });

      expect(result.logLevel).toBeUndefined();
    });

    it("неизвестный logLevel='verbose' → console.warn (N12)", () => {
      deserializeYwConfig({ orgType: 'yandex360', logLevel: 'verbose' });

      expect(warnSpy).toHaveBeenCalledTimes(1);
      const message = String(warnSpy.mock.calls[0]?.[0] ?? '');
      expect(message).toContain('logLevel');
      expect(message).toContain('verbose');
    });

    it('logLevel не строка → опускается', () => {
      const result = deserializeYwConfig({ orgType: 'yandex360', logLevel: 1 });

      expect(result.logLevel).toBeUndefined();
    });
  });
});
