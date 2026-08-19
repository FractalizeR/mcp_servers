/**
 * Тесты типов (compile-time + минимальные runtime smoke).
 *
 * После Stage 1.1 убраны: BaseMCPServerConfig (более нет такого экспорта),
 * safeFields из ConfigManagerOptions.
 */

import { describe, it, expect, expectTypeOf } from 'vitest';
import type {
  MCPClientInfo,
  ConnectionStatus,
  ConfigManagerOptions,
  ConfigPromptDefinition,
  ServerLaunchSpec,
  GetLaunchSpecResult,
  DoctorCheck,
  DoctorReport,
  IConnectorRegistry,
  MCPConnector,
} from '../../src/types.js';

describe('types', () => {
  it('MCPClientInfo принимает обязательные поля', () => {
    const info: MCPClientInfo = {
      name: 'gemini',
      displayName: 'Gemini',
      description: 'g',
      configPath: '/x',
      platforms: ['darwin'],
    };
    expect(info.name).toBe('gemini');
  });

  it('ConnectionStatus.error опционально', () => {
    const ok: ConnectionStatus = { connected: true };
    const err: ConnectionStatus = { connected: false, error: 'oops' };
    expect(ok.connected).toBe(true);
    expect(err.error).toBe('oops');
  });

  it('ServerLaunchSpec имеет command/args/env', () => {
    const spec: ServerLaunchSpec = { command: 'node', args: ['/x'], env: { K: 'v' } };
    expect(spec.command).toBe('node');
  });

  it('MCPClientServerConfig больше НЕ экспортируется публично (internal)', () => {
    // @ts-expect-error: тип удалён из публичного barrel — это часть контракта
    const _bad: import('../../src/types.js').MCPClientServerConfig | undefined = undefined;
    expect(_bad).toBeUndefined();
  });

  it('ConfigManagerOptions имеет serialize/deserialize (нет safeFields)', () => {
    interface C {
      a: string;
    }
    const opts: ConfigManagerOptions<C> = {
      projectName: 'p',
      serialize: (c) => ({ a: c.a }),
      deserialize: (d) => ({ a: d['a'] as string }),
    };
    expect(opts.projectName).toBe('p');
    // Compile-time check: safeFields отсутствует в типе.
    // @ts-expect-error: safeFields был удалён
    const _bad: ConfigManagerOptions<C> = { projectName: 'p', safeFields: ['a'] };
    expect(_bad.projectName).toBe('p');
  });

  it('ConfigPromptDefinition типизирован для name полей TDomainConfig', () => {
    interface C {
      orgId: string;
    }
    const p: ConfigPromptDefinition<C> = {
      name: 'orgId',
      type: 'input',
      message: 'Org:',
    };
    expect(p.name).toBe('orgId');
  });

  it('DoctorCheck/DoctorReport базовая структура', () => {
    const check: DoctorCheck = {
      name: 'x',
      description: 'd',
      run: () => Promise.resolve({ status: 'ok', message: 'ok' }),
    };
    const report: DoctorReport = {
      checks: [{ check, result: { status: 'ok', message: 'ok' } }],
      summary: { ok: 1, warn: 0, fail: 0, skip: 0 },
    };
    expect(report.summary.ok).toBe(1);
  });

  it('IConnectorRegistry contract: register/get/getAll/findInstalled/checkAllStatuses', () => {
    expectTypeOf<IConnectorRegistry>().toHaveProperty('register');
    expectTypeOf<IConnectorRegistry>().toHaveProperty('get');
    expectTypeOf<IConnectorRegistry>().toHaveProperty('findInstalled');
    expectTypeOf<IConnectorRegistry>().toHaveProperty('checkAllStatuses');
  });

  it('MCPConnector contract: connect принимает ServerLaunchSpec, validateLaunchSpec возвращает string[]', () => {
    expectTypeOf<MCPConnector['connect']>().parameter(0).toEqualTypeOf<ServerLaunchSpec>();
    expectTypeOf<MCPConnector['validateLaunchSpec']>().returns.toEqualTypeOf<Promise<string[]>>();
    expectTypeOf<MCPConnector['getLaunchSpec']>().returns.toEqualTypeOf<
      Promise<GetLaunchSpecResult>
    >();
  });

  it('GetLaunchSpecResult: 5 различимых исходов через discriminated union по outcome', () => {
    const found: GetLaunchSpecResult = {
      outcome: 'found',
      spec: { command: 'node', args: ['/x'], env: {} },
    };
    const notConnected: GetLaunchSpecResult = { outcome: 'notConnected' };
    const notStdio: GetLaunchSpecResult = { outcome: 'notStdio', transport: 'http' };
    const unparsable: GetLaunchSpecResult = { outcome: 'unparsable', reason: 'no Command field' };
    const commandFailed: GetLaunchSpecResult = { outcome: 'commandFailed', message: 'timeout' };

    expect(found.outcome).toBe('found');
    expect(notConnected.outcome).toBe('notConnected');
    expect(notStdio.outcome).toBe('notStdio');
    expect(unparsable.outcome).toBe('unparsable');
    expect(commandFailed.outcome).toBe('commandFailed');
  });
});
