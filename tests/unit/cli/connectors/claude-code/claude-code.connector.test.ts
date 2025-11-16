/**
 * Unit тесты для ClaudeCodeConnector
 *
 * Тестовые сценарии:
 * - getClientInfo() - возвращает корректную информацию о клиенте
 * - isInstalled() - проверка установки клиента через CommandExecutor
 * - getStatus() - проверка текущего статуса через 'claude mcp list'
 * - connect() - подключение MCP сервера через 'claude mcp add'
 * - disconnect() - отключение MCP сервера через 'claude mcp remove'
 * - validateConfig() - валидация конфигурации
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ClaudeCodeConnector } from '@cli/connectors/claude-code/claude-code.connector.js';
import type { MCPServerConfig } from '@cli/connectors/base/connector.interface.js';
import { MCP_SERVER_NAME } from '@constants';

// Mock CommandExecutor
vi.mock('@cli/utils/command-executor.js', () => ({
  CommandExecutor: {
    isCommandAvailable: vi.fn(),
    exec: vi.fn(),
    execInteractive: vi.fn(),
  },
}));

// Импортируем CommandExecutor после мока
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Динамический импорт модуля для тестирования
const { CommandExecutor } = (await import('@cli/utils/command-executor.js')) as any;

describe('ClaudeCodeConnector', () => {
  let connector: ClaudeCodeConnector;
  let mockConfig: MCPServerConfig;

  beforeEach(() => {
    // Очистить все моки перед каждым тестом
    vi.clearAllMocks();

    connector = new ClaudeCodeConnector();

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
      expect(info.name).toBe('claude-code');
      expect(info.displayName).toBe('Claude Code');
      expect(info.description).toContain('Claude Code');
      expect(info.platforms).toEqual(['darwin', 'linux', 'win32']);
      expect(info.checkCommand).toBe('claude --version');
      expect(info.configPath).toBe('managed-by-cli');
    });
  });

  describe('isInstalled()', () => {
    it('должен вернуть true если команда claude доступна', async () => {
      // Arrange
      CommandExecutor.isCommandAvailable.mockReturnValue(true);

      // Act
      const result = await connector.isInstalled();

      // Assert
      expect(result).toBe(true);
      expect(CommandExecutor.isCommandAvailable).toHaveBeenCalledWith('claude');
    });

    it('должен вернуть false если команда claude недоступна', async () => {
      // Arrange
      CommandExecutor.isCommandAvailable.mockReturnValue(false);

      // Act
      const result = await connector.isInstalled();

      // Assert
      expect(result).toBe(false);
      expect(CommandExecutor.isCommandAvailable).toHaveBeenCalledWith('claude');
    });
  });

  describe('getStatus()', () => {
    it('должен вернуть connected: true если сервер найден в списке', async () => {
      // Arrange
      const mcpListOutput = `
Available MCP servers:
- ${MCP_SERVER_NAME}
- other-server
      `.trim();
      CommandExecutor.exec.mockReturnValue(mcpListOutput);

      // Act
      const status = await connector.getStatus();

      // Assert
      expect(status.connected).toBe(true);
      expect(status.details).toBeDefined();
      expect(status.details?.configPath).toBe('managed by claude mcp');
      expect(CommandExecutor.exec).toHaveBeenCalledWith('claude mcp list');
    });

    it('должен вернуть connected: false если сервер не найден в списке', async () => {
      // Arrange
      const mcpListOutput = `
Available MCP servers:
- other-server
- another-server
      `.trim();
      CommandExecutor.exec.mockReturnValue(mcpListOutput);

      // Act
      const status = await connector.getStatus();

      // Assert
      expect(status.connected).toBe(false);
      expect(status.details).toBeUndefined();
      expect(CommandExecutor.exec).toHaveBeenCalledWith('claude mcp list');
    });

    it('должен обработать ошибку выполнения команды', async () => {
      // Arrange
      CommandExecutor.exec.mockImplementation(() => {
        throw new Error('Command failed');
      });

      // Act
      const status = await connector.getStatus();

      // Assert
      expect(status.connected).toBe(false);
      expect(status.error).toContain('Ошибка проверки статуса');
      expect(status.error).toContain('Command failed');
    });

    it('должен обработать пустой вывод команды', async () => {
      // Arrange
      CommandExecutor.exec.mockReturnValue('');

      // Act
      const status = await connector.getStatus();

      // Assert
      expect(status.connected).toBe(false);
    });
  });

  describe('connect()', () => {
    it('должен вызвать claude mcp add с корректными аргументами (минимальный конфиг)', async () => {
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
      expect(CommandExecutor.execInteractive).toHaveBeenCalledWith('claude', [
        'mcp',
        'add',
        '--transport',
        'stdio',
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

    it('должен вызвать claude mcp add с полным конфигом', async () => {
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
      expect(CommandExecutor.execInteractive).toHaveBeenCalledWith('claude', [
        'mcp',
        'add',
        '--transport',
        'stdio',
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
    it('должен вызвать claude mcp remove с именем сервера', async () => {
      // Arrange
      CommandExecutor.execInteractive.mockResolvedValue(undefined);

      // Act
      await connector.disconnect();

      // Assert
      expect(CommandExecutor.execInteractive).toHaveBeenCalledWith('claude', [
        'mcp',
        'remove',
        MCP_SERVER_NAME,
      ]);
    });

    it('должен пробросить ошибку если команда не выполнена', async () => {
      // Arrange
      CommandExecutor.execInteractive.mockRejectedValue(new Error('Command failed'));

      // Act & Assert
      await expect(connector.disconnect()).rejects.toThrow('Command failed');
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
