/**
 * Unit тесты для connect command
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import type {
  MCPConnector,
  MCPServerConfig,
  ConnectionStatus,
} from '../../../../cli/connectors/base/connector.interface.js';

// Создаем hoisted моки для использования в vi.mock()
const mocks = vi.hoisted(() => ({
  registry: {
    findInstalled: vi.fn(),
    get: vi.fn(),
    getAll: vi.fn(),
    register: vi.fn(),
    checkAllStatuses: vi.fn(),
  },
  config: {
    load: vi.fn(),
    save: vi.fn(),
    delete: vi.fn(),
    exists: vi.fn(),
  },
  prompter: {
    promptClientSelection: vi.fn(),
    promptServerConfig: vi.fn(),
    promptConfirmation: vi.fn(),
  },
  logger: {
    header: vi.fn(),
    info: vi.fn(),
    success: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    newLine: vi.fn(),
    spinner: vi.fn(),
  },
  spinner: {
    stop: vi.fn(),
    succeed: vi.fn(),
    fail: vi.fn(),
  },
}));

// Мокаем модули используя hoisted моки
vi.mock('../../../../cli/connectors/registry.js', () => ({
  ConnectorRegistry: class {
    findInstalled = mocks.registry.findInstalled;
    get = mocks.registry.get;
    getAll = mocks.registry.getAll;
    register = mocks.registry.register;
    checkAllStatuses = mocks.registry.checkAllStatuses;
  },
}));

vi.mock('../../../../cli/utils/config-manager.js', () => ({
  ConfigManager: class {
    load = mocks.config.load;
    save = mocks.config.save;
    delete = mocks.config.delete;
    exists = mocks.config.exists;
  },
}));

vi.mock('../../../../cli/utils/interactive-prompter.js', () => ({
  InteractivePrompter: mocks.prompter,
}));

vi.mock('../../../../cli/utils/logger.js', () => ({
  Logger: mocks.logger,
}));

describe('connectCommand', () => {
  const mockConnector: MCPConnector = {
    getClientInfo: vi.fn(() => ({
      name: 'test-client',
      displayName: 'Test Client',
      description: 'Test MCP client',
      configPath: '/path/to/config',
      platforms: ['darwin'] as ('darwin' | 'linux' | 'win32')[],
    })),
    isInstalled: vi.fn(async () => true),
    getStatus: vi.fn(
      async (): Promise<ConnectionStatus> => ({
        connected: true,
        details: {
          configPath: '/path/to/config',
        },
      })
    ),
    connect: vi.fn(async () => {}),
    disconnect: vi.fn(async () => {}),
    validateConfig: vi.fn(async () => []),
  };

  const mockSavedConfig: Partial<MCPServerConfig> = {
    orgId: 'saved-org',
    logLevel: 'debug',
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Устанавливаем дефолтные значения
    mocks.logger.spinner.mockReturnValue(mocks.spinner);
    mocks.registry.findInstalled.mockResolvedValue([]);
    mocks.registry.get.mockReturnValue(undefined);
    mocks.config.load.mockResolvedValue(undefined);
    mocks.prompter.promptServerConfig.mockResolvedValue({
      token: 'test-token',
      orgId: 'test-org',
      logLevel: 'info',
    });
    mocks.prompter.promptConfirmation.mockResolvedValue(false);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Поиск установленных клиентов', () => {
    it('должен вывести ошибку если нет установленных клиентов', async () => {
      // Arrange
      mocks.registry.findInstalled.mockResolvedValue([]);

      // Act
      const { connectCommand } = await import('../../../../cli/commands/connect.command.js');
      await connectCommand({});

      // Assert
      expect(mocks.logger.error).toHaveBeenCalledWith('Не найдено установленных MCP клиентов');
      expect(mocks.logger.info).toHaveBeenCalledWith(
        'Поддерживаемые клиенты: Claude Desktop, Claude Code, Codex'
      );
      expect(mocks.logger.info).toHaveBeenCalledWith(
        'Установите хотя бы один из них для продолжения'
      );
    });

    it('должен показать spinner во время поиска', async () => {
      // Arrange
      mocks.registry.findInstalled.mockResolvedValue([]);

      // Act
      const { connectCommand } = await import('../../../../cli/commands/connect.command.js');
      await connectCommand({});

      // Assert
      expect(mocks.logger.spinner).toHaveBeenCalledWith('Поиск установленных MCP клиентов...');
      expect(mocks.spinner.stop).toHaveBeenCalled();
    });

    it('должен вывести количество найденных клиентов', async () => {
      // Arrange
      mocks.registry.findInstalled.mockResolvedValue([mockConnector]);
      mocks.registry.get.mockReturnValue(mockConnector);

      // Act
      const { connectCommand } = await import('../../../../cli/commands/connect.command.js');
      await connectCommand({ client: 'test-client' });

      // Assert
      expect(mocks.logger.success).toHaveBeenCalledWith('Найдено 1 установленных клиента(ов)');
    });
  });

  describe('Выбор клиента через опцию --client', () => {
    it('должен использовать клиент из опции --client', async () => {
      // Arrange
      mocks.registry.findInstalled.mockResolvedValue([mockConnector]);
      mocks.registry.get.mockReturnValue(mockConnector);

      // Act
      const { connectCommand } = await import('../../../../cli/commands/connect.command.js');
      await connectCommand({ client: 'test-client' });

      // Assert
      expect(mocks.registry.get).toHaveBeenCalledWith('test-client');
      expect(mocks.logger.info).toHaveBeenCalledWith('Выбран клиент: Test Client');
    });

    it('должен вывести ошибку если клиент не найден', async () => {
      // Arrange
      mocks.registry.findInstalled.mockResolvedValue([mockConnector]);
      mocks.registry.get.mockReturnValue(undefined);

      // Act
      const { connectCommand } = await import('../../../../cli/commands/connect.command.js');
      await connectCommand({ client: 'nonexistent' });

      // Assert
      expect(mocks.logger.error).toHaveBeenCalledWith('Клиент "nonexistent" не найден');
    });

    it('должен вывести ошибку если клиент не установлен', async () => {
      // Arrange
      const notInstalledConnector: MCPConnector = {
        ...mockConnector,
        isInstalled: vi.fn(async () => false),
      };

      // Нужно вернуть хотя бы один клиент чтобы пройти проверку installedClients.length === 0
      mocks.registry.findInstalled.mockResolvedValue([notInstalledConnector]);
      mocks.registry.get.mockReturnValue(notInstalledConnector);

      // Act
      const { connectCommand } = await import('../../../../cli/commands/connect.command.js');
      await connectCommand({ client: 'test-client' });

      // Assert
      expect(mocks.logger.error).toHaveBeenCalledWith('Клиент "test-client" не установлен');
    });
  });

  describe('Интерактивный выбор клиента', () => {
    it('должен запросить выбор клиента если --client не указан', async () => {
      // Arrange
      mocks.registry.findInstalled.mockResolvedValue([mockConnector]);
      mocks.registry.get.mockReturnValue(mockConnector);
      mocks.prompter.promptClientSelection.mockResolvedValue('test-client');

      // Act
      const { connectCommand } = await import('../../../../cli/commands/connect.command.js');
      await connectCommand({});

      // Assert
      expect(mocks.prompter.promptClientSelection).toHaveBeenCalledWith([
        mockConnector.getClientInfo(),
      ]);
    });

    it('должен вывести ошибку если не удалось выбрать клиент', async () => {
      // Arrange
      mocks.registry.findInstalled.mockResolvedValue([mockConnector]);
      mocks.registry.get.mockReturnValue(undefined);
      mocks.prompter.promptClientSelection.mockResolvedValue('invalid');

      // Act
      const { connectCommand } = await import('../../../../cli/commands/connect.command.js');
      await connectCommand({});

      // Assert
      expect(mocks.logger.error).toHaveBeenCalledWith('Не удалось выбрать клиент');
    });
  });

  describe('Запрос конфигурации', () => {
    it('должен использовать сохраненную конфигурацию если она существует', async () => {
      // Arrange
      mocks.registry.findInstalled.mockResolvedValue([mockConnector]);
      mocks.registry.get.mockReturnValue(mockConnector);
      mocks.config.load.mockResolvedValue(mockSavedConfig);

      // Act
      const { connectCommand } = await import('../../../../cli/commands/connect.command.js');
      await connectCommand({ client: 'test-client' });

      // Assert
      expect(mocks.logger.info).toHaveBeenCalledWith(
        'Найдена сохраненная конфигурация (токен будет запрошен заново)'
      );
      expect(mocks.prompter.promptServerConfig).toHaveBeenCalledWith(mockSavedConfig);
    });

    it('должен добавить projectPath к конфигурации', async () => {
      // Arrange
      mocks.registry.findInstalled.mockResolvedValue([mockConnector]);
      mocks.registry.get.mockReturnValue(mockConnector);

      // Act
      const { connectCommand } = await import('../../../../cli/commands/connect.command.js');
      await connectCommand({ client: 'test-client' });

      // Assert
      expect(mockConnector.validateConfig).toHaveBeenCalledWith(
        expect.objectContaining({
          projectPath: process.cwd(),
        })
      );
    });
  });

  describe('Валидация конфигурации', () => {
    it('должен вывести ошибки если конфигурация невалидна', async () => {
      // Arrange
      const errors = ['Токен обязателен', 'ID организации обязателен'];
      const invalidConnector: MCPConnector = {
        ...mockConnector,
        validateConfig: vi.fn(async () => errors),
      };

      mocks.registry.findInstalled.mockResolvedValue([invalidConnector]);
      mocks.registry.get.mockReturnValue(invalidConnector);

      // Act
      const { connectCommand } = await import('../../../../cli/commands/connect.command.js');
      await connectCommand({ client: 'test-client' });

      // Assert
      expect(mocks.logger.error).toHaveBeenCalledWith('Ошибки конфигурации:');
      expect(mocks.logger.error).toHaveBeenCalledWith('  - Токен обязателен');
      expect(mocks.logger.error).toHaveBeenCalledWith('  - ID организации обязателен');
    });

    it('должен продолжить если конфигурация валидна', async () => {
      // Arrange
      mocks.registry.findInstalled.mockResolvedValue([mockConnector]);
      mocks.registry.get.mockReturnValue(mockConnector);

      // Act
      const { connectCommand } = await import('../../../../cli/commands/connect.command.js');
      await connectCommand({ client: 'test-client' });

      // Assert
      expect(mockConnector.connect).toHaveBeenCalled();
    });
  });

  describe('Подключение', () => {
    it('должен показать spinner во время подключения', async () => {
      // Arrange
      mocks.registry.findInstalled.mockResolvedValue([mockConnector]);
      mocks.registry.get.mockReturnValue(mockConnector);

      // Act
      const { connectCommand } = await import('../../../../cli/commands/connect.command.js');
      await connectCommand({ client: 'test-client' });

      // Assert
      expect(mocks.logger.spinner).toHaveBeenCalledWith('Подключаю к Test Client...');
    });

    it('должен вызвать connect с правильной конфигурацией', async () => {
      // Arrange
      mocks.registry.findInstalled.mockResolvedValue([mockConnector]);
      mocks.registry.get.mockReturnValue(mockConnector);

      // Act
      const { connectCommand } = await import('../../../../cli/commands/connect.command.js');
      await connectCommand({ client: 'test-client' });

      // Assert
      expect(mockConnector.connect).toHaveBeenCalledWith({
        token: 'test-token',
        orgId: 'test-org',
        logLevel: 'info',
        projectPath: process.cwd(),
      });
    });

    it('должен вывести успешное сообщение при успешном подключении', async () => {
      // Arrange
      mocks.registry.findInstalled.mockResolvedValue([mockConnector]);
      mocks.registry.get.mockReturnValue(mockConnector);

      // Act
      const { connectCommand } = await import('../../../../cli/commands/connect.command.js');
      await connectCommand({ client: 'test-client' });

      // Assert
      expect(mocks.spinner.succeed).toHaveBeenCalledWith(
        'MCP сервер успешно подключен к Test Client!'
      );
      expect(mocks.logger.info).toHaveBeenCalledWith('Конфигурация: /path/to/config');
    });

    it('должен вывести ошибку при неудачном подключении', async () => {
      // Arrange
      const errorConnector: MCPConnector = {
        ...mockConnector,
        connect: vi.fn(async () => {
          throw new Error('Connection failed');
        }),
      };

      mocks.registry.findInstalled.mockResolvedValue([errorConnector]);
      mocks.registry.get.mockReturnValue(errorConnector);

      // Act
      const { connectCommand } = await import('../../../../cli/commands/connect.command.js');
      await connectCommand({ client: 'test-client' });

      // Assert
      expect(mocks.spinner.fail).toHaveBeenCalledWith('Ошибка подключения: Connection failed');
    });

    it('должен не запрашивать сохранение конфигурации при неудачном подключении', async () => {
      // Arrange
      const errorConnector: MCPConnector = {
        ...mockConnector,
        connect: vi.fn(async () => {
          throw new Error('Connection failed');
        }),
      };

      mocks.registry.findInstalled.mockResolvedValue([errorConnector]);
      mocks.registry.get.mockReturnValue(errorConnector);

      // Act
      const { connectCommand } = await import('../../../../cli/commands/connect.command.js');
      await connectCommand({ client: 'test-client' });

      // Assert
      expect(mocks.prompter.promptConfirmation).not.toHaveBeenCalled();
    });
  });

  describe('Сохранение конфигурации', () => {
    it('должен сохранить конфигурацию если пользователь согласен', async () => {
      // Arrange
      mocks.registry.findInstalled.mockResolvedValue([mockConnector]);
      mocks.registry.get.mockReturnValue(mockConnector);
      mocks.prompter.promptConfirmation.mockResolvedValue(true);

      // Act
      const { connectCommand } = await import('../../../../cli/commands/connect.command.js');
      await connectCommand({ client: 'test-client' });

      // Assert
      expect(mocks.prompter.promptConfirmation).toHaveBeenCalledWith(
        'Сохранить конфигурацию для следующего раза?',
        true
      );
      expect(mocks.config.save).toHaveBeenCalledWith({
        token: 'test-token',
        orgId: 'test-org',
        logLevel: 'info',
        projectPath: process.cwd(),
      });
      expect(mocks.logger.success).toHaveBeenCalledWith('Конфигурация сохранена');
    });

    it('должен не сохранять конфигурацию если пользователь отказался', async () => {
      // Arrange
      mocks.registry.findInstalled.mockResolvedValue([mockConnector]);
      mocks.registry.get.mockReturnValue(mockConnector);
      mocks.prompter.promptConfirmation.mockResolvedValue(false);

      // Act
      const { connectCommand } = await import('../../../../cli/commands/connect.command.js');
      await connectCommand({ client: 'test-client' });

      // Assert
      expect(mocks.config.save).not.toHaveBeenCalled();
    });

    it('должен вывести финальное сообщение об успехе', async () => {
      // Arrange
      mocks.registry.findInstalled.mockResolvedValue([mockConnector]);
      mocks.registry.get.mockReturnValue(mockConnector);

      // Act
      const { connectCommand } = await import('../../../../cli/commands/connect.command.js');
      await connectCommand({ client: 'test-client' });

      // Assert
      expect(mocks.logger.success).toHaveBeenCalledWith(
        '✅ Готово! Теперь вы можете использовать MCP сервер в выбранном клиенте.'
      );
    });
  });

  describe('Вызовы Logger.newLine', () => {
    it('должен вызывать newLine в правильных местах', async () => {
      // Arrange
      mocks.registry.findInstalled.mockResolvedValue([mockConnector]);
      mocks.registry.get.mockReturnValue(mockConnector);

      // Act
      const { connectCommand } = await import('../../../../cli/commands/connect.command.js');
      await connectCommand({ client: 'test-client' });

      // Assert
      // После "Найдено N клиентов", после выбора клиента, после конфигурации, после подключения, перед финальным сообщением
      expect(mocks.logger.newLine).toHaveBeenCalledTimes(5);
    });
  });
});
