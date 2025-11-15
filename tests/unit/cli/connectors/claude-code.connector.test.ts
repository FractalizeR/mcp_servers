/**
 * Unit тесты для ClaudeCodeConnector
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ClaudeCodeConnector } from '@cli/connectors/claude-code/claude-code.connector.js';
import { CommandExecutor } from '@cli/utils/command-executor.js';
import type { MCPServerConfig } from '@cli/connectors/base/connector.interface.js';
import {
  MCP_SERVER_NAME,
  SERVER_ENTRY_POINT,
  DEFAULT_API_BASE,
  DEFAULT_LOG_LEVEL,
  DEFAULT_REQUEST_TIMEOUT,
  ENV_VAR_NAMES,
} from '../../../../src/constants.js';

// Мокаем CommandExecutor
vi.mock('../../../../cli/utils/command-executor.js');

describe('ClaudeCodeConnector', () => {
  let connector: ClaudeCodeConnector;

  // Константы для тестов
  const TEST_CONFIG: MCPServerConfig = {
    token: 'test-oauth-token',
    orgId: 'test-org-id',
    projectPath: '/path/to/project',
  };

  const TEST_CONFIG_WITH_OPTIONALS: MCPServerConfig = {
    token: 'test-oauth-token',
    orgId: 'test-org-id',
    projectPath: '/path/to/project',
    apiBase: 'https://custom-api.example.com',
    logLevel: 'debug',
    requestTimeout: 60000,
  };

  beforeEach(() => {
    connector = new ClaudeCodeConnector();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getClientInfo', () => {
    it('должен вернуть корректную информацию о клиенте', () => {
      // Act
      const clientInfo = connector.getClientInfo();

      // Assert
      expect(clientInfo).toEqual({
        name: 'claude-code',
        displayName: 'Claude Code',
        description: 'CLI инструмент Claude Code для разработки',
        checkCommand: 'claude --version',
        configPath: 'managed-by-cli',
        platforms: ['darwin', 'linux', 'win32'],
      });
    });

    it('должен вернуть объект с обязательными полями', () => {
      // Act
      const clientInfo = connector.getClientInfo();

      // Assert
      expect(clientInfo).toHaveProperty('name');
      expect(clientInfo).toHaveProperty('displayName');
      expect(clientInfo).toHaveProperty('description');
      expect(clientInfo).toHaveProperty('configPath');
      expect(clientInfo).toHaveProperty('platforms');
      expect(clientInfo.platforms).toBeInstanceOf(Array);
      expect(clientInfo.platforms.length).toBeGreaterThan(0);
    });
  });

  describe('isInstalled', () => {
    it('должен вернуть true если команда claude доступна', async () => {
      // Arrange
      vi.mocked(CommandExecutor.isCommandAvailable).mockReturnValue(true);

      // Act
      const result = await connector.isInstalled();

      // Assert
      expect(result).toBe(true);
      expect(CommandExecutor.isCommandAvailable).toHaveBeenCalledWith('claude');
      expect(CommandExecutor.isCommandAvailable).toHaveBeenCalledTimes(1);
    });

    it('должен вернуть false если команда claude недоступна', async () => {
      // Arrange
      vi.mocked(CommandExecutor.isCommandAvailable).mockReturnValue(false);

      // Act
      const result = await connector.isInstalled();

      // Assert
      expect(result).toBe(false);
      expect(CommandExecutor.isCommandAvailable).toHaveBeenCalledWith('claude');
      expect(CommandExecutor.isCommandAvailable).toHaveBeenCalledTimes(1);
    });
  });

  describe('getStatus', () => {
    it('должен вернуть connected: true если сервер подключен', async () => {
      // Arrange
      const mcpListOutput = `${MCP_SERVER_NAME} (connected)\nother-server (disconnected)`;
      vi.mocked(CommandExecutor.exec).mockReturnValue(mcpListOutput);

      // Act
      const status = await connector.getStatus();

      // Assert
      expect(status).toEqual({
        connected: true,
        details: {
          configPath: 'managed by claude mcp',
        },
      });
      expect(CommandExecutor.exec).toHaveBeenCalledWith('claude mcp list');
      expect(CommandExecutor.exec).toHaveBeenCalledTimes(1);
    });

    it('должен вернуть connected: false если сервер не найден в списке', async () => {
      // Arrange
      const mcpListOutput = 'other-server (connected)\nanother-server (disconnected)';
      vi.mocked(CommandExecutor.exec).mockReturnValue(mcpListOutput);

      // Act
      const status = await connector.getStatus();

      // Assert
      expect(status).toEqual({
        connected: false,
        details: undefined,
      });
      expect(CommandExecutor.exec).toHaveBeenCalledWith('claude mcp list');
    });

    it('должен вернуть connected: false и ошибку при сбое команды', async () => {
      // Arrange
      const errorMessage = 'Command failed: claude mcp list';
      vi.mocked(CommandExecutor.exec).mockImplementation(() => {
        throw new Error(errorMessage);
      });

      // Act
      const status = await connector.getStatus();

      // Assert
      expect(status).toEqual({
        connected: false,
        error: `Ошибка проверки статуса: ${errorMessage}`,
      });
      expect(CommandExecutor.exec).toHaveBeenCalledWith('claude mcp list');
    });

    it('должен корректно обработать пустой вывод команды', async () => {
      // Arrange
      vi.mocked(CommandExecutor.exec).mockReturnValue('');

      // Act
      const status = await connector.getStatus();

      // Assert
      expect(status).toEqual({
        connected: false,
        details: undefined,
      });
    });
  });

  describe('connect', () => {
    it('должен вызвать команду claude mcp add с дефолтными параметрами', async () => {
      // Arrange
      vi.mocked(CommandExecutor.execInteractive).mockResolvedValue();

      // Act
      await connector.connect(TEST_CONFIG);

      // Assert
      expect(CommandExecutor.execInteractive).toHaveBeenCalledWith('claude', [
        'mcp',
        'add',
        '--transport',
        'stdio',
        MCP_SERVER_NAME,
        '--env',
        `${ENV_VAR_NAMES.YANDEX_TRACKER_TOKEN}=${TEST_CONFIG.token}`,
        '--env',
        `${ENV_VAR_NAMES.YANDEX_ORG_ID}=${TEST_CONFIG.orgId}`,
        '--env',
        `${ENV_VAR_NAMES.YANDEX_TRACKER_API_BASE}=${DEFAULT_API_BASE}`,
        '--env',
        `${ENV_VAR_NAMES.LOG_LEVEL}=${DEFAULT_LOG_LEVEL}`,
        '--env',
        `${ENV_VAR_NAMES.REQUEST_TIMEOUT}=${DEFAULT_REQUEST_TIMEOUT}`,
        '--',
        'node',
        `${TEST_CONFIG.projectPath}/${SERVER_ENTRY_POINT}`,
      ]);
      expect(CommandExecutor.execInteractive).toHaveBeenCalledTimes(1);
    });

    it('должен использовать кастомные параметры если они указаны', async () => {
      // Arrange
      vi.mocked(CommandExecutor.execInteractive).mockResolvedValue();

      // Act
      await connector.connect(TEST_CONFIG_WITH_OPTIONALS);

      // Assert
      expect(CommandExecutor.execInteractive).toHaveBeenCalledWith('claude', [
        'mcp',
        'add',
        '--transport',
        'stdio',
        MCP_SERVER_NAME,
        '--env',
        `${ENV_VAR_NAMES.YANDEX_TRACKER_TOKEN}=${TEST_CONFIG_WITH_OPTIONALS.token}`,
        '--env',
        `${ENV_VAR_NAMES.YANDEX_ORG_ID}=${TEST_CONFIG_WITH_OPTIONALS.orgId}`,
        '--env',
        `${ENV_VAR_NAMES.YANDEX_TRACKER_API_BASE}=${TEST_CONFIG_WITH_OPTIONALS.apiBase}`,
        '--env',
        `${ENV_VAR_NAMES.LOG_LEVEL}=${TEST_CONFIG_WITH_OPTIONALS.logLevel}`,
        '--env',
        `${ENV_VAR_NAMES.REQUEST_TIMEOUT}=${TEST_CONFIG_WITH_OPTIONALS.requestTimeout}`,
        '--',
        'node',
        `${TEST_CONFIG_WITH_OPTIONALS.projectPath}/${SERVER_ENTRY_POINT}`,
      ]);
    });

    it('должен пробросить ошибку если команда завершилась с ошибкой', async () => {
      // Arrange
      const error = new Error('Command exited with code 1');
      vi.mocked(CommandExecutor.execInteractive).mockRejectedValue(error);

      // Act & Assert
      await expect(connector.connect(TEST_CONFIG)).rejects.toThrow('Command exited with code 1');
      expect(CommandExecutor.execInteractive).toHaveBeenCalledTimes(1);
    });

    it('должен использовать константы из constants.ts для имени сервера', async () => {
      // Arrange
      vi.mocked(CommandExecutor.execInteractive).mockResolvedValue();

      // Act
      await connector.connect(TEST_CONFIG);

      // Assert
      const calls = vi.mocked(CommandExecutor.execInteractive).mock.calls;
      const args = calls[0]?.[1];
      expect(args).toBeDefined();
      expect(args).toContain(MCP_SERVER_NAME);
    });

    it('должен использовать константы для всех ENV переменных', async () => {
      // Arrange
      vi.mocked(CommandExecutor.execInteractive).mockResolvedValue();

      // Act
      await connector.connect(TEST_CONFIG);

      // Assert
      const args = vi.mocked(CommandExecutor.execInteractive).mock.calls[0]?.[1];
      expect(args).toBeDefined();
      expect(args).toContain(`${ENV_VAR_NAMES.YANDEX_TRACKER_TOKEN}=${TEST_CONFIG.token}`);
      expect(args).toContain(`${ENV_VAR_NAMES.YANDEX_ORG_ID}=${TEST_CONFIG.orgId}`);
      expect(args).toContain(`${ENV_VAR_NAMES.YANDEX_TRACKER_API_BASE}=${DEFAULT_API_BASE}`);
      expect(args).toContain(`${ENV_VAR_NAMES.LOG_LEVEL}=${DEFAULT_LOG_LEVEL}`);
      expect(args).toContain(`${ENV_VAR_NAMES.REQUEST_TIMEOUT}=${DEFAULT_REQUEST_TIMEOUT}`);
    });
  });

  describe('disconnect', () => {
    it('должен вызвать команду claude mcp remove', async () => {
      // Arrange
      vi.mocked(CommandExecutor.execInteractive).mockResolvedValue();

      // Act
      await connector.disconnect();

      // Assert
      expect(CommandExecutor.execInteractive).toHaveBeenCalledWith('claude', [
        'mcp',
        'remove',
        MCP_SERVER_NAME,
      ]);
      expect(CommandExecutor.execInteractive).toHaveBeenCalledTimes(1);
    });

    it('должен пробросить ошибку если команда завершилась с ошибкой', async () => {
      // Arrange
      const error = new Error('Command exited with code 1');
      vi.mocked(CommandExecutor.execInteractive).mockRejectedValue(error);

      // Act & Assert
      await expect(connector.disconnect()).rejects.toThrow('Command exited with code 1');
      expect(CommandExecutor.execInteractive).toHaveBeenCalledTimes(1);
    });

    it('должен использовать константу MCP_SERVER_NAME', async () => {
      // Arrange
      vi.mocked(CommandExecutor.execInteractive).mockResolvedValue();

      // Act
      await connector.disconnect();

      // Assert
      const args = vi.mocked(CommandExecutor.execInteractive).mock.calls[0]?.[1];
      expect(args).toBeDefined();
      expect(args).toContain(MCP_SERVER_NAME);
    });
  });

  describe('validateConfig (наследуется от BaseConnector)', () => {
    it('должен вернуть пустой массив для валидной конфигурации', async () => {
      // Act
      const errors = await connector.validateConfig(TEST_CONFIG);

      // Assert
      expect(errors).toEqual([]);
    });

    it('должен вернуть ошибку для отсутствующего токена', async () => {
      // Arrange
      const invalidConfig = { ...TEST_CONFIG, token: '' };

      // Act
      const errors = await connector.validateConfig(invalidConfig);

      // Assert
      expect(errors).toContain('OAuth токен обязателен');
    });

    it('должен вернуть ошибку для отсутствующего orgId', async () => {
      // Arrange
      const invalidConfig = { ...TEST_CONFIG, orgId: '' };

      // Act
      const errors = await connector.validateConfig(invalidConfig);

      // Assert
      expect(errors).toContain('ID организации обязателен');
    });

    it('должен вернуть ошибку для отсутствующего projectPath', async () => {
      // Arrange
      const invalidConfig = { ...TEST_CONFIG, projectPath: '' };

      // Act
      const errors = await connector.validateConfig(invalidConfig);

      // Assert
      expect(errors).toContain('Путь к проекту обязателен');
    });

    it('должен вернуть все ошибки для полностью невалидной конфигурации', async () => {
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
      expect(errors).toContain('OAuth токен обязателен');
      expect(errors).toContain('ID организации обязателен');
      expect(errors).toContain('Путь к проекту обязателен');
    });
  });
});
