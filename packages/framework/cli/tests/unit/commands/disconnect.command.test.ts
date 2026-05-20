/**
 * Тесты disconnectCommand.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { disconnectCommand } from '../../../src/commands/disconnect.command.js';
import type { MCPConnector } from '../../../src/connectors/base/connector.interface.js';
import type { ConnectorRegistry } from '../../../src/connectors/registry.js';
import type { ConnectionStatus, MCPClientInfo } from '../../../src/types/client.types.js';

const inquirerPromptMock = vi.hoisted(() => vi.fn());
vi.mock('inquirer', () => ({
  default: { prompt: inquirerPromptMock },
}));

function makeConnector(name: string, status: ConnectionStatus): MCPConnector {
  const info: MCPClientInfo = {
    name,
    displayName: name.toUpperCase(),
    description: 'mock',
    configPath: `/tmp/${name}.json`,
    platforms: ['darwin'],
  };
  return {
    getClientInfo: () => info,
    isInstalled: vi.fn().mockResolvedValue(true),
    connect: vi.fn().mockResolvedValue(undefined),
    disconnect: vi.fn().mockResolvedValue(undefined),
    validateLaunchSpec: vi.fn().mockResolvedValue([]),
    getStatus: vi.fn().mockResolvedValue(status),
    getLaunchSpec: vi.fn().mockResolvedValue(null),
  } as unknown as MCPConnector;
}

function makeRegistry(connectors: MCPConnector[]): ConnectorRegistry {
  const map = new Map(connectors.map((c) => [c.getClientInfo().name, c]));
  return {
    register: vi.fn(),
    get: vi.fn((name: string) => map.get(name)),
    getAll: vi.fn(() => Array.from(map.values())),
    findInstalled: vi.fn(async () => Array.from(map.values())),
    checkAllStatuses: vi.fn(async () => {
      const result = new Map<string, ConnectionStatus>();
      for (const [n, c] of map) {
        result.set(n, await c.getStatus());
      }
      return result;
    }),
  } as unknown as ConnectorRegistry;
}

beforeEach(() => {
  inquirerPromptMock.mockReset();
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('disconnectCommand', () => {
  it('cliOptions.client задан + подключен → вызывает disconnect', async () => {
    const conn = makeConnector('gemini', { connected: true });
    const registry = makeRegistry([conn]);

    await disconnectCommand({ registry, cliOptions: { client: 'gemini' } });
    expect(conn.disconnect).toHaveBeenCalledTimes(1);
  });

  it('cliOptions.client = unknown → ошибка, disconnect не вызван', async () => {
    const conn = makeConnector('gemini', { connected: true });
    const registry = makeRegistry([conn]);

    await disconnectCommand({ registry, cliOptions: { client: 'unknown' } });
    expect(conn.disconnect).not.toHaveBeenCalled();
  });

  it('cliOptions.client не подключен → ошибка, disconnect не вызван', async () => {
    const conn = makeConnector('gemini', { connected: false });
    const registry = makeRegistry([conn]);
    // Нужно сделать чтобы getStatus возвращал disconnected, но checkAllStatuses
    // не фильтровал — нет, checkAllStatuses вернёт connected: false и
    // findConnectedConnectors отфильтрует. Но потом cliOptions.client попадёт
    // в selectConnector, который вызовет getStatus и увидит !connected.
    vi.mocked(conn.getStatus).mockResolvedValue({ connected: false });

    await disconnectCommand({ registry, cliOptions: { client: 'gemini' } });
    expect(conn.disconnect).not.toHaveBeenCalled();
  });

  it('нет подключённых клиентов → не вызывает disconnect', async () => {
    const conn = makeConnector('gemini', { connected: false });
    const registry = makeRegistry([conn]);

    await disconnectCommand({ registry });
    expect(conn.disconnect).not.toHaveBeenCalled();
  });

  it('интерактивный выбор: prompter возвращает клиента → disconnect', async () => {
    const a = makeConnector('a', { connected: true });
    const b = makeConnector('b', { connected: true });
    const registry = makeRegistry([a, b]);

    inquirerPromptMock.mockResolvedValueOnce({ selectedClient: 'b' });

    await disconnectCommand({ registry });
    expect(b.disconnect).toHaveBeenCalled();
    expect(a.disconnect).not.toHaveBeenCalled();
  });

  it('disconnect бросает → команда не выбрасывает, но логирует ошибку', async () => {
    const conn = makeConnector('gemini', { connected: true });
    vi.mocked(conn.disconnect).mockRejectedValue(new Error('cannot remove'));
    const registry = makeRegistry([conn]);

    await expect(
      disconnectCommand({ registry, cliOptions: { client: 'gemini' } })
    ).resolves.toBeUndefined();
  });
});
