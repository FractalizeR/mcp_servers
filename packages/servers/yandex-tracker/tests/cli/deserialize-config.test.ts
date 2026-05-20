/**
 * Тесты `deserializeYtConfig` — десериализация из config.json с миграцией
 * старого формата (без orgType) в текущий.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { deserializeYtConfig } from '#cli/deserialize-config.js';

describe('deserializeYtConfig', () => {
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
      const result = deserializeYtConfig({ orgId: 'org-legacy' });

      expect(result.orgType).toBe('yandex360');
      expect(result.orgId).toBe('org-legacy');
    });

    it("пустой объект {} → orgType: 'yandex360' (только миграция)", () => {
      const result = deserializeYtConfig({});

      expect(result.orgType).toBe('yandex360');
      expect(result.orgId).toBeUndefined();
      expect(result.apiBase).toBeUndefined();
      expect(result.requestTimeout).toBeUndefined();
      expect(result.logLevel).toBeUndefined();
    });
  });

  describe('валидация orgType', () => {
    it("orgType: 'yandex360' сохраняется", () => {
      const result = deserializeYtConfig({ orgType: 'yandex360', orgId: 'o' });

      expect(result.orgType).toBe('yandex360');
    });

    it("orgType: 'cloud' сохраняется", () => {
      const result = deserializeYtConfig({ orgType: 'cloud', orgId: 'o' });

      expect(result.orgType).toBe('cloud');
    });

    it("orgType: 'invalid' опускается (пользователь введёт через промпт)", () => {
      const result = deserializeYtConfig({ orgType: 'invalid', orgId: 'o' });

      expect(result.orgType).toBeUndefined();
    });

    it("orgType: 'invalid' → console.warn о неизвестном значении (N12)", () => {
      deserializeYtConfig({ orgType: 'invalid', orgId: 'o' });

      expect(warnSpy).toHaveBeenCalledTimes(1);
      const message = String(warnSpy.mock.calls[0]?.[0] ?? '');
      expect(message).toContain('orgType="invalid"');
      expect(message).toContain('yandex360');
      expect(message).toContain('cloud');
    });

    it('orgType: 123 (не строка) опускается (нет миграции по умолчанию)', () => {
      // При rawOrgType !== string и !== undefined — миграция не срабатывает,
      // поле просто отсутствует.
      const result = deserializeYtConfig({ orgType: 123 });

      expect(result.orgType).toBeUndefined();
    });
  });

  describe('orgId, apiBase, requestTimeout', () => {
    it('строковый orgId сохраняется', () => {
      const result = deserializeYtConfig({ orgType: 'yandex360', orgId: 'org-1' });

      expect(result.orgId).toBe('org-1');
    });

    it('orgId не строка → опускается', () => {
      const result = deserializeYtConfig({ orgType: 'yandex360', orgId: 42 });

      expect(result.orgId).toBeUndefined();
    });

    it('строковый apiBase сохраняется', () => {
      const result = deserializeYtConfig({
        orgType: 'yandex360',
        apiBase: 'https://api.example.com',
      });

      expect(result.apiBase).toBe('https://api.example.com');
    });

    it('apiBase не строка → опускается', () => {
      const result = deserializeYtConfig({ orgType: 'yandex360', apiBase: true });

      expect(result.apiBase).toBeUndefined();
    });

    it('числовой requestTimeout сохраняется', () => {
      const result = deserializeYtConfig({ orgType: 'yandex360', requestTimeout: 7000 });

      expect(result.requestTimeout).toBe(7000);
    });

    it('requestTimeout строкой → опускается', () => {
      const result = deserializeYtConfig({ orgType: 'yandex360', requestTimeout: '7000' });

      expect(result.requestTimeout).toBeUndefined();
    });
  });

  describe('logLevel валидация', () => {
    it.each(['debug', 'info', 'warn', 'error'] as const)("logLevel='%s' сохраняется", (level) => {
      const result = deserializeYtConfig({ orgType: 'yandex360', logLevel: level });

      expect(result.logLevel).toBe(level);
    });

    it("неизвестный logLevel='verbose' → опускается", () => {
      const result = deserializeYtConfig({ orgType: 'yandex360', logLevel: 'verbose' });

      expect(result.logLevel).toBeUndefined();
    });

    it("неизвестный logLevel='verbose' → console.warn (N12)", () => {
      deserializeYtConfig({ orgType: 'yandex360', logLevel: 'verbose' });

      expect(warnSpy).toHaveBeenCalledTimes(1);
      const message = String(warnSpy.mock.calls[0]?.[0] ?? '');
      expect(message).toContain('logLevel');
      expect(message).toContain('verbose');
    });

    it('logLevel не строка → опускается', () => {
      const result = deserializeYtConfig({ orgType: 'yandex360', logLevel: 1 });

      expect(result.logLevel).toBeUndefined();
    });
  });
});
