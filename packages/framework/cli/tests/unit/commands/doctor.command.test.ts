/**
 * Тесты doctorCommand.
 *
 * 5 сценариев из плана 1.4.1:
 *  1. Happy path: пустой registry + пустой extraChecks → summary all zero
 *  2. Один клиент установлен, всё ok → ok-результаты, ok > 0
 *  3. Один extraCheck fail → summary.fail === 1
 *  4. Mixed warn+fail → корректный summary
 *  5. extraChecks[N].run() кидает исключение → fail с сообщением об исключении
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as fs from 'node:fs/promises';
import { doctorCommand } from '../../../src/commands/doctor.command.js';
import type { MCPConnector } from '../../../src/connectors/base/connector.interface.js';
import type { IConnectorRegistry } from '../../../src/types.js';
import type { ConnectionStatus, MCPClientInfo } from '../../../src/types/client.types.js';
import type { ServerLaunchSpec } from '../../../src/types/launch.types.js';
import type { DoctorCheck } from '../../../src/types/doctor.types.js';

vi.mock('node:fs/promises', async () => {
  const actual = await vi.importActual<typeof import('node:fs/promises')>('node:fs/promises');
  return {
    ...actual,
    access: vi.fn(),
  };
});

interface ConnectorOpts {
  name: string;
  isInstalled?: boolean;
  status?: ConnectionStatus;
  spec?: ServerLaunchSpec | null;
}

function makeConnector(opts: ConnectorOpts): MCPConnector {
  const info: MCPClientInfo = {
    name: opts.name,
    displayName: opts.name.toUpperCase(),
    description: 'mock',
    configPath: `/tmp/${opts.name}.json`,
    platforms: ['darwin'],
  };
  return {
    getClientInfo: () => info,
    isInstalled: vi.fn().mockResolvedValue(opts.isInstalled ?? true),
    getStatus: vi.fn().mockResolvedValue(opts.status ?? { connected: true }),
    connect: vi.fn(),
    disconnect: vi.fn(),
    validateLaunchSpec: vi.fn(),
    getLaunchSpec: vi.fn().mockResolvedValue(opts.spec ?? null),
  } as unknown as MCPConnector;
}

function makeRegistry(connectors: MCPConnector[]): IConnectorRegistry {
  return {
    register: vi.fn(),
    get: vi.fn(),
    getAll: vi.fn(() => connectors),
    findInstalled: vi.fn(async () => {
      const installed: MCPConnector[] = [];
      for (const c of connectors) {
        if (await c.isInstalled()) installed.push(c);
      }
      return installed;
    }),
    checkAllStatuses: vi.fn(async () => new Map()),
  };
}

beforeEach(() => {
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.mocked(fs.access).mockReset();
});

describe('doctorCommand', () => {
  describe('Сценарий 1: пустой registry + пустой extraChecks', () => {
    it('summary all zero, checks пустой', async () => {
      const registry = makeRegistry([]);
      const report = await doctorCommand({ registry });

      expect(report.checks).toEqual([]);
      expect(report.summary).toEqual({ ok: 0, warn: 0, fail: 0, skip: 0 });
    });
  });

  describe('Сценарий 2: один клиент установлен, всё ok', () => {
    it('client-level checks (isInstalled+getStatus+command-exists) — ok > 0', async () => {
      const conn = makeConnector({
        name: 'gemini',
        isInstalled: true,
        status: { connected: true },
        spec: { command: '/abs/server', args: [], env: {} },
      });
      vi.mocked(fs.access).mockResolvedValue(undefined);

      const registry = makeRegistry([conn]);
      const report = await doctorCommand({ registry });

      expect(report.summary.fail).toBe(0);
      expect(report.summary.ok).toBeGreaterThan(0);
      // 3 client-level проверки
      expect(report.checks).toHaveLength(3);
    });

    it('spec = null → command-exists возвращает skip', async () => {
      const conn = makeConnector({
        name: 'gemini',
        isInstalled: true,
        status: { connected: false },
        spec: null,
      });
      const registry = makeRegistry([conn]);
      const report = await doctorCommand({ registry });

      const commandCheck = report.checks.find((c) => c.check.name === 'command-exists');
      expect(commandCheck?.result.status).toBe('skip');
    });

    it('relative command → command-exists возвращает warn', async () => {
      const conn = makeConnector({
        name: 'gemini',
        isInstalled: true,
        status: { connected: true },
        spec: { command: 'npx', args: ['pkg'], env: {} },
      });
      const registry = makeRegistry([conn]);
      const report = await doctorCommand({ registry });

      const commandCheck = report.checks.find((c) => c.check.name === 'command-exists');
      expect(commandCheck?.result.status).toBe('warn');
      expect(commandCheck?.result.hint).toBeTruthy();
    });

    it('абсолютный путь не существует → command-exists возвращает fail', async () => {
      const conn = makeConnector({
        name: 'gemini',
        isInstalled: true,
        status: { connected: true },
        spec: { command: '/missing/server', args: [], env: {} },
      });
      vi.mocked(fs.access).mockRejectedValue(new Error('ENOENT'));
      const registry = makeRegistry([conn]);
      const report = await doctorCommand({ registry });

      const commandCheck = report.checks.find((c) => c.check.name === 'command-exists');
      expect(commandCheck?.result.status).toBe('fail');
    });
  });

  describe('Сценарий 3: один extraCheck fail → summary.fail === 1', () => {
    it('extraCheck возвращает fail', async () => {
      const registry = makeRegistry([]);
      const failingCheck: DoctorCheck = {
        name: 'domain-check',
        description: 'Domain validation',
        run: () => Promise.resolve({ status: 'fail', message: 'Something is wrong' }),
      };

      const report = await doctorCommand({ registry, extraChecks: [failingCheck] });
      expect(report.summary.fail).toBe(1);
      expect(report.summary.ok).toBe(0);
      expect(report.checks).toHaveLength(1);
      expect(report.checks[0]?.result.message).toBe('Something is wrong');
    });
  });

  describe('Сценарий 4: mixed — один warn, один fail', () => {
    it('summary корректен', async () => {
      const registry = makeRegistry([]);
      const checks: DoctorCheck[] = [
        {
          name: 'check-warn',
          description: 'warn',
          run: () => Promise.resolve({ status: 'warn', message: 'mild' }),
        },
        {
          name: 'check-fail',
          description: 'fail',
          run: () => Promise.resolve({ status: 'fail', message: 'bad' }),
        },
        {
          name: 'check-ok',
          description: 'ok',
          run: () => Promise.resolve({ status: 'ok', message: 'ok!' }),
        },
        {
          name: 'check-skip',
          description: 'skip',
          run: () => Promise.resolve({ status: 'skip', message: 'skipped' }),
        },
      ];

      const report = await doctorCommand({ registry, extraChecks: checks });
      expect(report.summary).toEqual({ ok: 1, warn: 1, fail: 1, skip: 1 });
    });
  });

  describe('Сценарий 5: extraCheck.run() кидает исключение', () => {
    it('обрабатывается как fail с сообщением об исключении (robustness)', async () => {
      const registry = makeRegistry([]);
      const explodingCheck: DoctorCheck = {
        name: 'boom',
        description: 'will throw',
        run: () => Promise.reject(new Error('kaboom!')),
      };

      const report = await doctorCommand({ registry, extraChecks: [explodingCheck] });
      expect(report.summary.fail).toBe(1);
      expect(report.checks[0]?.result.status).toBe('fail');
      expect(report.checks[0]?.result.message).toContain('kaboom!');
    });

    it('одна сломанная проверка не валит остальные', async () => {
      const registry = makeRegistry([]);
      const checks: DoctorCheck[] = [
        {
          name: 'ok',
          description: '',
          run: () => Promise.resolve({ status: 'ok', message: 'ok' }),
        },
        {
          name: 'broken',
          description: '',
          run: () => {
            throw new Error('sync throw');
          },
        },
        {
          name: 'ok2',
          description: '',
          run: () => Promise.resolve({ status: 'ok', message: 'ok2' }),
        },
      ];

      const report = await doctorCommand({ registry, extraChecks: checks });
      expect(report.summary.ok).toBe(2);
      expect(report.summary.fail).toBe(1);
      expect(report.checks).toHaveLength(3);
    });

    it('не-Error rejection обрабатывается как fail', async () => {
      const registry = makeRegistry([]);
      const explodingCheck: DoctorCheck = {
        name: 'string-throw',
        description: '',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        run: () => Promise.reject('plain string' as any),
      };
      const report = await doctorCommand({ registry, extraChecks: [explodingCheck] });
      expect(report.summary.fail).toBe(1);
      expect(report.checks[0]?.result.message).toContain('plain string');
    });
  });

  describe('Дополнительные проверки', () => {
    it('client-level checks работают параллельно с extraChecks', async () => {
      const conn = makeConnector({
        name: 'gemini',
        isInstalled: true,
        status: { connected: true },
        spec: { command: 'npx', args: ['pkg'], env: {} },
      });
      const registry = makeRegistry([conn]);
      const extraCheck: DoctorCheck = {
        name: 'extra',
        description: '',
        run: () => Promise.resolve({ status: 'ok', message: 'extra ok' }),
      };

      const report = await doctorCommand({ registry, extraChecks: [extraCheck] });
      expect(report.checks).toHaveLength(4); // 3 client + 1 extra
      expect(report.checks[3]?.check.name).toBe('extra');
    });

    it('неустановленный клиент → client-level checks не запускаются', async () => {
      const conn = makeConnector({ name: 'gemini', isInstalled: false });
      const registry = makeRegistry([conn]);
      const report = await doctorCommand({ registry });
      expect(report.checks).toHaveLength(0);
    });

    it('getStatus с warning (connected + error) → warn', async () => {
      const conn = makeConnector({
        name: 'gemini',
        isInstalled: true,
        status: { connected: true, error: 'Unknown state: ⏳' },
        spec: { command: 'npx', args: [], env: {} },
      });
      const registry = makeRegistry([conn]);
      const report = await doctorCommand({ registry });
      const statusCheck = report.checks.find((c) => c.check.name === 'getStatus');
      expect(statusCheck?.result.status).toBe('warn');
    });

    it('getStatus с !connected + без error → warn с hint', async () => {
      const conn = makeConnector({
        name: 'gemini',
        isInstalled: true,
        status: { connected: false },
      });
      const registry = makeRegistry([conn]);
      const report = await doctorCommand({ registry });
      const statusCheck = report.checks.find((c) => c.check.name === 'getStatus');
      expect(statusCheck?.result.status).toBe('warn');
      expect(statusCheck?.result.hint).toBeTruthy();
    });
  });
});
