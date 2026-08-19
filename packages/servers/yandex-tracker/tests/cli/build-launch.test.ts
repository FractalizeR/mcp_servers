/**
 * Тесты адаптера `buildYtServerLaunch` (доменный конфиг → ServerLaunchSpec).
 *
 * Подход: вместо моков `node:module`/файловой системы используем DI —
 * прокидываем фейковый `resolver: BundleResolver`. Это даёт детерминированные
 * проверки маппинга env без зависимости от состояния файловой системы.
 *
 * Источник истины для имён env-переменных — `src/config/constants.ts`
 * (`ENV_VAR_NAMES`).
 */

import { describe, it, expect } from 'vitest';
import { buildYtServerLaunch } from '#cli/build-launch.js';
import type { BundleResolver } from '#cli/bundle-resolver.js';
import type { YandexTrackerMCPConfig } from '#cli/types.js';

const FAKE_BUNDLE_PATH = '/fake/dist/yandex-tracker.bundle.cjs';
const fakeResolver: BundleResolver = () => FAKE_BUNDLE_PATH;

describe('buildYtServerLaunch: orgType маппинг (mutually exclusive)', () => {
  it('orgType: yandex360 → YANDEX_ORG_ID, без YANDEX_CLOUD_ORG_ID', () => {
    const config: YandexTrackerMCPConfig = {
      token: 'tok',
      orgType: 'yandex360',
      orgId: 'org-360',
    };

    const spec = buildYtServerLaunch(config, fakeResolver);

    expect(spec.env['YANDEX_ORG_ID']).toBe('org-360');
    expect(spec.env).not.toHaveProperty('YANDEX_CLOUD_ORG_ID');
  });

  it('orgType: cloud → YANDEX_CLOUD_ORG_ID, без YANDEX_ORG_ID', () => {
    const config: YandexTrackerMCPConfig = {
      token: 'tok',
      orgType: 'cloud',
      orgId: 'cloud-org-abc',
    };

    const spec = buildYtServerLaunch(config, fakeResolver);

    expect(spec.env['YANDEX_CLOUD_ORG_ID']).toBe('cloud-org-abc');
    expect(spec.env).not.toHaveProperty('YANDEX_ORG_ID');
  });
});

describe('buildYtServerLaunch: обязательный токен', () => {
  it('YANDEX_TRACKER_TOKEN всегда присутствует', () => {
    const config: YandexTrackerMCPConfig = {
      token: 'secret-token-value',
      orgType: 'yandex360',
      orgId: 'org',
    };

    const spec = buildYtServerLaunch(config, fakeResolver);

    expect(spec.env['YANDEX_TRACKER_TOKEN']).toBe('secret-token-value');
  });
});

describe('buildYtServerLaunch: apiBase', () => {
  it('непустой apiBase попадает в env', () => {
    const config: YandexTrackerMCPConfig = {
      token: 't',
      orgType: 'yandex360',
      orgId: 'org',
      apiBase: 'https://api.example.com',
    };

    const spec = buildYtServerLaunch(config, fakeResolver);

    expect(spec.env['YANDEX_TRACKER_API_BASE']).toBe('https://api.example.com');
  });

  it("apiBase='' (пустая строка) → ключ опускается", () => {
    const config: YandexTrackerMCPConfig = {
      token: 't',
      orgType: 'yandex360',
      orgId: 'org',
      apiBase: '',
    };

    const spec = buildYtServerLaunch(config, fakeResolver);

    expect(spec.env).not.toHaveProperty('YANDEX_TRACKER_API_BASE');
  });

  it("apiBase='   ' (только пробелы) → ключ опускается", () => {
    const config: YandexTrackerMCPConfig = {
      token: 't',
      orgType: 'yandex360',
      orgId: 'org',
      apiBase: '   ',
    };

    const spec = buildYtServerLaunch(config, fakeResolver);

    expect(spec.env).not.toHaveProperty('YANDEX_TRACKER_API_BASE');
  });

  it('apiBase=undefined → ключ опускается', () => {
    const config: YandexTrackerMCPConfig = {
      token: 't',
      orgType: 'yandex360',
      orgId: 'org',
    };

    const spec = buildYtServerLaunch(config, fakeResolver);

    expect(spec.env).not.toHaveProperty('YANDEX_TRACKER_API_BASE');
  });
});

describe('buildYtServerLaunch: requestTimeout', () => {
  it('requestTimeout=5000 → REQUEST_TIMEOUT="5000" (строка)', () => {
    const config: YandexTrackerMCPConfig = {
      token: 't',
      orgType: 'yandex360',
      orgId: 'org',
      requestTimeout: 5000,
    };

    const spec = buildYtServerLaunch(config, fakeResolver);

    expect(spec.env['REQUEST_TIMEOUT']).toBe('5000');
    expect(typeof spec.env['REQUEST_TIMEOUT']).toBe('string');
  });

  it('requestTimeout=undefined → ключ опускается', () => {
    const config: YandexTrackerMCPConfig = {
      token: 't',
      orgType: 'yandex360',
      orgId: 'org',
    };

    const spec = buildYtServerLaunch(config, fakeResolver);

    expect(spec.env).not.toHaveProperty('REQUEST_TIMEOUT');
  });
});

describe('buildYtServerLaunch: logLevel', () => {
  it("logLevel='  info  ' → trimmed 'info'", () => {
    const config: YandexTrackerMCPConfig = {
      token: 't',
      orgType: 'yandex360',
      orgId: 'org',
      logLevel: '  info  ' as NonNullable<YandexTrackerMCPConfig['logLevel']>,
    };

    const spec = buildYtServerLaunch(config, fakeResolver);

    expect(spec.env['LOG_LEVEL']).toBe('info');
  });

  it('logLevel=undefined → ключ опускается', () => {
    const config: YandexTrackerMCPConfig = {
      token: 't',
      orgType: 'yandex360',
      orgId: 'org',
    };

    const spec = buildYtServerLaunch(config, fakeResolver);

    expect(spec.env).not.toHaveProperty('LOG_LEVEL');
  });
});

describe('buildYtServerLaunch: spec.command / spec.args', () => {
  it('command === "node"', () => {
    const spec = buildYtServerLaunch(
      { token: 't', orgType: 'yandex360', orgId: 'org' },
      fakeResolver
    );

    expect(spec.command).toBe('node');
  });

  it('args[0] === путь от resolver', () => {
    const spec = buildYtServerLaunch(
      { token: 't', orgType: 'yandex360', orgId: 'org' },
      fakeResolver
    );

    expect(spec.args).toHaveLength(1);
    expect(spec.args[0]).toBe(FAKE_BUNDLE_PATH);
  });
});

describe('buildYtServerLaunch: интеграция с defaultBundleResolver', () => {
  it('без resolver-параметра использует defaultBundleResolver (smoke)', () => {
    // Smoke: в монорепо бандл существует (см. dist/yandex-tracker.bundle.cjs).
    // Тест полагается на наличие собранного бандла; если упадёт — нужно
    // запустить `npm run build` для tracker.
    const spec = buildYtServerLaunch({ token: 't', orgType: 'yandex360', orgId: 'org' });

    expect(spec.command).toBe('node');
    expect(spec.args[0]).toMatch(/yandex-tracker\.bundle\.cjs$/);
  });
});
