/**
 * Tests for BaseConnector
 */

import { describe, it, expect } from 'vitest';
import { BaseConnector } from '../../src/connectors/base/base-connector.js';
import type { BaseMCPServerConfig, MCPClientInfo, ConnectionStatus } from '../../src/types.js';

/**
 * Test connector implementation
 */
class TestConnector extends BaseConnector<BaseMCPServerConfig> {
  private _platforms: Array<'darwin' | 'linux' | 'win32'> = ['darwin', 'linux'];

  getClientInfo(): MCPClientInfo {
    return {
      name: 'test-client',
      displayName: 'Test Client',
      description: 'Test MCP Client',
      configPath: '/test/config.json',
      platforms: this._platforms,
    };
  }

  async isInstalled(): Promise<boolean> {
    return true;
  }

  async getStatus(): Promise<ConnectionStatus> {
    return { connected: false };
  }

  async connect(_config: BaseMCPServerConfig): Promise<void> {
    // no-op
  }

  async disconnect(): Promise<void> {
    // no-op
  }

  // Expose protected methods for testing
  public testIsPlatformSupported(): boolean {
    return this.isPlatformSupported();
  }

  public testGetCurrentPlatform(): ReturnType<typeof this.getCurrentPlatform> {
    return this.getCurrentPlatform();
  }

  public setPlatforms(platforms: Array<'darwin' | 'linux' | 'win32'>): void {
    this._platforms = platforms;
  }
}

describe('BaseConnector', () => {
  describe('validateConfig', () => {
    it('should pass validation with valid config', async () => {
      const connector = new TestConnector();
      const config: BaseMCPServerConfig = {
        projectPath: '/path/to/project',
      };

      const errors = await connector.validateConfig(config);
      expect(errors).toEqual([]);
    });

    it('should fail validation when projectPath is empty', async () => {
      const connector = new TestConnector();
      const config: BaseMCPServerConfig = {
        projectPath: '',
      };

      const errors = await connector.validateConfig(config);
      expect(errors).toHaveLength(1);
      expect(errors[0]).toContain('Путь к проекту обязателен');
    });

    it('should fail validation when projectPath is whitespace', async () => {
      const connector = new TestConnector();
      const config: BaseMCPServerConfig = {
        projectPath: '   ',
      };

      const errors = await connector.validateConfig(config);
      expect(errors).toHaveLength(1);
      expect(errors[0]).toContain('Путь к проекту обязателен');
    });

    it('should pass validation with valid logLevel', async () => {
      const connector = new TestConnector();
      const config: BaseMCPServerConfig = {
        projectPath: '/path/to/project',
        logLevel: 'debug',
      };

      const errors = await connector.validateConfig(config);
      expect(errors).toEqual([]);
    });

    it('should fail validation with invalid logLevel', async () => {
      const connector = new TestConnector();
      const config = {
        projectPath: '/path/to/project',
        // @ts-expect-error - testing invalid value
        logLevel: 'invalid',
      };

      const errors = await connector.validateConfig(config);
      expect(errors).toHaveLength(1);
      expect(errors[0]).toContain('Неверный уровень логирования');
      expect(errors[0]).toContain('invalid');
    });

    it('should pass validation with valid env', async () => {
      const connector = new TestConnector();
      const config: BaseMCPServerConfig = {
        projectPath: '/path/to/project',
        env: {
          VAR1: 'value1',
          VAR2: 'value2',
        },
      };

      const errors = await connector.validateConfig(config);
      expect(errors).toEqual([]);
    });
  });

  describe('isPlatformSupported', () => {
    it('should return true when platform is supported', () => {
      const connector = new TestConnector();
      const currentPlatform = connector.testGetCurrentPlatform();

      // Set platforms to include current platform
      connector.setPlatforms([currentPlatform as 'darwin' | 'linux' | 'win32']);

      expect(connector.testIsPlatformSupported()).toBe(true);
    });

    it('should return false when platform is not supported', () => {
      const connector = new TestConnector();
      const currentPlatform = connector.testGetCurrentPlatform();

      // Set platforms to exclude current platform
      const otherPlatforms = ['darwin', 'linux', 'win32'].filter(
        (p) => p !== currentPlatform
      ) as Array<'darwin' | 'linux' | 'win32'>;

      connector.setPlatforms(otherPlatforms);

      expect(connector.testIsPlatformSupported()).toBe(false);
    });
  });

  describe('getCurrentPlatform', () => {
    it('should return current platform', () => {
      const connector = new TestConnector();
      const platform = connector.testGetCurrentPlatform();

      expect(platform).toBeDefined();
      expect(typeof platform).toBe('string');
      // Platform should be one of the known values
      expect(['darwin', 'linux', 'win32', 'freebsd', 'openbsd', 'sunos', 'aix']).toContain(
        platform
      );
    });
  });
});
