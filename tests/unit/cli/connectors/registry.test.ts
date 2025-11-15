/**
 * Unit тесты для ConnectorRegistry
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ConnectorRegistry } from '../../../../cli/connectors/registry.js';
import type {
  MCPConnector,
  ConnectionStatus,
} from '../../../../cli/connectors/base/connector.interface.js';

// Mock коннектор для тестов
class MockConnector implements MCPConnector {
  constructor(
    private name: string,
    private installed: boolean = false,
    private connected: boolean = false
  ) {}

  getClientInfo() {
    return {
      name: this.name,
      displayName: `Mock ${this.name}`,
      description: 'Mock connector for testing',
      configPath: '/mock/path',
      platforms: ['darwin', 'linux', 'win32'] as ('darwin' | 'linux' | 'win32')[],
    };
  }

  async isInstalled(): Promise<boolean> {
    return this.installed;
  }

  async getStatus(): Promise<ConnectionStatus> {
    return { connected: this.connected };
  }

  async connect(): Promise<void> {
    this.connected = true;
  }

  async disconnect(): Promise<void> {
    this.connected = false;
  }

  async validateConfig(): Promise<string[]> {
    return [];
  }
}

describe('ConnectorRegistry', () => {
  let registry: ConnectorRegistry;

  beforeEach(() => {
    // Создаём новый реестр для каждого теста
    registry = new ConnectorRegistry();
  });

  describe('constructor', () => {
    it('должен автоматически зарегистрировать все коннекторы', () => {
      const all = registry.getAll();

      expect(all.length).toBe(3); // ClaudeDesktop, ClaudeCode, Codex
    });

    it('должен зарегистрировать ClaudeDesktopConnector', () => {
      const connector = registry.get('claude-desktop');

      expect(connector).toBeDefined();
      expect(connector?.getClientInfo().name).toBe('claude-desktop');
    });

    it('должен зарегистрировать ClaudeCodeConnector', () => {
      const connector = registry.get('claude-code');

      expect(connector).toBeDefined();
      expect(connector?.getClientInfo().name).toBe('claude-code');
    });

    it('должен зарегистрировать CodexConnector', () => {
      const connector = registry.get('codex');

      expect(connector).toBeDefined();
      expect(connector?.getClientInfo().name).toBe('codex');
    });
  });

  describe('register', () => {
    it('должен зарегистрировать новый коннектор', () => {
      const mockConnector = new MockConnector('test-client');

      registry.register(mockConnector);

      const connector = registry.get('test-client');
      expect(connector).toBeDefined();
      expect(connector?.getClientInfo().name).toBe('test-client');
    });

    it('должен заменить существующий коннектор при повторной регистрации', () => {
      const mockConnector1 = new MockConnector('test-client', true);
      const mockConnector2 = new MockConnector('test-client', false);

      registry.register(mockConnector1);
      registry.register(mockConnector2);

      const connector = registry.get('test-client');
      expect(connector).toBe(mockConnector2);
    });
  });

  describe('get', () => {
    it('должен вернуть коннектор по имени', () => {
      const mockConnector = new MockConnector('test-client');
      registry.register(mockConnector);

      const connector = registry.get('test-client');

      expect(connector).toBe(mockConnector);
    });

    it('должен вернуть undefined для несуществующего коннектора', () => {
      const connector = registry.get('nonexistent-client');

      expect(connector).toBeUndefined();
    });
  });

  describe('getAll', () => {
    it('должен вернуть все зарегистрированные коннекторы', () => {
      const all = registry.getAll();

      expect(all.length).toBe(3); // Автоматически зарегистрированные
    });

    it('должен вернуть новые коннекторы после регистрации', () => {
      const mockConnector = new MockConnector('test-client');
      registry.register(mockConnector);

      const all = registry.getAll();

      expect(all.length).toBe(4); // 3 дефолтных + 1 новый
      expect(all).toContain(mockConnector);
    });
  });

  describe('findInstalled', () => {
    it('должен вернуть только установленные коннекторы', async () => {
      const installed1 = new MockConnector('installed-1', true);
      const installed2 = new MockConnector('installed-2', true);
      const notInstalled = new MockConnector('not-installed', false);

      registry.register(installed1);
      registry.register(installed2);
      registry.register(notInstalled);

      const result = await registry.findInstalled();

      expect(result.length).toBeGreaterThanOrEqual(2); // Как минимум 2 наших mock'а
      expect(result).toContain(installed1);
      expect(result).toContain(installed2);
      expect(result).not.toContain(notInstalled);
    });

    it('должен вернуть пустой массив если ничего не установлено', async () => {
      // Создаём пустой реестр
      const emptyRegistry = new ConnectorRegistry();
      // Удаляем все автоматически зарегистрированные коннекторы через mock
      vi.spyOn(emptyRegistry, 'getAll').mockReturnValue([]);
      vi.spyOn(emptyRegistry, 'findInstalled').mockResolvedValue([]);

      const result = await emptyRegistry.findInstalled();

      expect(result).toEqual([]);
    });

    it('должен вызвать isInstalled() для каждого коннектора', async () => {
      const mock1 = new MockConnector('mock-1', true);
      const mock2 = new MockConnector('mock-2', false);

      const spy1 = vi.spyOn(mock1, 'isInstalled');
      const spy2 = vi.spyOn(mock2, 'isInstalled');

      registry.register(mock1);
      registry.register(mock2);

      await registry.findInstalled();

      expect(spy1).toHaveBeenCalled();
      expect(spy2).toHaveBeenCalled();
    });
  });

  describe('checkAllStatuses', () => {
    it('должен вернуть статусы всех коннекторов', async () => {
      const connected = new MockConnector('connected-client', true, true);
      const disconnected = new MockConnector('disconnected-client', true, false);

      registry.register(connected);
      registry.register(disconnected);

      const statuses = await registry.checkAllStatuses();

      expect(statuses.size).toBeGreaterThanOrEqual(2);
      expect(statuses.get('connected-client')).toEqual({ connected: true });
      expect(statuses.get('disconnected-client')).toEqual({ connected: false });
    });

    it('должен вызвать getStatus() для каждого коннектора', async () => {
      const mock1 = new MockConnector('mock-1');
      const mock2 = new MockConnector('mock-2');

      const spy1 = vi.spyOn(mock1, 'getStatus');
      const spy2 = vi.spyOn(mock2, 'getStatus');

      registry.register(mock1);
      registry.register(mock2);

      await registry.checkAllStatuses();

      expect(spy1).toHaveBeenCalled();
      expect(spy2).toHaveBeenCalled();
    });

    it('должен включить статусы дефолтных коннекторов', async () => {
      const statuses = await registry.checkAllStatuses();

      expect(statuses.has('claude-desktop')).toBe(true);
      expect(statuses.has('claude-code')).toBe(true);
      expect(statuses.has('codex')).toBe(true);
    });
  });
});
