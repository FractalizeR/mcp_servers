/**
 * Тесты `serializeYwConfig` — сериализация в JSON для записи в config.json.
 *
 * Ключевая инварианта: `token` (секрет) НИКОГДА не попадает в результат.
 * Wiki не имеет `apiBase` в доменной модели.
 */

import { describe, it, expect } from 'vitest';
import { serializeYwConfig } from '#cli/serialize-config.js';
import type { YandexWikiMCPConfig } from '#cli/types.js';

describe('serializeYwConfig', () => {
  describe('политика безопасности: token не сохраняется', () => {
    it('token отсутствует в результате', () => {
      const config: YandexWikiMCPConfig = {
        token: 'super-secret-oauth-token',
        orgType: 'yandex360',
        orgId: 'org-1',
      };

      const result = serializeYwConfig(config);

      expect(result).not.toHaveProperty('token');
    });
  });

  describe('обязательные поля', () => {
    it('orgType и orgId всегда попадают', () => {
      const result = serializeYwConfig({
        token: 't',
        orgType: 'yandex360',
        orgId: 'org-1',
      });

      expect(result['orgType']).toBe('yandex360');
      expect(result['orgId']).toBe('org-1');
    });

    it("orgType: 'cloud' сохраняется как есть", () => {
      const result = serializeYwConfig({
        token: 't',
        orgType: 'cloud',
        orgId: 'cloud-org',
      });

      expect(result['orgType']).toBe('cloud');
    });
  });

  describe('опциональные поля: попадают если заданы', () => {
    it('requestTimeout попадает (как число)', () => {
      const result = serializeYwConfig({
        token: 't',
        orgType: 'yandex360',
        orgId: 'org',
        requestTimeout: 5000,
      });

      expect(result['requestTimeout']).toBe(5000);
    });

    it('logLevel попадает', () => {
      const result = serializeYwConfig({
        token: 't',
        orgType: 'yandex360',
        orgId: 'org',
        logLevel: 'debug',
      });

      expect(result['logLevel']).toBe('debug');
    });
  });

  describe('опциональные поля: undefined опускается', () => {
    it('requestTimeout отсутствует → нет ключа', () => {
      const result = serializeYwConfig({
        token: 't',
        orgType: 'yandex360',
        orgId: 'org',
      });

      expect(result).not.toHaveProperty('requestTimeout');
    });

    it('logLevel отсутствует → нет ключа', () => {
      const result = serializeYwConfig({
        token: 't',
        orgType: 'yandex360',
        orgId: 'org',
      });

      expect(result).not.toHaveProperty('logLevel');
    });
  });

  describe('apiBase отсутствует в результате (Wiki не имеет apiBase)', () => {
    it('apiBase никогда не пишется в результат', () => {
      const result = serializeYwConfig({
        token: 't',
        orgType: 'yandex360',
        orgId: 'org',
      });

      expect(result).not.toHaveProperty('apiBase');
    });
  });

  describe('все поля заданы', () => {
    it('возвращает полный объект без token', () => {
      const result = serializeYwConfig({
        token: 't',
        orgType: 'cloud',
        orgId: 'cloud-org-xyz',
        requestTimeout: 12000,
        logLevel: 'warn',
      });

      expect(result).toEqual({
        orgType: 'cloud',
        orgId: 'cloud-org-xyz',
        requestTimeout: 12000,
        logLevel: 'warn',
      });
    });
  });
});
