/**
 * Unit тесты для ConnectorRegistry
 *
 * Тестовые сценарии:
 * - constructor() - автоматическая регистрация всех коннекторов
 * - register() - регистрация нового коннектора
 * - get() - получение коннектора по имени
 * - getAll() - получение всех коннекторов
 * - findInstalled() - поиск установленных клиентов
 * - checkAllStatuses() - проверка статуса всех клиентов
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ConnectorRegistry } from '@cli/connectors/registry.js';
import type { MCPConnector } from '@cli/connectors/base/connector.interface.js';

// Mock зависимостей коннекторов
vi.mock('@cli/utils/command-executor.js', () => ({
  CommandExecutor: {
    isCommandAvailable: vi.fn().mockReturnValue(false),
    exec: vi.fn(),
    execInteractive: vi.fn(),
  },
}));

vi.mock('@cli/utils/file-manager.js', () => ({
  FileManager: {
    exists: vi.fn().mockResolvedValue(false),
    readJSON: vi.fn(),
    writeJSON: vi.fn(),
    readTOML: vi.fn(),
    writeTOML: vi.fn(),
    ensureDir: vi.fn(),
  },
}));

describe('ConnectorRegistry', () => {
  let registry: ConnectorRegistry;

  beforeEach(() => {
    vi.clearAllMocks();
    registry = new ConnectorRegistry();
  });

  describe('constructor()', () => {
    it('должен автоматически зарегистрировать все коннекторы', () => {
      // Act
      const all = registry.getAll();

      // Assert
      expect(all).toHaveLength(3);
      const names = all.map((c) => c.getClientInfo().name);
      expect(names).toContain('claude-desktop');
      expect(names).toContain('claude-code');
      expect(names).toContain('codex');
    });
  });

  describe('register()', () => {
    it('должен зарегистрировать коннектор', () => {
      // Arrange
      const mockConnector: MCPConnector = {
        getClientInfo: () => ({
          name: 'test-connector',
          displayName: 'Test Connector',
          description: 'Test',
          configPath: '/test',
          platforms: ['linux'],
        }),
        isInstalled: async () => false,
        getStatus: async () => ({ connected: false }),
        connect: async () => {},
        disconnect: async () => {},
        validateConfig: async () => [],
      };

      // Act
      registry.register(mockConnector);

      // Assert
      const connector = registry.get('test-connector');
      expect(connector).toBeDefined();
      expect(connector?.getClientInfo().name).toBe('test-connector');
    });

    it('должен перезаписать существующий коннектор при регистрации с тем же именем', () => {
      // Arrange
      const mockConnector1: MCPConnector = {
        getClientInfo: () => ({
          name: 'test-connector',
          displayName: 'Test 1',
          description: 'Test 1',
          configPath: '/test1',
          platforms: ['linux'],
        }),
        isInstalled: async () => false,
        getStatus: async () => ({ connected: false }),
        connect: async () => {},
        disconnect: async () => {},
        validateConfig: async () => [],
      };

      const mockConnector2: MCPConnector = {
        getClientInfo: () => ({
          name: 'test-connector',
          displayName: 'Test 2',
          description: 'Test 2',
          configPath: '/test2',
          platforms: ['linux'],
        }),
        isInstalled: async () => false,
        getStatus: async () => ({ connected: false }),
        connect: async () => {},
        disconnect: async () => {},
        validateConfig: async () => [],
      };

      // Act
      registry.register(mockConnector1);
      registry.register(mockConnector2);

      // Assert
      const connector = registry.get('test-connector');
      expect(connector?.getClientInfo().displayName).toBe('Test 2');
    });
  });

  describe('get()', () => {
    it('должен вернуть коннектор по имени', () => {
      // Act
      const connector = registry.get('claude-desktop');

      // Assert
      expect(connector).toBeDefined();
      expect(connector?.getClientInfo().name).toBe('claude-desktop');
    });

    it('должен вернуть undefined для несуществующего коннектора', () => {
      // Act
      const connector = registry.get('non-existent');

      // Assert
      expect(connector).toBeUndefined();
    });
  });

  describe('getAll()', () => {
    it('должен вернуть все зарегистрированные коннекторы', () => {
      // Act
      const connectors = registry.getAll();

      // Assert
      expect(connectors).toHaveLength(3);
    });
  });

  describe('findInstalled()', () => {
    it('должен вернуть пустой массив если нет установленных коннекторов', async () => {
      // CommandExecutor.isCommandAvailable мокирован как false по умолчанию

      // Act
      const installed = await registry.findInstalled();

      // Assert
      expect(installed).toHaveLength(0);
    });
  });

  describe('checkAllStatuses()', () => {
    it('должен проверить статус всех коннекторов', async () => {
      // Act
      const statuses = await registry.checkAllStatuses();

      // Assert
      expect(statuses.size).toBe(3);
      expect(statuses.get('claude-desktop')).toBeDefined();
      expect(statuses.get('claude-code')).toBeDefined();
      expect(statuses.get('codex')).toBeDefined();

      // Все коннекторы должны вернуть connected: false, т.к. моки возвращают false
      expect(statuses.get('claude-desktop')?.connected).toBe(false);
      expect(statuses.get('claude-code')?.connected).toBe(false);
      expect(statuses.get('codex')?.connected).toBe(false);
    });
  });
});
