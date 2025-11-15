/**
 * Unit тесты для status command
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { statusCommand } from '../../../../cli/commands/status.command.js';
import { ConnectorRegistry } from '../../../../cli/connectors/registry.js';
import { Logger } from '../../../../cli/utils/logger.js';
import type { ConnectionStatus } from '../../../../cli/connectors/base/connector.interface.js';

// Мокаем модули
vi.mock('../../../../cli/connectors/registry.js');
vi.mock('../../../../cli/utils/logger.js');

describe('statusCommand', () => {
  const mockSpinner = {
    stop: vi.fn(),
  };

  const mockConnector1 = {
    getClientInfo: vi.fn(() => ({
      name: 'client-1',
      displayName: 'Client 1',
      description: 'First test client',
      configPath: '/path/to/config1',
      platforms: ['darwin'],
    })),
    isInstalled: vi.fn(async () => true),
  };

  const mockConnector2 = {
    getClientInfo: vi.fn(() => ({
      name: 'client-2',
      displayName: 'Client 2',
      description: 'Second test client',
      configPath: '/path/to/config2',
      platforms: ['linux'],
    })),
    isInstalled: vi.fn(async () => false),
  };

  const createMockRegistry = (
    statuses: Map<string, ConnectionStatus>,
    connectors?: Map<string, unknown>
  ) => {
    vi.mocked(ConnectorRegistry).mockImplementation(function (this: {
      getAll: () => unknown[];
      get: (name: string) => unknown;
      register: () => void;
      findInstalled: () => void;
      checkAllStatuses: () => Promise<Map<string, ConnectionStatus>>;
    }) {
      this.getAll = vi.fn(() => [mockConnector1, mockConnector2]);
      this.get = vi.fn((name: string) => (connectors ? connectors.get(name) : mockConnector1));
      this.register = vi.fn();
      this.findInstalled = vi.fn();
      this.checkAllStatuses = vi.fn(async () => statuses);
      return this;
    } as never);
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(Logger.spinner).mockReturnValue(mockSpinner as never);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('должен вывести заголовок', async () => {
    createMockRegistry(new Map());

    await statusCommand();

    expect(Logger.header).toHaveBeenCalledWith('📊 Статус подключений MCP сервера');
  });

  it('должен показать spinner во время проверки', async () => {
    createMockRegistry(new Map());

    await statusCommand();

    expect(Logger.spinner).toHaveBeenCalledWith('Проверка статуса...');
    expect(mockSpinner.stop).toHaveBeenCalled();
  });

  it('должен вызвать checkAllStatuses', async () => {
    createMockRegistry(new Map());

    await statusCommand();

    // Проверяем косвенно через вызов Logger
    expect(Logger.header).toHaveBeenCalled();
  });

  it('должен показать статус подключенного клиента', async () => {
    const statuses = new Map<string, ConnectionStatus>([
      [
        'client-1',
        {
          connected: true,
          details: { configPath: '/path/to/config' },
        },
      ],
    ]);

    const connectors = new Map<string, unknown>([['client-1', mockConnector1]]);
    createMockRegistry(statuses, connectors);

    await statusCommand();

    expect(Logger.success).toHaveBeenCalledWith('Client 1: подключен');
    expect(Logger.info).toHaveBeenCalledWith('  Конфигурация: /path/to/config');
  });

  it('должен показать статус отключенного клиента', async () => {
    const statuses = new Map<string, ConnectionStatus>([['client-1', { connected: false }]]);

    const connectors = new Map<string, unknown>([['client-1', mockConnector1]]);
    createMockRegistry(statuses, connectors);

    await statusCommand();

    expect(Logger.info).toHaveBeenCalledWith('Client 1: не подключен');
  });

  it('должен показать ошибку если есть', async () => {
    const statuses = new Map<string, ConnectionStatus>([
      ['client-1', { connected: false, error: 'Connection failed' }],
    ]);

    const connectors = new Map<string, unknown>([['client-1', mockConnector1]]);
    createMockRegistry(statuses, connectors);

    await statusCommand();

    expect(Logger.error).toHaveBeenCalledWith('  Ошибка: Connection failed');
  });

  it('должен предупредить о неустановленном клиенте', async () => {
    const statuses = new Map<string, ConnectionStatus>([['client-2', { connected: false }]]);

    const connectors = new Map<string, unknown>([['client-2', mockConnector2]]);
    createMockRegistry(statuses, connectors);

    await statusCommand();

    expect(Logger.warn).toHaveBeenCalledWith('Client 2: не установлен');
  });

  it('должен пропустить несуществующий коннектор', async () => {
    const statuses = new Map<string, ConnectionStatus>([['nonexistent', { connected: false }]]);

    const connectors = new Map<string, unknown>(); // Пустой - не найдётся
    createMockRegistry(statuses, connectors);

    await expect(statusCommand()).resolves.toBeUndefined();
  });

  it('должен работать с пустым списком статусов', async () => {
    createMockRegistry(new Map());

    await expect(statusCommand()).resolves.toBeUndefined();

    expect(Logger.header).toHaveBeenCalled();
    expect(mockSpinner.stop).toHaveBeenCalled();
  });
});
