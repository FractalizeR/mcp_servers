/**
 * Тесты listCommand.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { listCommand } from '../../../src/commands/list.command.js';
import type { MCPConnector } from '../../../src/connectors/base/connector.interface.js';
import type { ConnectorRegistry } from '../../../src/connectors/registry.js';

function makeConnector(name: string, isInstalled = true): MCPConnector {
  return {
    getClientInfo: () => ({
      name,
      displayName: name.toUpperCase(),
      description: 'mock',
      configPath: `/tmp/${name}.json`,
      platforms: ['darwin', 'linux'],
    }),
    isInstalled: vi.fn().mockResolvedValue(isInstalled),
    connect: vi.fn(),
    disconnect: vi.fn(),
    getStatus: vi.fn(),
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
    checkAllStatuses: vi.fn(),
  } as unknown as ConnectorRegistry;
}

beforeEach(() => {
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('listCommand', () => {
  it('пустой реестр → warn', async () => {
    const registry = makeRegistry([]);
    await expect(listCommand({ registry })).resolves.toBeUndefined();
  });

  it('выводит информацию для всех зарегистрированных коннекторов', async () => {
    const a = makeConnector('a', true);
    const b = makeConnector('b', false);
    const registry = makeRegistry([a, b]);

    await listCommand({ registry });

    expect(a.isInstalled).toHaveBeenCalled();
    expect(b.isInstalled).toHaveBeenCalled();
  });
});
