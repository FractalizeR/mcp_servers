/**
 * Claude Desktop Connector Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ClaudeDesktopConnector } from '../../../src/connectors/claude-desktop/claude-desktop.connector.js';
import type { BaseMCPServerConfig } from '../../../src/types.js';

describe('ClaudeDesktopConnector', () => {
  let connector: ClaudeDesktopConnector<BaseMCPServerConfig>;

  beforeEach(() => {
    connector = new ClaudeDesktopConnector('test-server', 'dist/index.js');
  });

  it('should return client info', () => {
    const info = connector.getClientInfo();
    expect(info.name).toBe('claude-desktop');
    expect(info.displayName).toBeDefined();
    expect(info.description).toBeDefined();
    expect(info.platforms).toContain('darwin');
    expect(info.platforms).toContain('linux');
    expect(info.platforms).toContain('win32');
  });

  it('should validate config - missing projectPath', async () => {
    const config: BaseMCPServerConfig = {
      projectPath: '',
      logLevel: 'info',
    };

    const errors = await connector.validateConfig(config);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0]).toContain('Путь к проекту');
  });

  it('should validate config - invalid logLevel', async () => {
    const config = {
      projectPath: '/test/path',
      // @ts-expect-error - testing invalid value
      logLevel: 'invalid',
    };

    const errors = await connector.validateConfig(config);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0]).toContain('логирования');
  });

  it('should validate config - valid config', async () => {
    const config: BaseMCPServerConfig = {
      projectPath: '/test/path',
      logLevel: 'info',
    };

    const errors = await connector.validateConfig(config);
    expect(errors.length).toBe(0);
  });

  it('should check platform support', () => {
    const info = connector.getClientInfo();
    const currentPlatform = process.platform;

    // Current platform should be in supported platforms
    const isSupported = info.platforms.includes(currentPlatform as 'darwin' | 'linux' | 'win32');

    // Test passes on all supported platforms
    if (['darwin', 'linux', 'win32'].includes(currentPlatform)) {
      expect(isSupported).toBe(true);
    }
  });
});
