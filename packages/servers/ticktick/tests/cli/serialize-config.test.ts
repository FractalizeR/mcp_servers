/**
 * Тесты `serializeTickTickConfig` — сериализация в JSON для записи в config.json.
 *
 * Ключевая инварианта: `clientSecret` (OAuth-секрет) НИКОГДА не попадает
 * в результат. На диск сохраняются только clientId, redirectUri, logLevel.
 */

import { describe, it, expect } from 'vitest';
import { serializeTickTickConfig } from '#cli/serialize-config.js';
import type { TickTickMCPConfig } from '#cli/types.js';

describe('serializeTickTickConfig', () => {
  describe('политика безопасности: clientSecret не сохраняется', () => {
    it('clientSecret отсутствует в результате (OAuth-секрет)', () => {
      const config: TickTickMCPConfig = {
        clientId: 'client-id-value',
        clientSecret: 'OAUTH_SECRET_DO_NOT_PERSIST',
      };

      const result = serializeTickTickConfig(config);

      expect(result).not.toHaveProperty('clientSecret');
    });

    it('clientSecret отсутствует, даже когда заданы все остальные поля', () => {
      const result = serializeTickTickConfig({
        clientId: 'c',
        clientSecret: 'OAUTH_SECRET',
        redirectUri: 'http://localhost/cb',
        logLevel: 'info',
      });

      expect(result).not.toHaveProperty('clientSecret');
    });
  });

  describe('обязательные поля', () => {
    it('clientId всегда попадает', () => {
      const result = serializeTickTickConfig({
        clientId: 'my-client-id',
        clientSecret: 's',
      });

      expect(result['clientId']).toBe('my-client-id');
    });
  });

  describe('опциональные поля: попадают если заданы', () => {
    it('redirectUri попадает', () => {
      const result = serializeTickTickConfig({
        clientId: 'id',
        clientSecret: 's',
        redirectUri: 'http://localhost:8080/cb',
      });

      expect(result['redirectUri']).toBe('http://localhost:8080/cb');
    });

    it('logLevel попадает', () => {
      const result = serializeTickTickConfig({
        clientId: 'id',
        clientSecret: 's',
        logLevel: 'debug',
      });

      expect(result['logLevel']).toBe('debug');
    });
  });

  describe('опциональные поля: undefined опускается', () => {
    it('redirectUri отсутствует → нет ключа', () => {
      const result = serializeTickTickConfig({ clientId: 'id', clientSecret: 's' });

      expect(result).not.toHaveProperty('redirectUri');
    });

    it('logLevel отсутствует → нет ключа', () => {
      const result = serializeTickTickConfig({ clientId: 'id', clientSecret: 's' });

      expect(result).not.toHaveProperty('logLevel');
    });
  });

  describe('все поля заданы', () => {
    it('возвращает полный объект без clientSecret', () => {
      const result = serializeTickTickConfig({
        clientId: 'client-xyz',
        clientSecret: 'super-secret',
        redirectUri: 'http://localhost:8080/cb',
        logLevel: 'warn',
      });

      expect(result).toEqual({
        clientId: 'client-xyz',
        redirectUri: 'http://localhost:8080/cb',
        logLevel: 'warn',
      });
    });
  });

  describe('Yandex-поля отсутствуют', () => {
    it('orgType / orgId не попадают в результат TickTick', () => {
      const result = serializeTickTickConfig({ clientId: 'id', clientSecret: 's' });

      expect(result).not.toHaveProperty('orgType');
      expect(result).not.toHaveProperty('orgId');
    });
  });
});
