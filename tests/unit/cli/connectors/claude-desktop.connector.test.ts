/**
 * Unit тесты для ClaudeDesktopConnector
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, writeFile, mkdir, readFile } from 'fs/promises';
import { join } from 'path';
import { tmpdir, platform } from 'os';
import { ClaudeDesktopConnector } from '../../../../cli/connectors/claude-desktop/claude-desktop.connector.js';
import {
  MCP_SERVER_NAME,
  SERVER_ENTRY_POINT,
  DEFAULT_API_BASE,
  DEFAULT_LOG_LEVEL,
  DEFAULT_REQUEST_TIMEOUT,
  ENV_VAR_NAMES,
} from '../../../../src/constants.js';
import type { MCPServerConfig } from '../../../../cli/connectors/base/connector.interface.js';

/**
 * Создать тестовый коннектор с кастомным config path для изоляции
 */
class TestClaudeDesktopConnector extends ClaudeDesktopConnector {
  constructor(configPath: string) {
    super();
    // Переопределяем configPath через приватное поле
    (this as any).configPath = configPath;
  }
}

describe('ClaudeDesktopConnector', () => {
  let tempDir: string;
  let connector: TestClaudeDesktopConnector;
  let testConfigPath: string;

  // Типичная конфигурация для тестов
  const testConfig: MCPServerConfig = {
    token: 'test-oauth-token',
    orgId: 'test-org-id',
    projectPath: '/path/to/project',
    apiBase: 'https://api.test.example.com',
    logLevel: 'debug',
    requestTimeout: 60000,
  };

  beforeEach(async () => {
    // Создаём временную директорию для каждого теста
    tempDir = await mkdtemp(join(tmpdir(), 'claude-desktop-test-'));

    // Путь к тестовому конфигу
    testConfigPath = join(tempDir, 'config', 'claude_desktop_config.json');

    // Создаём тестовый коннектор с кастомным путем
    connector = new TestClaudeDesktopConnector(testConfigPath);
  });

  afterEach(async () => {
    // Очищаем временную директорию после каждого теста
    await rm(tempDir, { recursive: true, force: true });
  });

  describe('getClientInfo', () => {
    it('должен вернуть корректную информацию о клиенте', () => {
      const clientInfo = connector.getClientInfo();

      expect(clientInfo.name).toBe('claude-desktop');
      expect(clientInfo.displayName).toBe('Claude Desktop');
      expect(clientInfo.description).toBe('Официальное десктопное приложение Claude от Anthropic');
      expect(clientInfo.configPath).toBe(testConfigPath);
      expect(clientInfo.platforms).toEqual(['darwin', 'linux', 'win32']);
    });

    it('должен вернуть массив с тремя поддерживаемыми платформами', () => {
      const clientInfo = connector.getClientInfo();

      expect(clientInfo.platforms).toHaveLength(3);
      expect(clientInfo.platforms).toContain('darwin');
      expect(clientInfo.platforms).toContain('linux');
      expect(clientInfo.platforms).toContain('win32');
    });

    it('должен определить правильные platform-specific пути в реальном коннекторе', () => {
      // Тест для реального коннектора (без подмены configPath)
      const realConnector = new ClaudeDesktopConnector();
      const clientInfo = realConnector.getClientInfo();
      const currentPlatform = platform();

      // Проверяем, что путь содержит platform-specific части
      if (currentPlatform === 'darwin') {
        expect(clientInfo.configPath).toContain('Library/Application Support/Claude');
      } else if (currentPlatform === 'linux') {
        expect(clientInfo.configPath).toContain('.config/claude');
      } else if (currentPlatform === 'win32') {
        expect(clientInfo.configPath).toContain('Claude');
      }

      expect(clientInfo.configPath).toContain('claude_desktop_config.json');
    });
  });

  describe('isInstalled', () => {
    it('должен вернуть true если директория конфига существует', async () => {
      // Arrange: Создаём директорию конфига
      const configDir = join(tempDir, 'config');
      await mkdir(configDir, { recursive: true });

      // Act
      const result = await connector.isInstalled();

      // Assert
      expect(result).toBe(true);
    });

    it('должен вернуть false если директория конфига не существует', async () => {
      // Arrange: Создаём коннектор с путём к несуществующей директории
      const nonExistentPath = join(tempDir, 'non-existent-dir', 'claude_desktop_config.json');
      const testConnector = new TestClaudeDesktopConnector(nonExistentPath);

      // Act
      const result = await testConnector.isInstalled();

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('getStatus', () => {
    it('должен вернуть connected: false если конфиг файл не существует', async () => {
      // Act (файл не создан)
      const status = await connector.getStatus();

      // Assert
      expect(status).toEqual({
        connected: false,
        error: 'Конфигурационный файл не найден',
      });
    });

    it('должен вернуть connected: true если сервер зарегистрирован в конфиге', async () => {
      // Arrange: Создаём конфиг с нашим сервером
      const config = {
        mcpServers: {
          [MCP_SERVER_NAME]: {
            command: 'node',
            args: ['/path/to/server.js'],
            env: {
              [ENV_VAR_NAMES.YANDEX_TRACKER_TOKEN]: 'token',
              [ENV_VAR_NAMES.YANDEX_ORG_ID]: 'org',
            },
          },
        },
      };
      await mkdir(join(tempDir, 'config'), { recursive: true });
      await writeFile(testConfigPath, JSON.stringify(config, null, 2));

      // Act
      const status = await connector.getStatus();

      // Assert
      expect(status.connected).toBe(true);
      expect(status.details?.configPath).toBe(testConfigPath);
      expect(status.details?.metadata?.['serverConfig']).toEqual(
        config.mcpServers[MCP_SERVER_NAME]
      );
    });

    it('должен вернуть connected: false если сервер не зарегистрирован в конфиге', async () => {
      // Arrange: Создаём конфиг без нашего сервера
      const config = {
        mcpServers: {
          'other-server': {
            command: 'node',
            args: ['/path/to/other.js'],
            env: {},
          },
        },
      };
      await mkdir(join(tempDir, 'config'), { recursive: true });
      await writeFile(testConfigPath, JSON.stringify(config, null, 2));

      // Act
      const status = await connector.getStatus();

      // Assert
      expect(status).toEqual({
        connected: false,
      });
    });

    it('должен вернуть ошибку если конфиг файл невалидный JSON', async () => {
      // Arrange: Создаём невалидный JSON
      await mkdir(join(tempDir, 'config'), { recursive: true });
      await writeFile(testConfigPath, 'invalid json {');

      // Act
      const status = await connector.getStatus();

      // Assert
      expect(status.connected).toBe(false);
      expect(status.error).toMatch(/Ошибка чтения конфига:/);
    });
  });

  describe('connect', () => {
    it('должен создать новый конфиг файл если он не существует', async () => {
      // Act
      await connector.connect(testConfig);

      // Assert
      const status = await connector.getStatus();
      expect(status.connected).toBe(true);
    });

    it('должен создать директорию конфига если она не существует', async () => {
      // Act
      await connector.connect(testConfig);

      // Assert
      const status = await connector.getStatus();
      expect(status.connected).toBe(true);
      expect(status.details?.configPath).toBe(testConfigPath);
    });

    it('должен добавить сервер в существующий конфиг без удаления других серверов', async () => {
      // Arrange: Создаём конфиг с другим сервером
      const existingConfig = {
        mcpServers: {
          'existing-server': {
            command: 'node',
            args: ['/path/to/existing.js'],
            env: { KEY: 'value' },
          },
        },
      };
      await mkdir(join(tempDir, 'config'), { recursive: true });
      await writeFile(testConfigPath, JSON.stringify(existingConfig, null, 2));

      // Act
      await connector.connect(testConfig);

      // Assert
      const status = await connector.getStatus();
      expect(status.connected).toBe(true);

      // Проверяем, что оба сервера присутствуют
      const config = status.details?.metadata?.['serverConfig'];
      expect(config).toBeDefined();

      // Читаем файл напрямую для полной проверки
      const fileContent = await readFile(testConfigPath, 'utf-8');
      const fullConfig = JSON.parse(fileContent);
      expect(fullConfig.mcpServers).toHaveProperty('existing-server');
      expect(fullConfig.mcpServers).toHaveProperty(MCP_SERVER_NAME);
    });

    it('должен обновить конфигурацию существующего сервера', async () => {
      // Arrange: Создаём конфиг с нашим сервером (старая версия)
      const oldConfig = {
        mcpServers: {
          [MCP_SERVER_NAME]: {
            command: 'node',
            args: ['/old/path/server.js'],
            env: {
              [ENV_VAR_NAMES.YANDEX_TRACKER_TOKEN]: 'old-token',
              [ENV_VAR_NAMES.YANDEX_ORG_ID]: 'old-org',
            },
          },
        },
      };
      await mkdir(join(tempDir, 'config'), { recursive: true });
      await writeFile(testConfigPath, JSON.stringify(oldConfig, null, 2));

      // Act: Подключаемся с новой конфигурацией
      await connector.connect(testConfig);

      // Assert: Проверяем обновление
      const fileContent = await readFile(testConfigPath, 'utf-8');
      const newConfig = JSON.parse(fileContent);
      const serverConfig = newConfig.mcpServers[MCP_SERVER_NAME];

      expect(serverConfig.args).toEqual([join(testConfig.projectPath, SERVER_ENTRY_POINT)]);
      expect(serverConfig.env[ENV_VAR_NAMES.YANDEX_TRACKER_TOKEN]).toBe(testConfig.token);
      expect(serverConfig.env[ENV_VAR_NAMES.YANDEX_ORG_ID]).toBe(testConfig.orgId);
    });

    it('должен правильно сформировать структуру конфигурации сервера', async () => {
      // Act
      await connector.connect(testConfig);

      // Assert
      const fileContent = await readFile(testConfigPath, 'utf-8');
      const config = JSON.parse(fileContent);
      const serverConfig = config.mcpServers[MCP_SERVER_NAME];

      expect(serverConfig).toEqual({
        command: 'node',
        args: [join(testConfig.projectPath, SERVER_ENTRY_POINT)],
        env: {
          [ENV_VAR_NAMES.YANDEX_TRACKER_TOKEN]: testConfig.token,
          [ENV_VAR_NAMES.YANDEX_ORG_ID]: testConfig.orgId,
          [ENV_VAR_NAMES.YANDEX_TRACKER_API_BASE]: testConfig.apiBase,
          [ENV_VAR_NAMES.LOG_LEVEL]: testConfig.logLevel,
          [ENV_VAR_NAMES.REQUEST_TIMEOUT]: String(testConfig.requestTimeout),
        },
      });
    });

    it('должен использовать дефолтные значения для опциональных параметров', async () => {
      // Arrange: Минимальная конфигурация
      const minimalConfig: MCPServerConfig = {
        token: 'test-token',
        orgId: 'test-org',
        projectPath: '/test/path',
      };

      // Act
      await connector.connect(minimalConfig);

      // Assert
      const fileContent = await readFile(testConfigPath, 'utf-8');
      const config = JSON.parse(fileContent);
      const serverConfig = config.mcpServers[MCP_SERVER_NAME];

      expect(serverConfig.env[ENV_VAR_NAMES.YANDEX_TRACKER_API_BASE]).toBe(DEFAULT_API_BASE);
      expect(serverConfig.env[ENV_VAR_NAMES.LOG_LEVEL]).toBe(DEFAULT_LOG_LEVEL);
      expect(serverConfig.env[ENV_VAR_NAMES.REQUEST_TIMEOUT]).toBe(String(DEFAULT_REQUEST_TIMEOUT));
    });

    it('должен корректно преобразовать requestTimeout в строку', async () => {
      // Act
      await connector.connect(testConfig);

      // Assert
      const fileContent = await readFile(testConfigPath, 'utf-8');
      const config = JSON.parse(fileContent);
      const serverConfig = config.mcpServers[MCP_SERVER_NAME];

      expect(typeof serverConfig.env[ENV_VAR_NAMES.REQUEST_TIMEOUT]).toBe('string');
      expect(serverConfig.env[ENV_VAR_NAMES.REQUEST_TIMEOUT]).toBe(
        String(testConfig.requestTimeout)
      );
    });
  });

  describe('disconnect', () => {
    it('должен удалить сервер из конфига', async () => {
      // Arrange: Подключаем сервер
      await connector.connect(testConfig);
      let status = await connector.getStatus();
      expect(status.connected).toBe(true);

      // Act: Отключаем
      await connector.disconnect();

      // Assert
      status = await connector.getStatus();
      expect(status.connected).toBe(false);
    });

    it('должен сохранить другие серверы при отключении', async () => {
      // Arrange: Создаём конфиг с несколькими серверами
      const config = {
        mcpServers: {
          'other-server': {
            command: 'node',
            args: ['/path/to/other.js'],
            env: { KEY: 'value' },
          },
          [MCP_SERVER_NAME]: {
            command: 'node',
            args: ['/path/to/our-server.js'],
            env: {},
          },
        },
      };
      await mkdir(join(tempDir, 'config'), { recursive: true });
      await writeFile(testConfigPath, JSON.stringify(config, null, 2));

      // Act: Отключаем наш сервер
      await connector.disconnect();

      // Assert: Проверяем, что другой сервер остался
      const fileContent = await readFile(testConfigPath, 'utf-8');
      const newConfig = JSON.parse(fileContent);

      expect(newConfig.mcpServers).toHaveProperty('other-server');
      expect(newConfig.mcpServers).not.toHaveProperty(MCP_SERVER_NAME);
    });

    it('не должен выбросить ошибку если конфиг файл не существует', async () => {
      // Act & Assert: Не должно быть исключения
      await expect(connector.disconnect()).resolves.toBeUndefined();
    });

    it('не должен изменить конфиг если сервер не был зарегистрирован', async () => {
      // Arrange: Создаём конфиг без нашего сервера
      const config = {
        mcpServers: {
          'other-server': {
            command: 'node',
            args: ['/path/to/other.js'],
            env: {},
          },
        },
      };
      await mkdir(join(tempDir, 'config'), { recursive: true });
      await writeFile(testConfigPath, JSON.stringify(config, null, 2));

      // Act
      await connector.disconnect();

      // Assert: Конфиг не изменился
      const fileContent = await readFile(testConfigPath, 'utf-8');
      const newConfig = JSON.parse(fileContent);

      expect(newConfig).toEqual(config);
    });
  });

  describe('интеграционные сценарии', () => {
    it('должен корректно выполнить полный цикл: connect -> getStatus -> disconnect', async () => {
      // Начальное состояние
      let status = await connector.getStatus();
      expect(status.connected).toBe(false);

      // Подключение
      await connector.connect(testConfig);
      status = await connector.getStatus();
      expect(status.connected).toBe(true);

      // Отключение
      await connector.disconnect();
      status = await connector.getStatus();
      expect(status.connected).toBe(false);
    });

    it('должен поддерживать множественные переподключения', async () => {
      // Первое подключение
      await connector.connect(testConfig);
      let status = await connector.getStatus();
      expect(status.connected).toBe(true);

      // Отключение
      await connector.disconnect();
      status = await connector.getStatus();
      expect(status.connected).toBe(false);

      // Повторное подключение с другими параметрами
      const newConfig: MCPServerConfig = {
        ...testConfig,
        token: 'new-token',
        logLevel: 'error',
      };
      await connector.connect(newConfig);
      status = await connector.getStatus();
      expect(status.connected).toBe(true);

      // Проверяем обновление конфигурации
      const fileContent = await readFile(testConfigPath, 'utf-8');
      const config = JSON.parse(fileContent);
      const serverConfig = config.mcpServers[MCP_SERVER_NAME];

      expect(serverConfig.env[ENV_VAR_NAMES.YANDEX_TRACKER_TOKEN]).toBe('new-token');
      expect(serverConfig.env[ENV_VAR_NAMES.LOG_LEVEL]).toBe('error');
    });
  });
});
