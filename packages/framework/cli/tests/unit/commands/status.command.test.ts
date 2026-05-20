/**
 * Тесты statusCommand.
 *
 * Команда только рендерит — проверяем что вызывает registry.checkAllStatuses
 * и не падает на разных комбинациях статусов.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { statusCommand } from '../../../src/commands/status.command.js';
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

describe('statusCommand', () => {
  it('пустой реестр → warn, без падения', async () => {
    const registry = makeRegistry([]);
    await expect(statusCommand({ registry })).resolves.toBeUndefined();
  });

  it('рендерит установленные и подключённые клиенты', async () => {
    const a = makeConnector('a', { connected: true, details: { configPath: '/x' } });
    const b = makeConnector('b', { connected: false, error: 'broken' });
    const registry = makeRegistry([a, b]);

    await statusCommand({ registry });

    expect(registry.checkAllStatuses).toHaveBeenCalled();
  });

  it('клиент не установлен — рендерит без вызова деталей', async () => {
    const a = makeConnector('a', { connected: false }, false);
    const registry = makeRegistry([a]);
    await expect(statusCommand({ registry })).resolves.toBeUndefined();
  });

  it('connected + есть error → warn после success', async () => {
    const a = makeConnector('a', {
      connected: true,
      error: 'Unknown state',
      details: { configPath: '/x' },
    });
    const registry = makeRegistry([a]);
    await expect(statusCommand({ registry })).resolves.toBeUndefined();
  });

  it('connected с lastModified рендерит дату', async () => {
    const a = makeConnector('a', {
      connected: true,
      details: { configPath: '/x', lastModified: new Date('2025-01-01') },
    });
    const registry = makeRegistry([a]);
    await expect(statusCommand({ registry })).resolves.toBeUndefined();
  });
});
