/**
 * Unit тесты для CodexConnector
 *
 * Тестовые сценарии:
 * - getClientInfo() - возвращает корректную информацию о клиенте
 * - isInstalled() - проверка установки клиента через CommandExecutor
 * - getStatus() - проверка текущего статуса через TOML конфиг
 * - connect() - подключение MCP сервера через 'codex mcp add'
 * - disconnect() - отключение MCP сервера через удаление из TOML
 * - validateConfig() - валидация конфигурации
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { MCPServerConfig } from '@cli/connectors/base/connector.interface.js';
import { MCP_SERVER_NAME } from '@constants';
import * as os from 'os';
import * as path from 'path';

// Hoisted моки - создаём ДО импорта модулей
const { CommandExecutor, FileManager } = vi.hoisted(() => {
  return {
    CommandExecutor: {
      isCommandAvailable: vi.fn(),
      execInteractive: vi.fn(),
    },
    FileManager: {
      exists: vi.fn(),
      readTOML: vi.fn(),
      writeTOML: vi.fn(),
    },
  };
});

// Mock CommandExecutor
vi.mock('@cli/utils/command-executor.js', () => ({
  CommandExecutor,
}));

// Mock FileManager
vi.mock('@cli/utils/file-manager.js', () => ({
  FileManager,
}));

// Импортируем ПОСЛЕ определения моков
import { CodexConnector } from '@cli/connectors/codex/codex.connector.js';

describe('CodexConnector', () => {
  let connector: CodexConnector;
  let mockConfig: MCPServerConfig;

  beforeEach(() => {
    // Очистить все моки перед каждым тестом
    vi.clearAllMocks();

    connector = new CodexConnector();

    mockConfig = {
      token: 'test-token',
      orgId: 'test-org',
      projectPath: '/test/project',
      logLevel: 'info',
      requestTimeout: 5000,
    };
  });

  describe('getClientInfo()', () => {
    it('должен вернуть корректную информацию о клиенте', () => {
      // Act
      const info = connector.getClientInfo();

      // Assert
      expect(info.name).toBe('codex');
      expect(info.displayName).toBe('Codex');
      expect(info.description).toContain('Codex');
      expect(info.platforms).toEqual(['darwin', 'linux', 'win32']);
      expect(info.checkCommand).toBe('codex --version');
      expect(info.configPath).toBe(path.join(os.homedir(), '.codex/config.toml'));
    });
  });

  describe('isInstalled()', () => {
    it('должен вернуть true если команда codex доступна', async () => {
      // Arrange
      CommandExecutor.isCommandAvailable.mockReturnValue(true);

      // Act
      const result = await connector.isInstalled();

      // Assert
      expect(result).toBe(true);
      expect(CommandExecutor.isCommandAvailable).toHaveBeenCalledWith('codex');
    });

    it('должен вернуть false если команда codex недоступна', async () => {
      // Arrange
      CommandExecutor.isCommandAvailable.mockReturnValue(false);

      // Act
      const result = await connector.isInstalled();

      // Assert
      expect(result).toBe(false);
      expect(CommandExecutor.isCommandAvailable).toHaveBeenCalledWith('codex');
    });
  });

  describe('getStatus()', () => {
    it('должен вернуть connected: false если конфиг файл не существует', async () => {
      // Arrange
      FileManager.exists.mockResolvedValue(false);

      // Act
      const status = await connector.getStatus();

      // Assert
      expect(status.connected).toBe(false);
      expect(FileManager.exists).toHaveBeenCalled();
    });

    it('должен вернуть connected: true если сервер настроен', async () => {
      // Arrange
      FileManager.exists.mockResolvedValue(true);
      FileManager.readTOML.mockResolvedValue({
        mcp_servers: {
          [MCP_SERVER_NAME]: {
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
      expect(status.details).toBeDefined();
      expect(status.details?.configPath).toContain('.codex/config.toml');
      expect(status.details?.metadata).toBeDefined();
    });

    it('должен вернуть connected: false если сервер не настроен', async () => {
      // Arrange
      FileManager.exists.mockResolvedValue(true);
      FileManager.readTOML.mockResolvedValue({
        mcp_servers: {},
      });

      // Act
      const status = await connector.getStatus();

      // Assert
      expect(status.connected).toBe(false);
    });

    it('должен вернуть connected: false если mcp_servers отсутствует', async () => {
      // Arrange
      FileManager.exists.mockResolvedValue(true);
      FileManager.readTOML.mockResolvedValue({});

      // Act
      const status = await connector.getStatus();

      // Assert
      expect(status.connected).toBe(false);
    });

    it('должен обработать ошибку чтения конфига', async () => {
      // Arrange
      FileManager.exists.mockResolvedValue(true);
      FileManager.readTOML.mockRejectedValue(new Error('Read error'));

      // Act
      const status = await connector.getStatus();

      // Assert
      expect(status.connected).toBe(false);
      expect(status.error).toContain('Ошибка чтения конфига');
      expect(status.error).toContain('Read error');
    });
  });

  describe('connect()', () => {
    it('должен вызвать codex mcp add с корректными аргументами (минимальный конфиг)', async () => {
      // Arrange
      const minimalConfig: MCPServerConfig = {
        token: 'test-token',
        orgId: 'test-org',
        projectPath: '/test/project',
      };
      CommandExecutor.execInteractive.mockResolvedValue(undefined);

      // Act
      await connector.connect(minimalConfig);

      // Assert
      expect(CommandExecutor.execInteractive).toHaveBeenCalledWith('codex', [
        'mcp',
        'add',
        MCP_SERVER_NAME,
        '--env',
        'YANDEX_TRACKER_TOKEN=test-token',
        '--env',
        'YANDEX_ORG_ID=test-org',
        '--env',
        'YANDEX_TRACKER_API_BASE=https://api.tracker.yandex.net',
        '--env',
        'LOG_LEVEL=info',
        '--env',
        'REQUEST_TIMEOUT=30000',
        '--',
        'node',
        '/test/project/dist/index.js',
      ]);
    });

    it('должен вызвать codex mcp add с полным конфигом', async () => {
      // Arrange
      const fullConfig: MCPServerConfig = {
        token: 'test-token',
        orgId: 'test-org',
        projectPath: '/test/project',
        apiBase: 'https://custom.api',
        logLevel: 'debug',
        requestTimeout: 10000,
      };
      CommandExecutor.execInteractive.mockResolvedValue(undefined);

      // Act
      await connector.connect(fullConfig);

      // Assert
      expect(CommandExecutor.execInteractive).toHaveBeenCalledWith('codex', [
        'mcp',
        'add',
        MCP_SERVER_NAME,
        '--env',
        'YANDEX_TRACKER_TOKEN=test-token',
        '--env',
        'YANDEX_ORG_ID=test-org',
        '--env',
        'YANDEX_TRACKER_API_BASE=https://custom.api',
        '--env',
        'LOG_LEVEL=debug',
        '--env',
        'REQUEST_TIMEOUT=10000',
        '--',
        'node',
        '/test/project/dist/index.js',
      ]);
    });

    it('должен пробросить ошибку если команда не выполнена', async () => {
      // Arrange
      CommandExecutor.execInteractive.mockRejectedValue(new Error('Command failed'));

      // Act & Assert
      await expect(connector.connect(mockConfig)).rejects.toThrow('Command failed');
    });

    it('должен использовать правильный путь к entry point', async () => {
      // Arrange
      const configWithPath: MCPServerConfig = {
        token: 'test-token',
        orgId: 'test-org',
        projectPath: '/custom/path/to/project',
      };
      CommandExecutor.execInteractive.mockResolvedValue(undefined);

      // Act
      await connector.connect(configWithPath);

      // Assert
      const callArgs = CommandExecutor.execInteractive.mock.calls[0];
      const args = callArgs[1];
      expect(args[args.length - 1]).toBe('/custom/path/to/project/dist/index.js');
    });
  });

  describe('disconnect()', () => {
    it('должен ничего не делать если конфиг файл не существует', async () => {
      // Arrange
      FileManager.exists.mockResolvedValue(false);

      // Act
      await connector.disconnect();

      // Assert
      expect(FileManager.readTOML).not.toHaveBeenCalled();
      expect(FileManager.writeTOML).not.toHaveBeenCalled();
    });

    it('должен удалить MCP сервер из TOML конфига', async () => {
      // Arrange
      const existingConfig = {
        mcp_servers: {
          [MCP_SERVER_NAME]: {
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
      FileManager.readTOML.mockResolvedValue(existingConfig);
      FileManager.writeTOML.mockResolvedValue(undefined);

      // Act
      await connector.disconnect();

      // Assert
      expect(FileManager.readTOML).toHaveBeenCalled();
      expect(FileManager.writeTOML).toHaveBeenCalled();

      const writeCall = FileManager.writeTOML.mock.calls[0];
      const writtenConfig = writeCall[1];
      expect(writtenConfig.mcp_servers[MCP_SERVER_NAME]).toBeUndefined();
      expect(writtenConfig.mcp_servers['other-server']).toBeDefined(); // Не удаляем другие серверы
    });

    it('должен ничего не делать если MCP сервер не был настроен', async () => {
      // Arrange
      const existingConfig = {
        mcp_servers: {
          'other-server': {
            command: 'other',
            args: [],
            env: {},
          },
        },
      };
      FileManager.exists.mockResolvedValue(true);
      FileManager.readTOML.mockResolvedValue(existingConfig);

      // Act
      await connector.disconnect();

      // Assert
      // writeTOML НЕ вызывается, т.к. нечего удалять
      expect(FileManager.writeTOML).not.toHaveBeenCalled();
    });

    it('должен обработать конфиг без mcp_servers', async () => {
      // Arrange
      const existingConfig = {};
      FileManager.exists.mockResolvedValue(true);
      FileManager.readTOML.mockResolvedValue(existingConfig);

      // Act
      await connector.disconnect();

      // Assert - не должно быть ошибок, writeTOML не вызывается
      expect(FileManager.writeTOML).not.toHaveBeenCalled();
    });
  });

  describe('validateConfig()', () => {
    it('должен вернуть пустой массив для валидной конфигурации', async () => {
      // Act
      const errors = await connector.validateConfig(mockConfig);

      // Assert
      expect(errors).toEqual([]);
    });

    it('должен вернуть ошибку если token пустой', async () => {
      // Arrange
      const invalidConfig = { ...mockConfig, token: '' };

      // Act
      const errors = await connector.validateConfig(invalidConfig);

      // Assert
      expect(errors).toContain('OAuth токен обязателен');
    });

    it('должен вернуть ошибку если orgId пустой', async () => {
      // Arrange
      const invalidConfig = { ...mockConfig, orgId: '' };

      // Act
      const errors = await connector.validateConfig(invalidConfig);

      // Assert
      expect(errors).toContain('ID организации обязателен');
    });

    it('должен вернуть ошибку если projectPath пустой', async () => {
      // Arrange
      const invalidConfig = { ...mockConfig, projectPath: '' };

      // Act
      const errors = await connector.validateConfig(invalidConfig);

      // Assert
      expect(errors).toContain('Путь к проекту обязателен');
    });

    it('должен вернуть все ошибки для невалидной конфигурации', async () => {
      // Arrange
      const invalidConfig: MCPServerConfig = {
        token: '',
        orgId: '',
        projectPath: '',
      };

      // Act
      const errors = await connector.validateConfig(invalidConfig);

      // Assert
      expect(errors).toHaveLength(3);
    });

    it('должен принять опциональные параметры', async () => {
      // Arrange
      const configWithOptional: MCPServerConfig = {
        token: 'test-token',
        orgId: 'test-org',
        projectPath: '/test/project',
        apiBase: 'https://custom.api',
        logLevel: 'debug',
        requestTimeout: 10000,
      };

      // Act
      const errors = await connector.validateConfig(configWithOptional);

      // Assert
      expect(errors).toEqual([]);
    });
  });
});
