/**
 * Unit тесты для BaseConnector
 *
 * Тестовые сценарии:
 * - getCurrentPlatform() - возвращает текущую платформу OS
 * - isPlatformSupported() - проверка поддержки текущей платформы
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type {
  MCPServerConfig,
  MCPConnectionStatus,
  MCPClientInfo,
} from '#cli/connectors/base/connector.interface.js';

// Mock модуля os - создаем мок функцию внутри factory
vi.mock('os', () => ({
  platform: vi.fn(),
}));

// Импортируем BaseConnector после мока
import { BaseConnector } from '#cli/connectors/base/base-connector.js';
// Импортируем мокнутый модуль os для доступа к platform
import * as os from 'os';

// Тестовый класс-наследник для проверки базовой функциональности
class TestConnector extends BaseConnector {
  private platforms: Array<'darwin' | 'linux' | 'win32'>;

  constructor(supportedPlatforms: Array<'darwin' | 'linux' | 'win32'>) {
    super();
    this.platforms = supportedPlatforms;
  }

  getClientInfo(): MCPClientInfo {
    return {
      name: 'test-connector',
      displayName: 'Test Connector',
      description: 'Test connector for unit testing',
      platforms: this.platforms,
      checkCommand: 'test --version',
      configPath: '/test/config',
    };
  }

  isInstalled(): Promise<boolean> {
    return Promise.resolve(true);
  }

  getStatus(): Promise<MCPConnectionStatus> {
    return Promise.resolve({
      connected: false,
    });
  }

  connect(_config: MCPServerConfig): Promise<void> {
    return Promise.resolve();
  }

  disconnect(): Promise<void> {
    return Promise.resolve();
  }
}

describe('BaseConnector', () => {
  // Получаем ссылку на мокнутую функцию platform
  const mockPlatform = vi.mocked(os.platform);

  beforeEach(() => {
    // Очищаем моки перед каждым тестом
    vi.clearAllMocks();
  });

  describe('getCurrentPlatform()', () => {
    it('должен вернуть darwin для macOS', () => {
      // Arrange
      mockPlatform.mockReturnValue('darwin');
      const connector = new TestConnector(['darwin', 'linux', 'win32']);

      // Act
      const result = connector['getCurrentPlatform']();

      // Assert
      expect(result).toBe('darwin');
      expect(mockPlatform).toHaveBeenCalled();
    });

    it('должен вернуть linux для Linux', () => {
      // Arrange
      mockPlatform.mockReturnValue('linux');
      const connector = new TestConnector(['darwin', 'linux', 'win32']);

      // Act
      const result = connector['getCurrentPlatform']();

      // Assert
      expect(result).toBe('linux');
      expect(mockPlatform).toHaveBeenCalled();
    });

    it('должен вернуть win32 для Windows', () => {
      // Arrange
      mockPlatform.mockReturnValue('win32');
      const connector = new TestConnector(['darwin', 'linux', 'win32']);

      // Act
      const result = connector['getCurrentPlatform']();

      // Assert
      expect(result).toBe('win32');
      expect(mockPlatform).toHaveBeenCalled();
    });

    it('должен вернуть freebsd для FreeBSD', () => {
      // Arrange
      mockPlatform.mockReturnValue('freebsd');
      const connector = new TestConnector(['darwin', 'linux', 'win32']);

      // Act
      const result = connector['getCurrentPlatform']();

      // Assert
      expect(result).toBe('freebsd');
      expect(mockPlatform).toHaveBeenCalled();
    });

    it('должен вернуть aix для AIX', () => {
      // Arrange
      mockPlatform.mockReturnValue('aix');
      const connector = new TestConnector(['darwin', 'linux', 'win32']);

      // Act
      const result = connector['getCurrentPlatform']();

      // Assert
      expect(result).toBe('aix');
      expect(mockPlatform).toHaveBeenCalled();
    });

    it('должен вернуть sunos для SunOS', () => {
      // Arrange
      mockPlatform.mockReturnValue('sunos');
      const connector = new TestConnector(['darwin', 'linux', 'win32']);

      // Act
      const result = connector['getCurrentPlatform']();

      // Assert
      expect(result).toBe('sunos');
      expect(mockPlatform).toHaveBeenCalled();
    });
  });

  describe('isPlatformSupported()', () => {
    it('должен вернуть true если текущая платформа в списке поддерживаемых (darwin)', () => {
      // Arrange
      mockPlatform.mockReturnValue('darwin');
      const connector = new TestConnector(['darwin', 'linux']);

      // Act
      const result = connector['isPlatformSupported']();

      // Assert
      expect(result).toBe(true);
      expect(mockPlatform).toHaveBeenCalled();
    });

    it('должен вернуть true если текущая платформа в списке поддерживаемых (linux)', () => {
      // Arrange
      mockPlatform.mockReturnValue('linux');
      const connector = new TestConnector(['darwin', 'linux', 'win32']);

      // Act
      const result = connector['isPlatformSupported']();

      // Assert
      expect(result).toBe(true);
      expect(mockPlatform).toHaveBeenCalled();
    });

    it('должен вернуть true если текущая платформа в списке поддерживаемых (win32)', () => {
      // Arrange
      mockPlatform.mockReturnValue('win32');
      const connector = new TestConnector(['win32']);

      // Act
      const result = connector['isPlatformSupported']();

      // Assert
      expect(result).toBe(true);
      expect(mockPlatform).toHaveBeenCalled();
    });

    it('должен вернуть false если текущая платформа не в списке поддерживаемых', () => {
      // Arrange
      mockPlatform.mockReturnValue('win32');
      const connector = new TestConnector(['darwin', 'linux']);

      // Act
      const result = connector['isPlatformSupported']();

      // Assert
      expect(result).toBe(false);
      expect(mockPlatform).toHaveBeenCalled();
    });

    it('должен вернуть false если список поддерживаемых платформ пустой', () => {
      // Arrange
      mockPlatform.mockReturnValue('darwin');
      const connector = new TestConnector([]);

      // Act
      const result = connector['isPlatformSupported']();

      // Assert
      expect(result).toBe(false);
      expect(mockPlatform).toHaveBeenCalled();
    });

    it('должен вернуть true для всех платформ если все поддерживаются', () => {
      // Arrange
      const connector = new TestConnector(['darwin', 'linux', 'win32']);

      // Test darwin
      mockPlatform.mockReturnValue('darwin');
      expect(connector['isPlatformSupported']()).toBe(true);

      // Test linux
      mockPlatform.mockReturnValue('linux');
      expect(connector['isPlatformSupported']()).toBe(true);

      // Test win32
      mockPlatform.mockReturnValue('win32');
      expect(connector['isPlatformSupported']()).toBe(true);
    });

    it('должен корректно работать при смене текущей платформы', () => {
      // Arrange
      const connector = new TestConnector(['darwin', 'linux']);

      // Act & Assert - поддерживаемая платформа
      mockPlatform.mockReturnValue('darwin');
      expect(connector['isPlatformSupported']()).toBe(true);

      // Act & Assert - неподдерживаемая платформа
      mockPlatform.mockReturnValue('win32');
      expect(connector['isPlatformSupported']()).toBe(false);

      // Act & Assert - снова поддерживаемая платформа
      mockPlatform.mockReturnValue('linux');
      expect(connector['isPlatformSupported']()).toBe(true);
    });
  });

  describe('интеграционные тесты', () => {
    it('isPlatformSupported должен использовать getCurrentPlatform внутри', () => {
      // Arrange
      mockPlatform.mockReturnValue('darwin');
      const connector = new TestConnector(['darwin', 'linux']);

      // Act
      connector['isPlatformSupported']();

      // Assert - getCurrentPlatform вызывается внутри isPlatformSupported
      // Проверяем, что os.platform был вызван (используется в getCurrentPlatform)
      expect(mockPlatform).toHaveBeenCalled();
    });

    it('изменение os.platform должно влиять на isPlatformSupported', () => {
      // Arrange
      const connector = new TestConnector(['darwin']);

      // Act & Assert - darwin поддерживается
      mockPlatform.mockReturnValue('darwin');
      expect(connector['isPlatformSupported']()).toBe(true);

      // Act & Assert - меняем на linux (не поддерживается)
      mockPlatform.mockReturnValue('linux');
      expect(connector['isPlatformSupported']()).toBe(false);
    });
  });
});
