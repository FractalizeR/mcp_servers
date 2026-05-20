/**
 * Тесты validateCommand.
 *
 * Особенность: при наличии ошибок команда вызывает process.exit(1) — мокаем
 * process.exit чтобы предотвратить выход и проверить вызов.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { validateCommand } from '../../../src/commands/validate.command.js';
import type { MCPConnector } from '../../../src/connectors/base/connector.interface.js';
import type { ConnectorRegistry } from '../../../src/connectors/registry.js';
import type { ConnectionStatus, MCPClientInfo } from '../../../src/types/client.types.js';

function makeConnector(name: string, status: ConnectionStatus, isInstalled = true): MCPConnector {
  const info: MCPClientInfo = {
    name,
    displayName: name.toUpperCase(),
    description: 'mock',
    configPath: `/tmp/${name}.json`,
    platforms: ['darwin'],
  };
  return {
    getClientInfo: () => info,
    isInstalled: vi.fn().mockResolvedValue(isInstalled),
    getStatus: vi.fn().mockResolvedValue(status),
    connect: vi.fn(),
    disconnect: vi.fn(),
    validateLaunchSpec: vi.fn(),
    getLaunchSpec: vi.fn(),
  } as unknown as MCPConnector;
}

function makeRegistry(connectors: MCPConnector[]): ConnectorRegistry {
  return {
    register: vi.fn(),
    get: vi.fn(),
    getAll: vi.fn(() => connectors),
    findInstalled: vi.fn(),
    checkAllStatuses: vi.fn(async () => {
      const result = new Map<string, ConnectionStatus>();
      for (const c of connectors) {
        result.set(c.getClientInfo().name, await c.getStatus());
      }
      return result;
    }),
  } as unknown as ConnectorRegistry;
}

beforeEach(() => {
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('validateCommand', () => {
  it('все конфигурации валидны → не вызывает process.exit', async () => {
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(((code?: number) => {
      throw new Error(`exit ${String(code)}`);
    }) as never);

    const a = makeConnector('a', { connected: true, details: { configPath: '/x' } });
    const registry = makeRegistry([a]);

    await validateCommand({ registry });
    expect(exitSpy).not.toHaveBeenCalled();
  });

  it('есть ошибки → вызывает process.exit(1)', async () => {
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(((code?: number) => {
      throw new Error(`exit ${String(code)}`);
    }) as never);

    const a = makeConnector('a', { connected: false, error: 'broken' });
    const registry = makeRegistry([a]);

    await expect(validateCommand({ registry })).rejects.toThrow('exit 1');
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it('клиент не установлен → warn, без exit', async () => {
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {
      throw new Error('exit');
    }) as never);

    const a = makeConnector('a', { connected: false }, false);
    const registry = makeRegistry([a]);

    await validateCommand({ registry });
    expect(exitSpy).not.toHaveBeenCalled();
  });

  it('не подключен, но без error → info, без exit', async () => {
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {
      throw new Error('exit');
    }) as never);

    const a = makeConnector('a', { connected: false });
    const registry = makeRegistry([a]);

    await validateCommand({ registry });
    expect(exitSpy).not.toHaveBeenCalled();
  });
});
