/**
 * Unit тесты для FileBasedConnector
 *
 * Тестовые сценарии:
 * - JSON формат с ключом mcpServers
 * - TOML формат с ключом mcp_servers
 * - Базовая функциональность getStatus/connect/disconnect
 * - Обработка ошибок
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { MCPServerConfig, MCPClientInfo } from '#cli/connectors/base/connector.interface.js';
import * as path from 'path';

// Hoisted моки
const { FileManager } = vi.hoisted(() => {
  return {
    FileManager: {
      exists: vi.fn(),
      readJSON: vi.fn(),
      writeJSON: vi.fn(),
      readTOML: vi.fn(),
      writeTOML: vi.fn(),
      ensureDir: vi.fn(),
    },
  };
});

// Mock FileManager
vi.mock('#cli/utils/file-manager.js', () => ({
  FileManager,
}));

// Импортируем ПОСЛЕ определения моков
import { FileBasedConnector } from '#cli/connectors/base/file-based-connector.js';

// Тестовая реализация JSON connector
class TestJSONConnector extends FileBasedConnector<'mcpServers', 'json'> {
  constructor(private configPath: string = '/test/.test/config.json') {
    super();
  }

  protected getConfigPath(): string {
    return this.configPath;
  }

  getClientInfo(): MCPClientInfo {
    return {
      name: 'test-json',
      displayName: 'Test JSON Connector',
      description: 'Test connector for JSON format',
      configPath: this.configPath,
      platforms: ['darwin', 'linux', 'win32'],
    };
  }
}

// Тестовая реализация TOML connector
class TestTOMLConnector extends FileBasedConnector<'mcp_servers', 'toml'> {
  constructor(private configPath: string = '/test/.test/config.toml') {
    super();
  }

  protected getConfigPath(): string {
    return this.configPath;
  }

  protected getServerKey(): 'mcp_servers' {
    return 'mcp_servers';
  }

  protected getConfigFormat(): 'toml' {
    return 'toml';
  }

  getClientInfo(): MCPClientInfo {
    return {
      name: 'test-toml',
      displayName: 'Test TOML Connector',
      description: 'Test connector for TOML format',
      configPath: this.configPath,
      platforms: ['darwin', 'linux', 'win32'],
    };
  }
}

describe('FileBasedConnector', () => {
  let mockConfig: MCPServerConfig;

  beforeEach(() => {
    vi.clearAllMocks();

    mockConfig = {
      token: 'test-token',
      orgId: 'test-org',
      projectPath: '/test/project',
      logLevel: 'info',
      requestTimeout: 5000,
    };
  });

  describe('JSON Connector (mcpServers)', () => {
    let connector: TestJSONConnector;

    beforeEach(() => {
      connector = new TestJSONConnector();
    });

    it('должен использовать readJSON/writeJSON для JSON формата', async () => {
      // Arrange
      FileManager.exists.mockResolvedValue(false);
      FileManager.ensureDir.mockResolvedValue(undefined);
      FileManager.writeJSON.mockResolvedValue(undefined);

      // Act
      await connector.connect(mockConfig);

      // Assert
      expect(FileManager.writeJSON).toHaveBeenCalledOnce();
      expect(FileManager.writeTOML).not.toHaveBeenCalled();
    });

    it('должен использовать ключ mcpServers для JSON', async () => {
      // Arrange
      FileManager.exists.mockResolvedValue(false);
      FileManager.ensureDir.mockResolvedValue(undefined);
      FileManager.writeJSON.mockResolvedValue(undefined);

      // Act
      await connector.connect(mockConfig);

      // Assert
      expect(FileManager.writeJSON.mock.calls).toHaveLength(1);
      const writeCall = FileManager.writeJSON.mock.calls[0];
      const writtenConfig = writeCall[1];
      expect(writtenConfig).toHaveProperty('mcpServers');
      expect(writtenConfig.mcpServers).toBeDefined();
    });

    it('должен корректно читать статус из JSON', async () => {
      // Arrange
      FileManager.exists.mockResolvedValue(true);
      FileManager.readJSON.mockResolvedValue({
        mcpServers: {
          fractalizer_mcp_yandex_tracker: {
            command: 'node',
            args: ['/path/to/server.js'],
            env: { TOKEN: 'test' },
          },
        },
      });

      // Act
      const status = await connector.getStatus();

      // Assert
      expect(status.connected).toBe(true);
      expect(FileManager.readJSON).toHaveBeenCalledOnce();
    });

    it('должен корректно удалять из JSON конфига', async () => {
      // Arrange
      const existingConfig = {
        mcpServers: {
          fractalizer_mcp_yandex_tracker: {
            command: 'node',
            args: [],
            env: {},
          },
        },
      };
      FileManager.exists.mockResolvedValue(true);
      FileManager.readJSON.mockResolvedValue(existingConfig);
      FileManager.writeJSON.mockResolvedValue(undefined);

      // Act
      await connector.disconnect();

      // Assert
      expect(FileManager.writeJSON.mock.calls).toHaveLength(1);
      const writeCall = FileManager.writeJSON.mock.calls[0];
      const writtenConfig = writeCall[1];
      expect(writtenConfig.mcpServers.fractalizer_mcp_yandex_tracker).toBeUndefined();
    });
  });

  describe('TOML Connector (mcp_servers)', () => {
    let connector: TestTOMLConnector;

    beforeEach(() => {
      connector = new TestTOMLConnector();
    });

    it('должен использовать readTOML/writeTOML для TOML формата', async () => {
      // Arrange
      FileManager.exists.mockResolvedValue(false);
      FileManager.ensureDir.mockResolvedValue(undefined);
      FileManager.writeTOML.mockResolvedValue(undefined);

      // Act
      await connector.connect(mockConfig);

      // Assert
      expect(FileManager.writeTOML).toHaveBeenCalledOnce();
      expect(FileManager.writeJSON).not.toHaveBeenCalled();
    });

    it('должен использовать ключ mcp_servers для TOML', async () => {
      // Arrange
      FileManager.exists.mockResolvedValue(false);
      FileManager.ensureDir.mockResolvedValue(undefined);
      FileManager.writeTOML.mockResolvedValue(undefined);

      // Act
      await connector.connect(mockConfig);

      // Assert
      expect(FileManager.writeTOML.mock.calls).toHaveLength(1);
      const writeCall = FileManager.writeTOML.mock.calls[0];
      const writtenConfig = writeCall[1];
      expect(writtenConfig).toHaveProperty('mcp_servers');
      expect(writtenConfig.mcp_servers).toBeDefined();
    });

    it('должен корректно читать статус из TOML', async () => {
      // Arrange
      FileManager.exists.mockResolvedValue(true);
      FileManager.readTOML.mockResolvedValue({
        mcp_servers: {
          fractalizer_mcp_yandex_tracker: {
            command: 'node',
            args: ['/path/to/server.js'],
            env: { TOKEN: 'test' },
          },
        },
      });

      // Act
      const status = await connector.getStatus();

      // Assert
      expect(status.connected).toBe(true);
      expect(FileManager.readTOML).toHaveBeenCalledOnce();
    });

    it('должен корректно удалять из TOML конфига', async () => {
      // Arrange
      const existingConfig = {
        mcp_servers: {
          fractalizer_mcp_yandex_tracker: {
            command: 'node',
            args: [],
            env: {},
          },
        },
      };
      FileManager.exists.mockResolvedValue(true);
      FileManager.readTOML.mockResolvedValue(existingConfig);
      FileManager.writeTOML.mockResolvedValue(undefined);

      // Act
      await connector.disconnect();

      // Assert
      expect(FileManager.writeTOML.mock.calls).toHaveLength(1);
      const writeCall = FileManager.writeTOML.mock.calls[0];
      const writtenConfig = writeCall[1];
      expect(writtenConfig.mcp_servers.fractalizer_mcp_yandex_tracker).toBeUndefined();
    });
  });

  describe('Общая функциональность', () => {
    let connector: TestJSONConnector;

    beforeEach(() => {
      connector = new TestJSONConnector();
    });

    it('isInstalled должен проверять существование config директории', async () => {
      // Arrange
      FileManager.exists.mockResolvedValue(true);

      // Act
      const result = await connector.isInstalled();

      // Assert
      expect(result).toBe(true);
      expect(FileManager.exists).toHaveBeenCalledWith('/test/.test');
    });

    it('connect должен создавать директорию если не существует', async () => {
      // Arrange
      FileManager.exists.mockResolvedValue(false);
      FileManager.ensureDir.mockResolvedValue(undefined);
      FileManager.writeJSON.mockResolvedValue(undefined);

      // Act
      await connector.connect(mockConfig);

      // Assert
      expect(FileManager.ensureDir).toHaveBeenCalledWith('/test/.test');
    });

    it('connect должен сохранять все env переменные', async () => {
      // Arrange
      FileManager.exists.mockResolvedValue(false);
      FileManager.ensureDir.mockResolvedValue(undefined);
      FileManager.writeJSON.mockResolvedValue(undefined);

      const fullConfig: MCPServerConfig = {
        token: 'test-token',
        orgId: 'test-org',
        projectPath: '/test/project',
        apiBase: 'https://custom.api',
        logLevel: 'debug',
        requestTimeout: 10000,
      };

      // Act
      await connector.connect(fullConfig);

      // Assert
      expect(FileManager.writeJSON.mock.calls).toHaveLength(1);
      const writeCall = FileManager.writeJSON.mock.calls[0];
      const writtenConfig = writeCall[1];
      const env = writtenConfig.mcpServers.fractalizer_mcp_yandex_tracker.env;

      expect(env.YANDEX_TRACKER_TOKEN).toBe('test-token');
      expect(env.YANDEX_ORG_ID).toBe('test-org');
      expect(env.YANDEX_TRACKER_API_BASE).toBe('https://custom.api');
      expect(env.LOG_LEVEL).toBe('debug');
      expect(env.REQUEST_TIMEOUT).toBe('10000');
    });

    it('getStatus должен возвращать ошибку если файл не найден', async () => {
      // Arrange
      FileManager.exists.mockResolvedValue(false);

      // Act
      const status = await connector.getStatus();

      // Assert
      expect(status.connected).toBe(false);
      expect(status.error).toContain('не найден');
    });

    it('disconnect должен не делать ничего если файл не существует', async () => {
      // Arrange
      FileManager.exists.mockResolvedValue(false);

      // Act
      await connector.disconnect();

      // Assert
      expect(FileManager.readJSON).not.toHaveBeenCalled();
      expect(FileManager.writeJSON).not.toHaveBeenCalled();
    });

    it('должен построить правильный путь к server entry point', async () => {
      // Arrange
      FileManager.exists.mockResolvedValue(false);
      FileManager.ensureDir.mockResolvedValue(undefined);
      FileManager.writeJSON.mockResolvedValue(undefined);

      // Act
      await connector.connect(mockConfig);

      // Assert
      expect(FileManager.writeJSON.mock.calls).toHaveLength(1);
      const writeCall = FileManager.writeJSON.mock.calls[0];
      const writtenConfig = writeCall[1];
      const args = writtenConfig.mcpServers.fractalizer_mcp_yandex_tracker.args;

      expect(args[0]).toBe(path.join(mockConfig.projectPath, 'dist/index.js'));
    });

    it('должен сохранять другие серверы при disconnect', async () => {
      // Arrange
      const existingConfig = {
        mcpServers: {
          fractalizer_mcp_yandex_tracker: {
            command: 'node',
            args: [],
            env: {},
          },
          'other-server': {
            command: 'other',
            args: [],
            env: {},
          },
        },
      };
      FileManager.exists.mockResolvedValue(true);
      FileManager.readJSON.mockResolvedValue(existingConfig);
      FileManager.writeJSON.mockResolvedValue(undefined);

      // Act
      await connector.disconnect();

      // Assert
      expect(FileManager.writeJSON.mock.calls).toHaveLength(1);
      const writeCall = FileManager.writeJSON.mock.calls[0];
      const writtenConfig = writeCall[1];
      expect(writtenConfig.mcpServers['other-server']).toBeDefined();
    });
  });
});
