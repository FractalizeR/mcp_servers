/**
 * Unit тесты для ClaudeDesktopConnector
 *
 * Тестовые сценарии:
 * - getClientInfo() - возвращает корректную информацию о клиенте
 * - isInstalled() - проверка установки клиента
 * - getStatus() - проверка текущего статуса подключения
 * - connect() - подключение MCP сервера
 * - disconnect() - отключение MCP сервера
 * - validateConfig() - валидация конфигурации
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { MCPServerConfig } from '#cli/connectors/base/connector.interface.js';
import * as os from 'os';
import * as path from 'path';

// Hoisted моки - создаём ДО импорта модулей
const { FileManager } = vi.hoisted(() => {
  return {
    FileManager: {
      exists: vi.fn(),
      readJSON: vi.fn(),
      writeJSON: vi.fn(),
      ensureDir: vi.fn(),
    },
  };
});

// Mock FileManager
vi.mock('#cli/utils/file-manager.js', () => ({
  FileManager,
}));

// Импортируем ПОСЛЕ определения моков
import { ClaudeDesktopConnector } from '#cli/connectors/claude-desktop/claude-desktop.connector.js';

describe('ClaudeDesktopConnector', () => {
  let connector: ClaudeDesktopConnector;
  let mockConfig: MCPServerConfig;

  beforeEach(() => {
    // Очистить все моки перед каждым тестом
    vi.clearAllMocks();

    connector = new ClaudeDesktopConnector();

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
      expect(info.name).toBe('claude-desktop');
      expect(info.displayName).toBe('Claude Desktop');
      expect(info.description).toContain('Claude');
      expect(info.platforms).toEqual(['darwin', 'linux', 'win32']);
      expect(info.configPath).toBeDefined();
    });

    it('должен вернуть правильный путь к конфигу для текущей платформы', () => {
      // Act
      const info = connector.getClientInfo();

      // Assert
      const platform = os.platform();
      if (platform === 'darwin') {
        expect(info.configPath).toContain('Library/Application Support/Claude');
      } else if (platform === 'linux') {
        expect(info.configPath).toContain('.config/claude');
      } else {
        expect(info.configPath).toContain('Claude');
      }
    });
  });

  describe('isInstalled()', () => {
    it('должен вернуть true если конфиг директория существует', async () => {
      // Arrange
      FileManager.exists.mockResolvedValue(true);

      // Act
      const result = await connector.isInstalled();

      // Assert
      expect(result).toBe(true);
      expect(FileManager.exists).toHaveBeenCalledOnce();
    });

    it('должен вернуть false если конфиг директория не существует', async () => {
      // Arrange
      FileManager.exists.mockResolvedValue(false);

      // Act
      const result = await connector.isInstalled();

      // Assert
      expect(result).toBe(false);
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
      expect(status.error).toContain('не найден');
    });

    it('должен вернуть connected: true если сервер настроен', async () => {
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
      expect(status.details).toBeDefined();
      expect(status.details?.configPath).toBeDefined();
      expect(status.details?.metadata).toBeDefined();
    });

    it('должен вернуть connected: false если сервер не настроен', async () => {
      // Arrange
      FileManager.exists.mockResolvedValue(true);
      FileManager.readJSON.mockResolvedValue({
        mcpServers: {},
      });

      // Act
      const status = await connector.getStatus();

      // Assert
      expect(status.connected).toBe(false);
      expect(status.error).toBeUndefined();
    });

    it('должен обработать ошибку чтения конфига', async () => {
      // Arrange
      FileManager.exists.mockResolvedValue(true);
      FileManager.readJSON.mockRejectedValue(new Error('Read error'));

      // Act
      const status = await connector.getStatus();

      // Assert
      expect(status.connected).toBe(false);
      expect(status.error).toContain('Ошибка чтения конфига');
    });

    it('должен обработать конфиг без mcpServers', async () => {
      // Arrange
      FileManager.exists.mockResolvedValue(true);
      FileManager.readJSON.mockResolvedValue({});

      // Act
      const status = await connector.getStatus();

      // Assert
      expect(status.connected).toBe(false);
    });
  });

  describe('connect()', () => {
    it('должен создать директорию если она не существует', async () => {
      // Arrange
      FileManager.exists.mockResolvedValue(false);
      FileManager.ensureDir.mockResolvedValue(undefined);
      FileManager.writeJSON.mockResolvedValue(undefined);

      // Act
      await connector.connect(mockConfig);

      // Assert
      expect(FileManager.ensureDir).toHaveBeenCalled();
    });

    it('должен создать новый конфиг если файл не существует', async () => {
      // Arrange
      FileManager.exists.mockResolvedValue(false);
      FileManager.ensureDir.mockResolvedValue(undefined);
      FileManager.writeJSON.mockResolvedValue(undefined);

      // Act
      await connector.connect(mockConfig);

      // Assert
      expect(FileManager.writeJSON).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          mcpServers: expect.objectContaining({
            fractalizer_mcp_yandex_tracker: expect.objectContaining({
              command: 'node',
              args: expect.arrayContaining([expect.stringContaining('dist/index.js')]),
              env: expect.objectContaining({
                YANDEX_TRACKER_TOKEN: 'test-token',
                YANDEX_ORG_ID: 'test-org',
              }),
            }),
          }),
        })
      );
    });

    it('должен обновить существующий конфиг', async () => {
      // Arrange
      const existingConfig = {
        mcpServers: {
          'other-server': {
            command: 'other',
            args: [],
            env: {},
          },
        },
      };
      FileManager.exists.mockResolvedValue(true);
      FileManager.readJSON.mockResolvedValue(existingConfig);
      FileManager.ensureDir.mockResolvedValue(undefined);
      FileManager.writeJSON.mockResolvedValue(undefined);

      // Act
      await connector.connect(mockConfig);

      // Assert
      const writeCall = FileManager.writeJSON.mock.calls[0]!;
      const writtenConfig = writeCall[1];
      expect(writtenConfig.mcpServers.fractalizer_mcp_yandex_tracker).toBeDefined();
      expect(writtenConfig.mcpServers['other-server']).toBeDefined(); // Не удаляем другие серверы
    });

    it('должен сохранить все параметры конфигурации в env', async () => {
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
      const writeCall = FileManager.writeJSON.mock.calls[0]!;
      const writtenConfig = writeCall[1];
      const env = writtenConfig.mcpServers.fractalizer_mcp_yandex_tracker.env;

      expect(env.YANDEX_TRACKER_TOKEN).toBe('test-token');
      expect(env.YANDEX_ORG_ID).toBe('test-org');
      expect(env.YANDEX_TRACKER_API_BASE).toBe('https://custom.api');
      expect(env.LOG_LEVEL).toBe('debug');
      expect(env.REQUEST_TIMEOUT).toBe('10000');
    });

    it('должен использовать дефолтные значения если не указаны', async () => {
      // Arrange
      FileManager.exists.mockResolvedValue(false);
      FileManager.ensureDir.mockResolvedValue(undefined);
      FileManager.writeJSON.mockResolvedValue(undefined);

      const minimalConfig: MCPServerConfig = {
        token: 'test-token',
        orgId: 'test-org',
        projectPath: '/test/project',
      };

      // Act
      await connector.connect(minimalConfig);

      // Assert
      const writeCall = FileManager.writeJSON.mock.calls[0]!;
      const writtenConfig = writeCall[1];
      const env = writtenConfig.mcpServers.fractalizer_mcp_yandex_tracker.env;

      expect(env.YANDEX_TRACKER_API_BASE).toBe('https://api.tracker.yandex.net');
      expect(env.LOG_LEVEL).toBe('info');
      expect(env.REQUEST_TIMEOUT).toBe('30000');
    });

    it('должен построить правильный путь к server entry point', async () => {
      // Arrange
      FileManager.exists.mockResolvedValue(false);
      FileManager.ensureDir.mockResolvedValue(undefined);
      FileManager.writeJSON.mockResolvedValue(undefined);

      // Act
      await connector.connect(mockConfig);

      // Assert
      const writeCall = FileManager.writeJSON.mock.calls[0]!;
      const writtenConfig = writeCall[1];
      const args = writtenConfig.mcpServers.fractalizer_mcp_yandex_tracker.args;

      expect(args[0]).toBe(path.join(mockConfig.projectPath, 'dist/index.js'));
    });
  });

  describe('disconnect()', () => {
    it('должен ничего не делать если конфиг файл не существует', async () => {
      // Arrange
      FileManager.exists.mockResolvedValue(false);

      // Act
      await connector.disconnect();

      // Assert
      expect(FileManager.readJSON).not.toHaveBeenCalled();
      expect(FileManager.writeJSON).not.toHaveBeenCalled();
    });

    it('должен удалить MCP сервер из конфига', async () => {
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
      const writeCall = FileManager.writeJSON.mock.calls[0]!;
      const writtenConfig = writeCall[1];
      expect(writtenConfig.mcpServers.fractalizer_mcp_yandex_tracker).toBeUndefined();
      expect(writtenConfig.mcpServers['other-server']).toBeDefined(); // Не удаляем другие серверы
    });

    it('должен ничего не делать если MCP сервер не был настроен', async () => {
      // Arrange
      const existingConfig = {
        mcpServers: {
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

      // Assert - writeJSON НЕ вызывается, т.к. нечего удалять
      expect(FileManager.writeJSON).not.toHaveBeenCalled();
    });

    it('должен обработать конфиг без mcpServers', async () => {
      // Arrange
      const existingConfig = {};
      FileManager.exists.mockResolvedValue(true);
      FileManager.readJSON.mockResolvedValue(existingConfig);
      FileManager.writeJSON.mockResolvedValue(undefined);

      // Act
      await connector.disconnect();

      // Assert - не должно быть ошибок, writeJSON не вызывается
      expect(FileManager.writeJSON).not.toHaveBeenCalled();
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
