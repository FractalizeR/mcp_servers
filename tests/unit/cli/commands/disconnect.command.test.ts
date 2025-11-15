/**
 * Unit тесты для disconnect command
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { disconnectCommand } from '@cli/commands/disconnect.command.js';
import { ConnectorRegistry } from '@cli/connectors/registry.js';
import { InteractivePrompter } from '@cli/utils/interactive-prompter.js';
import { Logger } from '@cli/utils/logger.js';
import type { ConnectionStatus } from '@cli/connectors/base/connector.interface.js';

// Мокаем модули
vi.mock('../../../../cli/connectors/registry.js');
vi.mock('../../../../cli/utils/interactive-prompter.js');
vi.mock('../../../../cli/utils/logger.js');

describe('disconnectCommand', () => {
  const mockSpinner = {
    stop: vi.fn(),
    succeed: vi.fn(),
    fail: vi.fn(),
  };

  const mockConnector1 = {
    getClientInfo: vi.fn(() => ({
      name: 'claude-desktop',
      displayName: 'Claude Desktop',
      description: 'Claude Desktop App',
      configPath: '/path/to/claude/config',
      platforms: ['darwin'] as const,
    })),
    disconnect: vi.fn(async () => {}),
  };

  const mockConnector2 = {
    getClientInfo: vi.fn(() => ({
      name: 'continue',
      displayName: 'Continue',
      description: 'Continue VSCode Extension',
      configPath: '/path/to/continue/config',
      platforms: ['darwin'] as const,
    })),
    disconnect: vi.fn(async () => {}),
  };

  /**
   * Helper для создания мок-реестра
   */
  function mockRegistry(config: {
    get?: (name: string) => unknown;
    getAll?: () => unknown[];
    checkAllStatuses?: () => Promise<Map<string, ConnectionStatus>>;
  }) {
    vi.mocked(ConnectorRegistry).mockImplementation(function (this: unknown) {
      return {
        get: vi.fn(config.get || (() => undefined)),
        getAll: vi.fn(config.getAll || (() => [])),
        register: vi.fn(),
        findInstalled: vi.fn(),
        checkAllStatuses: vi.fn(config.checkAllStatuses || (async () => new Map())),
      };
    } as never);
  }

  beforeEach(() => {
    vi.clearAllMocks();

    // Мокаем Logger.spinner
    vi.mocked(Logger.spinner).mockReturnValue(mockSpinner as never);

    // Базовая имплементация ConnectorRegistry
    mockRegistry({});
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Отключение с указанным клиентом через --client', () => {
    it('должен отключить указанного клиента при подтверждении', async () => {
      // Arrange
      mockRegistry({
        get: (name) => (name === 'claude-desktop' ? mockConnector1 : undefined),
      });

      vi.mocked(InteractivePrompter.promptConfirmation).mockResolvedValue(true);

      // Act
      await disconnectCommand({ client: 'claude-desktop' });

      // Assert
      expect(Logger.header).toHaveBeenCalledWith('🔌 Отключение MCP сервера');
      expect(InteractivePrompter.promptConfirmation).toHaveBeenCalledWith(
        'Отключить MCP сервер от Claude Desktop?',
        true
      );
      expect(mockConnector1.disconnect).toHaveBeenCalled();
      expect(mockSpinner.succeed).toHaveBeenCalledWith(
        'MCP сервер успешно отключен от Claude Desktop'
      );
    });

    it('должен показать ошибку если клиент не найден', async () => {
      // Arrange
      mockRegistry({
        get: () => undefined,
      });

      // Act
      await disconnectCommand({ client: 'nonexistent' });

      // Assert
      expect(Logger.error).toHaveBeenCalledWith('Клиент "nonexistent" не найден');
      expect(InteractivePrompter.promptConfirmation).not.toHaveBeenCalled();
      expect(mockConnector1.disconnect).not.toHaveBeenCalled();
    });

    it('должен отменить операцию при отказе пользователя', async () => {
      // Arrange
      mockRegistry({
        get: (name) => (name === 'claude-desktop' ? mockConnector1 : undefined),
      });

      vi.mocked(InteractivePrompter.promptConfirmation).mockResolvedValue(false);

      // Act
      await disconnectCommand({ client: 'claude-desktop' });

      // Assert
      expect(InteractivePrompter.promptConfirmation).toHaveBeenCalled();
      expect(Logger.info).toHaveBeenCalledWith('Отмена операции');
      expect(mockConnector1.disconnect).not.toHaveBeenCalled();
    });

    it('должен показать ошибку если отключение не удалось', async () => {
      // Arrange
      const error = new Error('Connection error');
      const mockFailingConnector = {
        ...mockConnector1,
        disconnect: vi.fn(async () => {
          throw error;
        }),
      };

      mockRegistry({
        get: (name) => (name === 'claude-desktop' ? mockFailingConnector : undefined),
      });

      vi.mocked(InteractivePrompter.promptConfirmation).mockResolvedValue(true);

      // Act
      await disconnectCommand({ client: 'claude-desktop' });

      // Assert
      expect(mockFailingConnector.disconnect).toHaveBeenCalled();
      expect(mockSpinner.fail).toHaveBeenCalledWith('Ошибка отключения: Connection error');
      expect(mockSpinner.succeed).not.toHaveBeenCalled();
    });
  });

  describe('Отключение через интерактивный выбор', () => {
    it('должен показать список подключенных клиентов для выбора', async () => {
      // Arrange
      const statuses = new Map<string, ConnectionStatus>([
        [
          'claude-desktop',
          {
            connected: true,
            details: { configPath: '/path/to/config' },
          },
        ],
        [
          'continue',
          {
            connected: true,
            details: { configPath: '/path/to/config2' },
          },
        ],
      ]);

      mockRegistry({
        get: (name) => {
          if (name === 'claude-desktop') return mockConnector1;
          if (name === 'continue') return mockConnector2;
          return undefined;
        },
        checkAllStatuses: async () => statuses,
      });

      vi.mocked(InteractivePrompter.promptSelection).mockResolvedValue('claude-desktop');
      vi.mocked(InteractivePrompter.promptConfirmation).mockResolvedValue(true);

      // Act
      await disconnectCommand({});

      // Assert
      expect(Logger.spinner).toHaveBeenCalledWith('Поиск подключенных клиентов...');
      expect(mockSpinner.stop).toHaveBeenCalled();
      expect(InteractivePrompter.promptSelection).toHaveBeenCalledWith(
        'Выберите клиент для отключения:',
        [
          { name: 'Claude Desktop', value: 'claude-desktop' },
          { name: 'Continue', value: 'continue' },
        ]
      );
    });

    it('должен отключить выбранного клиента', async () => {
      // Arrange
      const statuses = new Map<string, ConnectionStatus>([
        [
          'claude-desktop',
          {
            connected: true,
            details: { configPath: '/path/to/config' },
          },
        ],
      ]);

      mockRegistry({
        get: (name) => (name === 'claude-desktop' ? mockConnector1 : undefined),
        checkAllStatuses: async () => statuses,
      });

      vi.mocked(InteractivePrompter.promptSelection).mockResolvedValue('claude-desktop');
      vi.mocked(InteractivePrompter.promptConfirmation).mockResolvedValue(true);

      // Act
      await disconnectCommand({});

      // Assert
      expect(mockConnector1.disconnect).toHaveBeenCalled();
      expect(mockSpinner.succeed).toHaveBeenCalledWith(
        'MCP сервер успешно отключен от Claude Desktop'
      );
    });

    it('должен показать предупреждение если нет подключенных клиентов', async () => {
      // Arrange
      const statuses = new Map<string, ConnectionStatus>([
        ['claude-desktop', { connected: false }],
        ['continue', { connected: false }],
      ]);

      mockRegistry({
        get: (name) => {
          if (name === 'claude-desktop') return mockConnector1;
          if (name === 'continue') return mockConnector2;
          return undefined;
        },
        checkAllStatuses: async () => statuses,
      });

      // Act
      await disconnectCommand({});

      // Assert
      expect(Logger.warn).toHaveBeenCalledWith('MCP сервер не подключен ни к одному клиенту');
      expect(InteractivePrompter.promptSelection).not.toHaveBeenCalled();
      expect(mockConnector1.disconnect).not.toHaveBeenCalled();
    });

    it('должен показать предупреждение если список статусов пустой', async () => {
      // Arrange
      const statuses = new Map<string, ConnectionStatus>();

      mockRegistry({
        getAll: () => [],
        checkAllStatuses: async () => statuses,
      });

      // Act
      await disconnectCommand({});

      // Assert
      expect(Logger.warn).toHaveBeenCalledWith('MCP сервер не подключен ни к одному клиенту');
      expect(InteractivePrompter.promptSelection).not.toHaveBeenCalled();
    });

    it('должен показать предупреждение если клиент из статусов не найден в registry', async () => {
      // Arrange
      // Этот сценарий возможен если между checkAllStatuses и filter коннектор был удален
      const statuses = new Map<string, ConnectionStatus>([
        ['claude-desktop', { connected: true, details: { configPath: '/path' } }],
      ]);

      mockRegistry({
        get: () => undefined, // Всегда возвращает undefined (коннектор удалён)
        checkAllStatuses: async () => statuses,
      });

      // Act
      await disconnectCommand({});

      // Assert
      // connectedClients будет пустым после filter(Boolean), поэтому warn
      expect(Logger.warn).toHaveBeenCalledWith('MCP сервер не подключен ни к одному клиенту');
      expect(InteractivePrompter.promptSelection).not.toHaveBeenCalled();
      expect(InteractivePrompter.promptConfirmation).not.toHaveBeenCalled();
    });

    it('должен фильтровать только подключенные клиенты', async () => {
      // Arrange
      const statuses = new Map<string, ConnectionStatus>([
        ['claude-desktop', { connected: true, details: { configPath: '/path' } }],
        ['continue', { connected: false }],
      ]);

      mockRegistry({
        get: (name) => {
          if (name === 'claude-desktop') return mockConnector1;
          if (name === 'continue') return mockConnector2;
          return undefined;
        },
        checkAllStatuses: async () => statuses,
      });

      vi.mocked(InteractivePrompter.promptSelection).mockResolvedValue('claude-desktop');
      vi.mocked(InteractivePrompter.promptConfirmation).mockResolvedValue(true);

      // Act
      await disconnectCommand({});

      // Assert
      expect(InteractivePrompter.promptSelection).toHaveBeenCalledWith(
        'Выберите клиент для отключения:',
        [{ name: 'Claude Desktop', value: 'claude-desktop' }]
      );
    });
  });

  describe('Подтверждение операции', () => {
    it('должен показать правильный текст подтверждения', async () => {
      // Arrange
      mockRegistry({
        get: (name) => (name === 'claude-desktop' ? mockConnector1 : undefined),
      });

      vi.mocked(InteractivePrompter.promptConfirmation).mockResolvedValue(false);

      // Act
      await disconnectCommand({ client: 'claude-desktop' });

      // Assert
      expect(InteractivePrompter.promptConfirmation).toHaveBeenCalledWith(
        'Отключить MCP сервер от Claude Desktop?',
        true
      );
    });

    it('должен использовать true как default значение для подтверждения', async () => {
      // Arrange
      mockRegistry({
        get: (name) => (name === 'claude-desktop' ? mockConnector1 : undefined),
      });

      vi.mocked(InteractivePrompter.promptConfirmation).mockResolvedValue(false);

      // Act
      await disconnectCommand({ client: 'claude-desktop' });

      // Assert
      const promptCall = vi.mocked(InteractivePrompter.promptConfirmation).mock.calls[0];
      expect(promptCall).toBeDefined();
      expect(promptCall![1]).toBe(true); // second argument is default value
    });
  });

  describe('Spinner индикаторы', () => {
    it('должен показать spinner при поиске подключенных клиентов', async () => {
      // Arrange
      const statuses = new Map<string, ConnectionStatus>();

      mockRegistry({
        getAll: () => [],
        checkAllStatuses: async () => statuses,
      });

      // Act
      await disconnectCommand({});

      // Assert
      expect(Logger.spinner).toHaveBeenCalledWith('Поиск подключенных клиентов...');
      expect(mockSpinner.stop).toHaveBeenCalled();
    });

    it('должен показать spinner при отключении', async () => {
      // Arrange
      mockRegistry({
        get: (name) => (name === 'claude-desktop' ? mockConnector1 : undefined),
      });

      vi.mocked(InteractivePrompter.promptConfirmation).mockResolvedValue(true);

      // Act
      await disconnectCommand({ client: 'claude-desktop' });

      // Assert
      expect(Logger.spinner).toHaveBeenCalledWith('Отключаю от Claude Desktop...');
    });
  });
});
