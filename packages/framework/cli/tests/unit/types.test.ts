/**
 * Tests for core types
 */

import { describe, it, expect } from 'vitest';
import type {
  BaseMCPServerConfig,
  MCPClientInfo,
  ConnectionStatus,
  MCPClientServerConfig,
  MCPClientConfig,
} from '../../src/types.js';

describe('Types', () => {
  describe('BaseMCPServerConfig', () => {
    it('should be valid with required fields', () => {
      const config: BaseMCPServerConfig = {
        projectPath: '/path/to/project',
      };
      expect(config).toBeDefined();
      expect(config.projectPath).toBe('/path/to/project');
    });

    it('should be valid with all optional fields', () => {
      const config: BaseMCPServerConfig = {
        projectPath: '/path/to/project',
        logLevel: 'info',
        env: {
          VAR1: 'value1',
          VAR2: 'value2',
        },
      };
      expect(config).toBeDefined();
      expect(config.logLevel).toBe('info');
      expect(config.env).toEqual({ VAR1: 'value1', VAR2: 'value2' });
    });
  });

  describe('MCPClientInfo', () => {
    it('should be valid with required fields', () => {
      const info: MCPClientInfo = {
        name: 'test',
        displayName: 'Test Client',
        description: 'Test',
        configPath: '/test',
        platforms: ['darwin'],
      };
      expect(info).toBeDefined();
      expect(info.name).toBe('test');
      expect(info.platforms).toContain('darwin');
    });

    it('should support multiple platforms', () => {
      const info: MCPClientInfo = {
        name: 'test',
        displayName: 'Test Client',
        description: 'Test',
        configPath: '/test',
        platforms: ['darwin', 'linux', 'win32'],
      };
      expect(info.platforms).toHaveLength(3);
      expect(info.platforms).toEqual(['darwin', 'linux', 'win32']);
    });

    it('should support optional checkCommand', () => {
      const info: MCPClientInfo = {
        name: 'test',
        displayName: 'Test Client',
        description: 'Test',
        checkCommand: 'test --version',
        configPath: '/test',
        platforms: ['darwin'],
      };
      expect(info.checkCommand).toBe('test --version');
    });
  });

  describe('ConnectionStatus', () => {
    it('should be valid when disconnected', () => {
      const status: ConnectionStatus = {
        connected: false,
      };
      expect(status.connected).toBe(false);
      expect(status.details).toBeUndefined();
      expect(status.error).toBeUndefined();
    });

    it('should be valid when connected with details', () => {
      const status: ConnectionStatus = {
        connected: true,
        details: {
          configPath: '/path/to/config.json',
          lastModified: new Date('2024-01-01'),
          metadata: {
            version: '1.0.0',
          },
        },
      };
      expect(status.connected).toBe(true);
      expect(status.details?.configPath).toBe('/path/to/config.json');
      expect(status.details?.metadata?.version).toBe('1.0.0');
    });

    it('should be valid with error', () => {
      const status: ConnectionStatus = {
        connected: false,
        error: 'Client not installed',
      };
      expect(status.connected).toBe(false);
      expect(status.error).toBe('Client not installed');
    });
  });

  describe('MCPClientServerConfig', () => {
    it('should be valid', () => {
      const config: MCPClientServerConfig = {
        command: 'node',
        args: ['server.js'],
        env: {
          NODE_ENV: 'production',
        },
      };
      expect(config.command).toBe('node');
      expect(config.args).toEqual(['server.js']);
      expect(config.env.NODE_ENV).toBe('production');
    });
  });

  describe('MCPClientConfig', () => {
    it('should be valid with default key', () => {
      const config: MCPClientConfig = {
        mcpServers: {
          'my-server': {
            command: 'node',
            args: ['server.js'],
            env: {},
          },
        },
      };
      expect(config.mcpServers).toBeDefined();
      expect(config.mcpServers?.['my-server']).toBeDefined();
    });

    it('should be valid with custom key', () => {
      const config: MCPClientConfig<'mcp_servers'> = {
        mcp_servers: {
          'my-server': {
            command: 'node',
            args: ['server.js'],
            env: {},
          },
        },
      };
      expect(config.mcp_servers).toBeDefined();
      expect(config.mcp_servers?.['my-server']).toBeDefined();
    });
  });
});
