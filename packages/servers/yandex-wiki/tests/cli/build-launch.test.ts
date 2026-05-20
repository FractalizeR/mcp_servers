/**
 * Тесты адаптера `buildYwServerLaunch` (доменный конфиг → ServerLaunchSpec).
 *
 * В отличие от tracker, Wiki НЕ имеет `apiBase` в доменной модели.
 *
 * Источник истины для имён env-переменных — `src/config/constants.ts`
 * (`ENV_VAR_NAMES`).
 */

import { describe, it, expect } from 'vitest';
import { buildYwServerLaunch } from '#cli/build-launch.js';
import type { BundleResolver } from '#cli/bundle-resolver.js';
import type { YandexWikiMCPConfig } from '#cli/types.js';

const FAKE_BUNDLE_PATH = '/fake/dist/yandex-wiki.bundle.cjs';
const fakeResolver: BundleResolver = () => FAKE_BUNDLE_PATH;

describe('buildYwServerLaunch', () => {
  describe('orgType маппинг (mutually exclusive)', () => {
    it('orgType: yandex360 → YANDEX_ORG_ID, без YANDEX_CLOUD_ORG_ID', () => {
      const config: YandexWikiMCPConfig = {
        token: 'tok',
        orgType: 'yandex360',
        orgId: 'org-360',
      };

      const spec = buildYwServerLaunch(config, fakeResolver);

      expect(spec.env['YANDEX_ORG_ID']).toBe('org-360');
      expect(spec.env).not.toHaveProperty('YANDEX_CLOUD_ORG_ID');
    });

    it('orgType: cloud → YANDEX_CLOUD_ORG_ID, без YANDEX_ORG_ID', () => {
      const config: YandexWikiMCPConfig = {
        token: 'tok',
        orgType: 'cloud',
        orgId: 'cloud-org-abc',
      };

      const spec = buildYwServerLaunch(config, fakeResolver);

      expect(spec.env['YANDEX_CLOUD_ORG_ID']).toBe('cloud-org-abc');
      expect(spec.env).not.toHaveProperty('YANDEX_ORG_ID');
    });
  });

  describe('обязательный токен', () => {
    it('YANDEX_WIKI_TOKEN всегда присутствует', () => {
      const config: YandexWikiMCPConfig = {
        token: 'secret-token-value',
        orgType: 'yandex360',
        orgId: 'org',
      };

      const spec = buildYwServerLaunch(config, fakeResolver);

      expect(spec.env['YANDEX_WIKI_TOKEN']).toBe('secret-token-value');
    });
  });

  describe('requestTimeout', () => {
    it('requestTimeout=5000 → REQUEST_TIMEOUT="5000" (строка)', () => {
      const config: YandexWikiMCPConfig = {
        token: 't',
        orgType: 'yandex360',
        orgId: 'org',
        requestTimeout: 5000,
      };

      const spec = buildYwServerLaunch(config, fakeResolver);

      expect(spec.env['REQUEST_TIMEOUT']).toBe('5000');
      expect(typeof spec.env['REQUEST_TIMEOUT']).toBe('string');
    });

    it('requestTimeout=undefined → ключ опускается', () => {
      const config: YandexWikiMCPConfig = {
        token: 't',
        orgType: 'yandex360',
        orgId: 'org',
      };

      const spec = buildYwServerLaunch(config, fakeResolver);

      expect(spec.env).not.toHaveProperty('REQUEST_TIMEOUT');
    });
  });

  describe('logLevel', () => {
    it("logLevel='  info  ' → trimmed 'info'", () => {
      const config: YandexWikiMCPConfig = {
        token: 't',
        orgType: 'yandex360',
        orgId: 'org',
        logLevel: '  info  ' as YandexWikiMCPConfig['logLevel'],
      };

      const spec = buildYwServerLaunch(config, fakeResolver);

      expect(spec.env['LOG_LEVEL']).toBe('info');
    });

    it('logLevel=undefined → ключ опускается', () => {
      const config: YandexWikiMCPConfig = {
        token: 't',
        orgType: 'yandex360',
        orgId: 'org',
      };

      const spec = buildYwServerLaunch(config, fakeResolver);

      expect(spec.env).not.toHaveProperty('LOG_LEVEL');
    });
  });

  describe('apiBase не существует в Wiki', () => {
    it('даже если кто-то положит apiBase в config, тип Wiki его не имеет (compile-time)', () => {
      // Wiki YandexWikiMCPConfig не содержит apiBase — это compile-time
      // гарантия. Runtime-проверка: build-launch не пишет YANDEX_TRACKER_API_BASE
      // или подобное.
      const config: YandexWikiMCPConfig = {
        token: 't',
        orgType: 'yandex360',
        orgId: 'org',
      };

      const spec = buildYwServerLaunch(config, fakeResolver);

      expect(spec.env).not.toHaveProperty('YANDEX_TRACKER_API_BASE');
      expect(spec.env).not.toHaveProperty('YANDEX_WIKI_API_BASE');
    });
  });

  describe('spec.command / spec.args', () => {
    it('command === "node"', () => {
      const spec = buildYwServerLaunch(
        { token: 't', orgType: 'yandex360', orgId: 'org' },
        fakeResolver
      );

      expect(spec.command).toBe('node');
    });

    it('args[0] === путь от resolver', () => {
      const spec = buildYwServerLaunch(
        { token: 't', orgType: 'yandex360', orgId: 'org' },
        fakeResolver
      );

      expect(spec.args).toHaveLength(1);
      expect(spec.args[0]).toBe(FAKE_BUNDLE_PATH);
    });
  });

  describe('интеграция с defaultBundleResolver', () => {
    it('без resolver-параметра использует defaultBundleResolver (smoke)', () => {
      const spec = buildYwServerLaunch({ token: 't', orgType: 'yandex360', orgId: 'org' });

      expect(spec.command).toBe('node');
      expect(spec.args[0]).toMatch(/yandex-wiki\.bundle\.cjs$/);
    });
  });
});
