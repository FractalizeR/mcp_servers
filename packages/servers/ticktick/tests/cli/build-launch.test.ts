/**
 * Тесты адаптера `buildTickTickServerLaunch` (доменный конфиг → ServerLaunchSpec).
 *
 * Отличие от Yandex Tracker/Wiki: TickTick использует OAuth (clientId + clientSecret),
 * НЕ имеет orgType / orgId / apiBase. Поэтому проверки фокусируются на:
 *  - clientId / clientSecret всегда в env,
 *  - redirectUri опционально, trim,
 *  - logLevel опционально, trim.
 */

import { describe, it, expect } from 'vitest';
import { buildTickTickServerLaunch } from '#cli/build-launch.js';
import type { BundleResolver } from '#cli/bundle-resolver.js';
import type { TickTickMCPConfig } from '#cli/types.js';

const FAKE_BUNDLE_PATH = '/fake/dist/ticktick.bundle.cjs';
const fakeResolver: BundleResolver = () => FAKE_BUNDLE_PATH;

describe('buildTickTickServerLaunch', () => {
  describe('обязательные OAuth-поля', () => {
    it('clientId всегда в env', () => {
      const config: TickTickMCPConfig = {
        clientId: 'client-abc',
        clientSecret: 'secret',
      };

      const spec = buildTickTickServerLaunch(config, fakeResolver);

      expect(spec.env['TICKTICK_CLIENT_ID']).toBe('client-abc');
    });

    it('clientSecret всегда в env (это OAuth confidential client)', () => {
      const config: TickTickMCPConfig = {
        clientId: 'client-abc',
        clientSecret: 'super-secret',
      };

      const spec = buildTickTickServerLaunch(config, fakeResolver);

      expect(spec.env['TICKTICK_CLIENT_SECRET']).toBe('super-secret');
    });
  });

  describe('redirectUri (опционально)', () => {
    it('заданный redirectUri попадает в env', () => {
      const spec = buildTickTickServerLaunch(
        {
          clientId: 'id',
          clientSecret: 's',
          redirectUri: 'http://localhost:8080/callback',
        },
        fakeResolver
      );

      expect(spec.env['TICKTICK_REDIRECT_URI']).toBe('http://localhost:8080/callback');
    });

    it("redirectUri='' → ключ опускается", () => {
      const spec = buildTickTickServerLaunch(
        { clientId: 'id', clientSecret: 's', redirectUri: '' },
        fakeResolver
      );

      expect(spec.env).not.toHaveProperty('TICKTICK_REDIRECT_URI');
    });

    it("redirectUri='   ' (пробелы) → ключ опускается", () => {
      const spec = buildTickTickServerLaunch(
        { clientId: 'id', clientSecret: 's', redirectUri: '   ' },
        fakeResolver
      );

      expect(spec.env).not.toHaveProperty('TICKTICK_REDIRECT_URI');
    });

    it('redirectUri=undefined → ключ опускается', () => {
      const spec = buildTickTickServerLaunch({ clientId: 'id', clientSecret: 's' }, fakeResolver);

      expect(spec.env).not.toHaveProperty('TICKTICK_REDIRECT_URI');
    });

    it('redirectUri с пробелами по краям тримится', () => {
      const spec = buildTickTickServerLaunch(
        {
          clientId: 'id',
          clientSecret: 's',
          redirectUri: '  http://localhost/cb  ',
        },
        fakeResolver
      );

      expect(spec.env['TICKTICK_REDIRECT_URI']).toBe('http://localhost/cb');
    });
  });

  describe('logLevel (опционально, trim)', () => {
    it("logLevel='  info  ' → 'info'", () => {
      const config: TickTickMCPConfig = {
        clientId: 'id',
        clientSecret: 's',
        logLevel: '  info  ' as TickTickMCPConfig['logLevel'],
      };

      const spec = buildTickTickServerLaunch(config, fakeResolver);

      expect(spec.env['LOG_LEVEL']).toBe('info');
    });

    it('logLevel=undefined → ключ опускается', () => {
      const spec = buildTickTickServerLaunch({ clientId: 'id', clientSecret: 's' }, fakeResolver);

      expect(spec.env).not.toHaveProperty('LOG_LEVEL');
    });
  });

  describe('Yandex env не попадают в TickTick spec', () => {
    it('YANDEX_ORG_ID и YANDEX_CLOUD_ORG_ID отсутствуют', () => {
      const spec = buildTickTickServerLaunch({ clientId: 'id', clientSecret: 's' }, fakeResolver);

      expect(spec.env).not.toHaveProperty('YANDEX_ORG_ID');
      expect(spec.env).not.toHaveProperty('YANDEX_CLOUD_ORG_ID');
    });
  });

  describe('spec.command / spec.args', () => {
    it('command === "node"', () => {
      const spec = buildTickTickServerLaunch({ clientId: 'id', clientSecret: 's' }, fakeResolver);

      expect(spec.command).toBe('node');
    });

    it('args[0] === путь от resolver', () => {
      const spec = buildTickTickServerLaunch({ clientId: 'id', clientSecret: 's' }, fakeResolver);

      expect(spec.args).toHaveLength(1);
      expect(spec.args[0]).toBe(FAKE_BUNDLE_PATH);
    });
  });

  describe('интеграция с defaultBundleResolver', () => {
    it('без resolver-параметра использует defaultBundleResolver (smoke)', () => {
      const spec = buildTickTickServerLaunch({ clientId: 'id', clientSecret: 's' });

      expect(spec.command).toBe('node');
      expect(spec.args[0]).toMatch(/ticktick\.bundle\.cjs$/);
    });
  });
});
