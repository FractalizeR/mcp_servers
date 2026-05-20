/**
 * Тесты `serializeYtConfig` — сериализация в JSON для записи в config.json.
 *
 * Ключевая инварианта: `token` (секрет) НИКОГДА не попадает в результат.
 */

import { describe, it, expect } from 'vitest';
import { serializeYtConfig } from '#cli/serialize-config.js';
import type { YandexTrackerMCPConfig } from '#cli/types.js';

describe('serializeYtConfig', () => {
  describe('политика безопасности: token не сохраняется', () => {
    it('token отсутствует в результате', () => {
      const config: YandexTrackerMCPConfig = {
        token: 'super-secret-oauth-token',
        orgType: 'yandex360',
        orgId: 'org-1',
      };

      const result = serializeYtConfig(config);

      expect(result).not.toHaveProperty('token');
    });
  });

  describe('обязательные поля', () => {
    it('orgType и orgId всегда попадают', () => {
      const result = serializeYtConfig({
        token: 't',
        orgType: 'yandex360',
        orgId: 'org-1',
      });

      expect(result['orgType']).toBe('yandex360');
      expect(result['orgId']).toBe('org-1');
    });

    it("orgType: 'cloud' сохраняется как есть", () => {
      const result = serializeYtConfig({
        token: 't',
        orgType: 'cloud',
        orgId: 'cloud-org',
      });

      expect(result['orgType']).toBe('cloud');
    });
  });

  describe('опциональные поля: попадают если заданы', () => {
    it('apiBase попадает если задано (включая пустую строку)', () => {
      const result = serializeYtConfig({
        token: 't',
        orgType: 'yandex360',
        orgId: 'org',
        apiBase: 'https://api.example.com',
      });

      expect(result['apiBase']).toBe('https://api.example.com');
    });

    it('requestTimeout попадает (как число)', () => {
      const result = serializeYtConfig({
        token: 't',
        orgType: 'yandex360',
        orgId: 'org',
        requestTimeout: 5000,
      });

      expect(result['requestTimeout']).toBe(5000);
    });

    it('logLevel попадает', () => {
      const result = serializeYtConfig({
        token: 't',
        orgType: 'yandex360',
        orgId: 'org',
        logLevel: 'debug',
      });

      expect(result['logLevel']).toBe('debug');
    });
  });

  describe('опциональные поля: undefined опускается', () => {
    it('apiBase отсутствует → нет ключа', () => {
      const result = serializeYtConfig({
        token: 't',
        orgType: 'yandex360',
        orgId: 'org',
      });

      expect(result).not.toHaveProperty('apiBase');
    });

    it('requestTimeout отсутствует → нет ключа', () => {
      const result = serializeYtConfig({
        token: 't',
        orgType: 'yandex360',
        orgId: 'org',
      });

      expect(result).not.toHaveProperty('requestTimeout');
    });

    it('logLevel отсутствует → нет ключа', () => {
      const result = serializeYtConfig({
        token: 't',
        orgType: 'yandex360',
        orgId: 'org',
      });

      expect(result).not.toHaveProperty('logLevel');
    });
  });

  describe('все поля заданы', () => {
    it('возвращает полный объект без token', () => {
      const result = serializeYtConfig({
        token: 't',
        orgType: 'cloud',
        orgId: 'cloud-org-xyz',
        apiBase: 'https://api.example.com',
        requestTimeout: 12000,
        logLevel: 'warn',
      });

      expect(result).toEqual({
        orgType: 'cloud',
        orgId: 'cloud-org-xyz',
        apiBase: 'https://api.example.com',
        requestTimeout: 12000,
        logLevel: 'warn',
      });
    });
  });
});
