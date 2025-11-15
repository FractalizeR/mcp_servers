/**
 * Unit тесты для CodexConnector
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtemp, rm, writeFile } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { CodexConnector } from '@cli/connectors/codex/codex.connector.js';
import { CommandExecutor } from '@cli/utils/command-executor.js';
import { FileManager } from '@cli/utils/file-manager.js';
import type { MCPServerConfig } from '@cli/connectors/base/connector.interface.js';
import {
  MCP_SERVER_NAME,
  SERVER_ENTRY_POINT,
  DEFAULT_API_BASE,
  DEFAULT_LOG_LEVEL,
  DEFAULT_REQUEST_TIMEOUT,
  ENV_VAR_NAMES,
} from '../../../../src/constants.js';

describe('CodexConnector', () => {
  let connector: CodexConnector;
  let tempDir: string;
  let originalConfigPath: string;

  beforeEach(async () => {
    // Создаём временную директорию для каждого теста
    tempDir = await mkdtemp(join(tmpdir(), 'codex-connector-test-'));

    // Сохраняем оригинальный путь
    connector = new CodexConnector();
    originalConfigPath = connector.getClientInfo().configPath;

    // Подменяем configPath через Object.defineProperty для тестирования
    const testConfigPath = join(tempDir, '.codex', 'config.toml');
    Object.defineProperty(connector, 'configPath', {
      value: testConfigPath,
      writable: false,
    });
  });

  afterEach(async () => {
    // Очищаем временную директорию после каждого теста
    await rm(tempDir, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  describe('getClientInfo', () => {
    it('должен вернуть корректную информацию о клиенте', () => {
      // Arrange - создаём новый connector для этого теста
      const freshConnector = new CodexConnector();

      // Act
      const info = freshConnector.getClientInfo();

      // Assert
      expect(info.name).toBe('codex');
      expect(info.displayName).toBe('Codex');
      expect(info.description).toBe('CLI инструмент Codex от OpenAI');
      expect(info.checkCommand).toBe('codex --version');
      expect(info.configPath).toBe(originalConfigPath);
      expect(info.platforms).toEqual(['darwin', 'linux', 'win32']);
    });
  });

  describe('isInstalled', () => {
    it('должен вернуть true если codex установлен', async () => {
      // Arrange
      vi.spyOn(CommandExecutor, 'isCommandAvailable').mockReturnValue(true);

      // Act
      const result = await connector.isInstalled();

      // Assert
      expect(result).toBe(true);
      expect(CommandExecutor.isCommandAvailable).toHaveBeenCalledWith('codex');
    });

    it('должен вернуть false если codex не установлен', async () => {
      // Arrange
      vi.spyOn(CommandExecutor, 'isCommandAvailable').mockReturnValue(false);

      // Act
      const result = await connector.isInstalled();

      // Assert
      expect(result).toBe(false);
      expect(CommandExecutor.isCommandAvailable).toHaveBeenCalledWith('codex');
    });
  });

  describe('getStatus', () => {
    let testConfigPath: string;

    beforeEach(() => {
      testConfigPath = join(tempDir, '.codex', 'config.toml');
      Object.defineProperty(connector, 'configPath', {
        value: testConfigPath,
        writable: false,
      });
    });

    it('должен вернуть connected: false если конфиг не существует', async () => {
      // Act
      const status = await connector.getStatus();

      // Assert
      expect(status.connected).toBe(false);
      expect(status.details).toBeUndefined();
      expect(status.error).toBeUndefined();
    });

    it('должен вернуть connected: true если сервер настроен в конфиге', async () => {
      // Arrange
      const tomlContent = `
[mcp_servers.${MCP_SERVER_NAME}]
command = "node"
args = ["dist/index.js"]

[mcp_servers.${MCP_SERVER_NAME}.env]
YANDEX_TRACKER_TOKEN = "test-token"
YANDEX_ORG_ID = "test-org"
`;
      await FileManager.ensureDir(join(tempDir, '.codex'));
      await writeFile(testConfigPath, tomlContent, 'utf-8');

      // Act
      const status = await connector.getStatus();

      // Assert
      expect(status.connected).toBe(true);
      expect(status.details).toBeDefined();
      expect(status.details?.configPath).toBe(testConfigPath);
      expect(status.details?.metadata).toBeDefined();
      expect(status.details?.metadata?.['serverConfig']).toBeDefined();
    });

    it('должен вернуть connected: false если сервер не настроен в конфиге', async () => {
      // Arrange
      const tomlContent = `
[mcp_servers.other_server]
command = "node"
`;
      await FileManager.ensureDir(join(tempDir, '.codex'));
      await writeFile(testConfigPath, tomlContent, 'utf-8');

      // Act
      const status = await connector.getStatus();

      // Assert
      expect(status.connected).toBe(false);
      expect(status.details).toBeUndefined();
    });

    it('должен вернуть ошибку если конфиг повреждён', async () => {
      // Arrange
      await FileManager.ensureDir(join(tempDir, '.codex'));
      await writeFile(testConfigPath, 'invalid [[ toml', 'utf-8');

      // Act
      const status = await connector.getStatus();

      // Assert
      expect(status.connected).toBe(false);
      expect(status.error).toBeDefined();
      expect(status.error).toContain('Ошибка чтения конфига');
    });
  });

  describe('connect', () => {
    let testConfigPath: string;
    const projectPath = '/test/project/path';

    beforeEach(() => {
      testConfigPath = join(tempDir, '.codex', 'config.toml');
      Object.defineProperty(connector, 'configPath', {
        value: testConfigPath,
        writable: false,
      });
    });

    it('должен вызвать codex mcp add с корректными параметрами', async () => {
      // Arrange
      const config: MCPServerConfig = {
        token: 'test-token',
        orgId: 'test-org-id',
        projectPath,
      };

      const execInteractiveSpy = vi
        .spyOn(CommandExecutor, 'execInteractive')
        .mockResolvedValue(undefined);

      // Act
      await connector.connect(config);

      // Assert
      expect(execInteractiveSpy).toHaveBeenCalledWith('codex', [
        'mcp',
        'add',
        MCP_SERVER_NAME,
        '--env',
        `${ENV_VAR_NAMES.YANDEX_TRACKER_TOKEN}=test-token`,
        '--env',
        `${ENV_VAR_NAMES.YANDEX_ORG_ID}=test-org-id`,
        '--env',
        `${ENV_VAR_NAMES.YANDEX_TRACKER_API_BASE}=${DEFAULT_API_BASE}`,
        '--env',
        `${ENV_VAR_NAMES.LOG_LEVEL}=${DEFAULT_LOG_LEVEL}`,
        '--env',
        `${ENV_VAR_NAMES.REQUEST_TIMEOUT}=${DEFAULT_REQUEST_TIMEOUT}`,
        '--',
        'node',
        join(projectPath, SERVER_ENTRY_POINT),
      ]);
    });

    it('должен использовать кастомные значения из конфига', async () => {
      // Arrange
      const customApiBase = 'https://custom.api.url';
      const customLogLevel = 'debug';
      const customTimeout = 60000;

      const config: MCPServerConfig = {
        token: 'test-token',
        orgId: 'test-org-id',
        apiBase: customApiBase,
        logLevel: customLogLevel as 'debug',
        requestTimeout: customTimeout,
        projectPath,
      };

      const execInteractiveSpy = vi
        .spyOn(CommandExecutor, 'execInteractive')
        .mockResolvedValue(undefined);

      // Act
      await connector.connect(config);

      // Assert
      expect(execInteractiveSpy).toHaveBeenCalledWith('codex', [
        'mcp',
        'add',
        MCP_SERVER_NAME,
        '--env',
        `${ENV_VAR_NAMES.YANDEX_TRACKER_TOKEN}=test-token`,
        '--env',
        `${ENV_VAR_NAMES.YANDEX_ORG_ID}=test-org-id`,
        '--env',
        `${ENV_VAR_NAMES.YANDEX_TRACKER_API_BASE}=${customApiBase}`,
        '--env',
        `${ENV_VAR_NAMES.LOG_LEVEL}=${customLogLevel}`,
        '--env',
        `${ENV_VAR_NAMES.REQUEST_TIMEOUT}=${customTimeout}`,
        '--',
        'node',
        join(projectPath, SERVER_ENTRY_POINT),
      ]);
    });

    it('должен пробросить ошибку если команда завершилась неудачно', async () => {
      // Arrange
      const config: MCPServerConfig = {
        token: 'test-token',
        orgId: 'test-org-id',
        projectPath,
      };

      const error = new Error('Command failed');
      vi.spyOn(CommandExecutor, 'execInteractive').mockRejectedValue(error);

      // Act & Assert
      await expect(connector.connect(config)).rejects.toThrow('Command failed');
    });
  });

  describe('disconnect', () => {
    let testConfigPath: string;

    beforeEach(() => {
      testConfigPath = join(tempDir, '.codex', 'config.toml');
      Object.defineProperty(connector, 'configPath', {
        value: testConfigPath,
        writable: false,
      });
    });

    it('должен удалить сервер из TOML конфига', async () => {
      // Arrange
      const initialConfig = {
        mcp_servers: {
          [MCP_SERVER_NAME]: {
            command: 'node',
            args: ['dist/index.js'],
            env: {
              YANDEX_TRACKER_TOKEN: 'test-token',
            },
          },
          other_server: {
            command: 'python',
            args: ['server.py'],
            env: {},
          },
        },
      };

      await FileManager.ensureDir(join(tempDir, '.codex'));
      await FileManager.writeTOML(testConfigPath, initialConfig);

      // Act
      await connector.disconnect();

      // Assert
      const updatedConfig = await FileManager.readTOML<{
        mcp_servers?: Record<string, unknown>;
      }>(testConfigPath);

      expect(updatedConfig.mcp_servers).toBeDefined();
      expect(updatedConfig.mcp_servers?.[MCP_SERVER_NAME]).toBeUndefined();
      expect(updatedConfig.mcp_servers?.['other_server']).toBeDefined();
    });

    it('должен корректно работать если конфиг не существует', async () => {
      // Act & Assert - не должно выбросить ошибку
      await expect(connector.disconnect()).resolves.toBeUndefined();
    });

    it('должен корректно работать если сервер не был настроен', async () => {
      // Arrange
      const initialConfig = {
        mcp_servers: {
          other_server: {
            command: 'python',
            args: ['server.py'],
            env: {},
          },
        },
      };

      await FileManager.ensureDir(join(tempDir, '.codex'));
      await FileManager.writeTOML(testConfigPath, initialConfig);

      // Act
      await connector.disconnect();

      // Assert
      const updatedConfig = await FileManager.readTOML<{
        mcp_servers?: Record<string, unknown>;
      }>(testConfigPath);

      expect(updatedConfig.mcp_servers).toBeDefined();
      expect(updatedConfig.mcp_servers?.['other_server']).toBeDefined();
    });

    it('должен корректно работать если mcp_servers пустой', async () => {
      // Arrange
      const initialConfig = { mcp_servers: {} };

      await FileManager.ensureDir(join(tempDir, '.codex'));
      await FileManager.writeTOML(testConfigPath, initialConfig);

      // Act
      await connector.disconnect();

      // Assert
      const updatedConfig = await FileManager.readTOML<{
        mcp_servers?: Record<string, unknown>;
      }>(testConfigPath);

      expect(updatedConfig.mcp_servers).toBeDefined();
      expect(Object.keys(updatedConfig.mcp_servers || {})).toHaveLength(0);
    });

    it('должен сохранить остальные секции конфига', async () => {
      // Arrange
      const initialConfig = {
        some_other_section: {
          key: 'value',
        },
        mcp_servers: {
          [MCP_SERVER_NAME]: {
            command: 'node',
            args: ['dist/index.js'],
            env: {},
          },
        },
      };

      await FileManager.ensureDir(join(tempDir, '.codex'));
      await FileManager.writeTOML(testConfigPath, initialConfig);

      // Act
      await connector.disconnect();

      // Assert
      const updatedConfig = await FileManager.readTOML<{
        some_other_section?: { key: string };
        mcp_servers?: Record<string, unknown>;
      }>(testConfigPath);

      expect(updatedConfig.some_other_section).toBeDefined();
      expect(updatedConfig.some_other_section?.key).toBe('value');
      expect(updatedConfig.mcp_servers?.[MCP_SERVER_NAME]).toBeUndefined();
    });
  });
});
