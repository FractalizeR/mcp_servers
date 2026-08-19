/**
 * Тест композиции окружения: дочерний процесс видит и родительские переменные,
 * и секреты записи (DoD 5).
 */

import { describe, it, expect } from 'vitest';
import { composeEnv } from '../../../src/launch/compose-env.js';

describe('composeEnv', () => {
  it('дочерний процесс видит и родительские переменные, и секреты записи клиента', () => {
    const parentEnv = { PATH: '/usr/bin', HOME: '/home/dev', NODE_EXTRA_CA_CERTS: '/etc/ca.pem' };
    const secretsEnv = { YANDEX_TRACKER_TOKEN: 'sec-token', YANDEX_ORG_ID: 'org-1' };

    const composed = composeEnv(secretsEnv, parentEnv);

    expect(composed).toMatchObject(parentEnv);
    expect(composed).toMatchObject(secretsEnv);
  });

  it('секреты записи побеждают при коллизии ключа с родительским окружением', () => {
    const composed = composeEnv({ LOG_LEVEL: 'from-secrets' }, { LOG_LEVEL: 'from-parent' });
    expect(composed['LOG_LEVEL']).toBe('from-secrets');
  });

  it('не подменяет окружение целиком — родительские ключи, отсутствующие в secretsEnv, сохраняются', () => {
    const composed = composeEnv({ TOKEN: 'x' }, { PATH: '/usr/bin', HOME: '/home/dev' });
    expect(composed['PATH']).toBe('/usr/bin');
    expect(composed['HOME']).toBe('/home/dev');
    expect(composed['TOKEN']).toBe('x');
  });

  it('игнорирует undefined-значения родительского process.env (тип NodeJS.ProcessEnv допускает undefined)', () => {
    const composed = composeEnv({}, { SET: 'value', UNSET: undefined });
    expect(composed).toEqual({ SET: 'value' });
  });

  it('по умолчанию использует process.env как parentEnv', () => {
    const originalMarker = process.env['MCP_DEV_CLIENT_TEST_MARKER'];
    process.env['MCP_DEV_CLIENT_TEST_MARKER'] = 'present';
    try {
      const composed = composeEnv({});
      expect(composed['MCP_DEV_CLIENT_TEST_MARKER']).toBe('present');
    } finally {
      if (originalMarker === undefined) {
        delete process.env['MCP_DEV_CLIENT_TEST_MARKER'];
      } else {
        process.env['MCP_DEV_CLIENT_TEST_MARKER'] = originalMarker;
      }
    }
  });
});
