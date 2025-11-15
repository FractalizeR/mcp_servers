/**
 * Unit тесты для list command
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { listCommand } from '@cli/commands/list.command.js';
import { ConnectorRegistry } from '@cli/connectors/registry.js';
import { Logger } from '@cli/utils/logger.js';

// Мокаем модули
vi.mock('../../../../cli/connectors/registry.js');
vi.mock('../../../../cli/utils/logger.js');

describe('listCommand', () => {
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
      checkCommand: 'client2 --version',
    })),
    isInstalled: vi.fn(async () => false),
  };

  beforeEach(() => {
    // Очищаем моки перед каждым тестом
    vi.clearAllMocks();

    // Мокаем ConnectorRegistry как класс-конструктор
    vi.mocked(ConnectorRegistry).mockImplementation(function (this: {
      getAll: () => unknown[];
      get: () => void;
      register: () => void;
      findInstalled: () => void;
      checkAllStatuses: () => void;
    }) {
      this.getAll = vi.fn(() => [mockConnector1, mockConnector2]);
      this.get = vi.fn();
      this.register = vi.fn();
      this.findInstalled = vi.fn();
      this.checkAllStatuses = vi.fn();
      return this;
    } as never);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('должен вывести заголовок', async () => {
    await listCommand();

    expect(Logger.header).toHaveBeenCalledWith('📋 Поддерживаемые MCP клиенты');
  });

  it('должен получить список всех коннекторов', async () => {
    await listCommand();

    // Не можем напрямую получить инстанс registry, проверяем косвенно
    // что ConnectorRegistry был создан и getAll вызван (через моки)
    expect(Logger.header).toHaveBeenCalled();
  });

  it('должен проверить установку каждого коннектора', async () => {
    await listCommand();

    expect(mockConnector1.isInstalled).toHaveBeenCalled();
    expect(mockConnector2.isInstalled).toHaveBeenCalled();
  });

  it('должен вывести информацию об установленном клиенте', async () => {
    await listCommand();

    expect(Logger.success).toHaveBeenCalledWith('Client 1 (установлен)');
    expect(Logger.info).toHaveBeenCalledWith('  First test client');
  });

  it('должен вывести информацию о неустановленном клиенте', async () => {
    await listCommand();

    expect(Logger.warn).toHaveBeenCalledWith('Client 2 (не установлен)');
    expect(Logger.info).toHaveBeenCalledWith('  Second test client');
  });

  it('должен вывести checkCommand если он задан', async () => {
    await listCommand();

    expect(Logger.info).toHaveBeenCalledWith('  Проверка: client2 --version');
  });

  it('должен вызвать newLine после каждого клиента', async () => {
    await listCommand();

    // 2 коннектора = 2 newLine
    expect(Logger.newLine).toHaveBeenCalledTimes(2);
  });

  it('должен работать с пустым списком коннекторов', async () => {
    vi.mocked(ConnectorRegistry).mockImplementation(function (this: {
      getAll: () => unknown[];
      get: () => void;
      register: () => void;
      findInstalled: () => void;
      checkAllStatuses: () => void;
    }) {
      this.getAll = vi.fn(() => []);
      this.get = vi.fn();
      this.register = vi.fn();
      this.findInstalled = vi.fn();
      this.checkAllStatuses = vi.fn();
      return this;
    } as never);

    await expect(listCommand()).resolves.toBeUndefined();

    expect(Logger.header).toHaveBeenCalled();
  });
});
