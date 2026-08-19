/**
 * Тесты resolveSecretsEnv: проекция всех 4 исходов GetLaunchSpecResult +
 * специфичный для dev-client 5-й исход — пустой env (DoD 3: отказ до спавна).
 */

import { describe, it, expect } from 'vitest';
import { resolveSecretsEnv } from '../../../src/launch/resolve-secrets-env.js';
import type { MCPConnector } from '@fractalizer/mcp-cli';
import type { GetLaunchSpecResult } from '@fractalizer/mcp-cli';

function stubConnector(result: GetLaunchSpecResult): MCPConnector {
  return {
    getClientInfo: () => ({
      name: 'stub',
      displayName: 'Stub',
      description: 'stub',
      configPath: '/dev/null',
      platforms: ['darwin'],
    }),
    isInstalled: () => Promise.resolve(true),
    getStatus: () => Promise.resolve({ connected: false }),
    connect: () => Promise.reject(new Error('not implemented')),
    disconnect: () => Promise.reject(new Error('not implemented')),
    validateLaunchSpec: () => Promise.resolve([]),
    getLaunchSpec: () => Promise.resolve(result),
  };
}

describe('resolveSecretsEnv', () => {
  it('outcome: ok — env непустой', async () => {
    const outcome = await resolveSecretsEnv('srv', {
      connectorFactory: () =>
        stubConnector({
          outcome: 'found',
          spec: { command: 'node', args: [], env: { TOKEN: 'x' } },
        }),
    });
    expect(outcome).toEqual({ outcome: 'ok', env: { TOKEN: 'x' } });
  });

  it('outcome: emptyEnv — запись найдена, но env пуст → отказ ДО спавна (DoD 3)', async () => {
    const outcome = await resolveSecretsEnv('srv', {
      connectorFactory: () =>
        stubConnector({ outcome: 'found', spec: { command: 'node', args: [], env: {} } }),
    });
    expect(outcome).toEqual({ outcome: 'emptyEnv' });
  });

  it('outcome: notConnected — сервер не зарегистрирован в клиенте', async () => {
    const outcome = await resolveSecretsEnv('srv', {
      connectorFactory: () => stubConnector({ outcome: 'notConnected' }),
    });
    expect(outcome).toEqual({ outcome: 'notConnected' });
  });

  it('outcome: notStdio — транспорт записи не stdio', async () => {
    const outcome = await resolveSecretsEnv('srv', {
      connectorFactory: () => stubConnector({ outcome: 'notStdio', transport: 'http' }),
    });
    expect(outcome).toEqual({ outcome: 'notStdio', transport: 'http' });
  });

  it('outcome: unparsable — вывод клиента не разобран', async () => {
    const outcome = await resolveSecretsEnv('srv', {
      connectorFactory: () => stubConnector({ outcome: 'unparsable', reason: 'no Command field' }),
    });
    expect(outcome).toEqual({ outcome: 'unparsable', reason: 'no Command field' });
  });

  it('outcome: commandFailed — команда чтения записи упала/истёк таймаут', async () => {
    const outcome = await resolveSecretsEnv('srv', {
      connectorFactory: () => stubConnector({ outcome: 'commandFailed', message: 'timeout' }),
    });
    expect(outcome).toEqual({ outcome: 'commandFailed', message: 'timeout' });
  });

  it('outcome: maskedEnv — значения записи выглядят замаскированными клиентом (D2)', async () => {
    // Регресс: отказ до спавна срабатывал только на ПОЛНОСТЬЮ пустом env,
    // а `TOKEN=***` проходил и давал тихий отказ аутентификации сервера.
    const outcome = await resolveSecretsEnv('srv', {
      connectorFactory: () =>
        stubConnector({
          outcome: 'found',
          spec: {
            command: 'node',
            args: ['bundle.cjs'],
            env: { TRACKER_TOKEN: '***', LOG_LEVEL: 'info' },
          },
        }),
    });
    expect(outcome).toEqual({ outcome: 'maskedEnv', keys: ['TRACKER_TOKEN'] });
  });

  it('обычные значения маскированными не считаются', async () => {
    const outcome = await resolveSecretsEnv('srv', {
      connectorFactory: () =>
        stubConnector({
          outcome: 'found',
          spec: {
            command: 'node',
            args: ['bundle.cjs'],
            env: { TRACKER_TOKEN: 'y0_real*token*value' },
          },
        }),
    });
    expect(outcome.outcome).toBe('ok');
  });
});
