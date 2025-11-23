/**
 * Integration tests for full CLI workflow
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ConnectorRegistry } from '../../src/connectors/registry.js';
import { ConfigManager } from '../../src/utils/config-manager.js';
import { connectCommand } from '../../src/commands/connect.command.js';
import { statusCommand } from '../../src/commands/status.command.js';
import { disconnectCommand } from '../../src/commands/disconnect.command.js';
import { listCommand } from '../../src/commands/list.command.js';
import { InteractivePrompter } from '../../src/utils/interactive-prompter.js';
import { Logger } from '../../src/utils/logger.js';
import type {
  IConnector,
  BaseMCPServerConfig,
  ConnectionStatus,
  MCPClientInfo,
} from '../../src/types.js';

// Mock зависимостей
vi.mock('../../src/utils/logger.js');

// Mock InteractivePrompter instance method
const mockPromptServerConfig = vi.fn();
/* eslint-disable @typescript-eslint/consistent-type-imports */
vi.mock('../../src/utils/interactive-prompter.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/utils/interactive-prompter.js')>();
  return {
    ...actual,
    InteractivePrompter: class MockInteractivePrompter {
      static promptClientSelection = vi.fn();
      static promptConfirmation = vi.fn();
      static promptSelection = vi.fn();

      promptServerConfig = mockPromptServerConfig;
    },
  };
});
/* eslint-enable @typescript-eslint/consistent-type-imports */

interface TestConfig extends BaseMCPServerConfig {
  projectPath: string;
  token?: string;
  orgId?: string;
}

describe('Full CLI Workflow Integration', () => {
  let registry: ConnectorRegistry<TestConfig>;
  let configManager: ConfigManager<TestConfig>;
  let mockConnector: IConnector<TestConfig>;
  let connectorStatus: ConnectionStatus;

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock Logger methods
    vi.mocked(Logger.header).mockImplementation(() => {});
    vi.mocked(Logger.newLine).mockImplementation(() => {});
    vi.mocked(Logger.info).mockImplementation(() => {});
    vi.mocked(Logger.success).mockImplementation(() => {});
    vi.mocked(Logger.error).mockImplementation(() => {});
    vi.mocked(Logger.warn).mockImplementation(() => {});
    const mockSpinner = {
      stop: vi.fn(),
      succeed: vi.fn(),
      fail: vi.fn(),
    };
    vi.mocked(Logger.spinner).mockReturnValue(mockSpinner as never);

    // Initialize status as disconnected
    connectorStatus = { connected: false };

    // Create mock connector
    mockConnector = {
      getClientInfo: vi.fn().mockReturnValue({
        name: 'test-client',
        displayName: 'Test Client',
        configPath: '/test/path',
        description: 'Test Client Description',
        platforms: ['darwin', 'linux', 'win32'],
      } as MCPClientInfo),
      isInstalled: vi.fn().mockResolvedValue(true),
      connect: vi.fn().mockImplementation(async () => {
        // Simulate successful connection
        connectorStatus = {
          connected: true,
          details: {
            configPath: '/test/path/config.json',
          },
        };
      }),
      disconnect: vi.fn().mockImplementation(async () => {
        // Simulate successful disconnection
        connectorStatus = { connected: false };
      }),
      getStatus: vi.fn().mockImplementation(async () => connectorStatus),
      validateConfig: vi.fn().mockResolvedValue([]),
    };

    // Create registry and register connector
    registry = new ConnectorRegistry<TestConfig>();
    registry.register(mockConnector);

    // Create config manager
    configManager = new ConfigManager<TestConfig>({
      projectName: 'test-server',
      safeFields: ['orgId'],
    });
  });

  describe('Complete workflow', () => {
    it('should execute list -> connect -> status -> disconnect -> status workflow', async () => {
      // Mock user inputs
      mockPromptServerConfig.mockResolvedValue({
        projectPath: '/test/path',
        token: 'test-token',
        orgId: 'test-org',
      } as TestConfig);
      InteractivePrompter.promptConfirmation.mockResolvedValue(false);

      // 1. List available clients (should show test-client as installed but not connected)
      await listCommand({ registry });
      expect(Logger.header).toHaveBeenCalledWith('📋 Поддерживаемые MCP клиенты');

      // 2. Check status (should be disconnected)
      await statusCommand({ registry });
      expect(mockConnector.getStatus).toHaveBeenCalled();

      // 3. Connect to the client
      await connectCommand({
        registry,
        configManager,
        configPrompts: [
          { name: 'token', type: 'password', message: 'Token:' },
          { name: 'orgId', type: 'input', message: 'Org ID:' },
        ],
        cliOptions: { client: 'test-client' },
      });

      expect(mockConnector.connect).toHaveBeenCalledWith(
        expect.objectContaining({
          projectPath: '/test/path',
          token: 'test-token',
          orgId: 'test-org',
        })
      );

      // 4. Check status again (should be connected)
      await statusCommand({ registry });
      const status = await mockConnector.getStatus();
      expect(status.connected).toBe(true);

      // 5. Disconnect from the client
      await disconnectCommand({ registry, cliOptions: { client: 'test-client' } });
      expect(mockConnector.disconnect).toHaveBeenCalled();

      // 6. Check status final time (should be disconnected)
      await statusCommand({ registry });
      const finalStatus = await mockConnector.getStatus();
      expect(finalStatus.connected).toBe(false);
    });

    it('should handle multiple clients workflow', async () => {
      // Create second mock connector
      let connector2Status: ConnectionStatus = { connected: false };
      const mockConnector2: IConnector<TestConfig> = {
        getClientInfo: vi.fn().mockReturnValue({
          name: 'test-client-2',
          displayName: 'Test Client 2',
          configPath: '/test/path2',
          description: 'Test Client Description',
          platforms: ['darwin', 'linux', 'win32'],
        } as MCPClientInfo),
        isInstalled: vi.fn().mockResolvedValue(true),
        connect: vi.fn().mockImplementation(async () => {
          connector2Status = { connected: true };
        }),
        disconnect: vi.fn().mockImplementation(async () => {
          connector2Status = { connected: false };
        }),
        getStatus: vi.fn().mockImplementation(async () => connector2Status),
        validateConfig: vi.fn().mockResolvedValue([]),
      };

      registry.register(mockConnector2);

      // Mock user inputs
      mockPromptServerConfig.mockResolvedValue({
        projectPath: '/test/path',
        token: 'test-token',
      } as TestConfig);
      InteractivePrompter.promptConfirmation.mockResolvedValue(false);

      // Connect to first client
      await connectCommand({
        registry,
        configManager,
        configPrompts: [],
        cliOptions: { client: 'test-client' },
      });

      // Connect to second client
      await connectCommand({
        registry,
        configManager,
        configPrompts: [],
        cliOptions: { client: 'test-client-2' },
      });

      // Both should be connected
      expect((await mockConnector.getStatus()).connected).toBe(true);
      expect((await mockConnector2.getStatus()).connected).toBe(true);

      // Check status for all clients
      await statusCommand({ registry });

      // Disconnect from first client
      await disconnectCommand({ registry, cliOptions: { client: 'test-client' } });

      // First disconnected, second still connected
      expect((await mockConnector.getStatus()).connected).toBe(false);
      expect((await mockConnector2.getStatus()).connected).toBe(true);
    });

    it('should handle connection errors gracefully', async () => {
      // Mock connection error
      vi.mocked(mockConnector.connect).mockRejectedValue(new Error('Connection failed'));

      mockPromptServerConfig.mockResolvedValue({
        projectPath: '/test/path',
        token: 'test-token',
      } as TestConfig);

      await connectCommand({
        registry,
        configManager,
        configPrompts: [],
        cliOptions: { client: 'test-client' },
      });

      // Should still be disconnected
      const status = await mockConnector.getStatus();
      expect(status.connected).toBe(false);

      // Should not have prompted to save config
      expect(InteractivePrompter.promptConfirmation).not.toHaveBeenCalled();
    });

    it('should handle validation errors before connection', async () => {
      // Mock validation error
      vi.mocked(mockConnector.validateConfig).mockResolvedValue([
        'Token is required',
        'Invalid project path',
      ]);

      mockPromptServerConfig.mockResolvedValue({
        projectPath: '/test/path',
      } as TestConfig);

      await connectCommand({
        registry,
        configManager,
        configPrompts: [],
        cliOptions: { client: 'test-client' },
      });

      // Should not have attempted to connect
      expect(mockConnector.connect).not.toHaveBeenCalled();

      // Should display errors
      expect(Logger.error).toHaveBeenCalledWith('Ошибки конфигурации:');
      expect(Logger.error).toHaveBeenCalledWith('  - Token is required');
      expect(Logger.error).toHaveBeenCalledWith('  - Invalid project path');
    });
  });

  describe('Registry operations during workflow', () => {
    it('should list all registered connectors', async () => {
      await listCommand({ registry });

      const allConnectors = registry.getAll();
      expect(allConnectors).toHaveLength(1);
      expect(allConnectors[0]?.getClientInfo().name).toBe('test-client');
    });

    it('should find installed clients', async () => {
      const installed = await registry.findInstalled();
      expect(installed).toHaveLength(1);
      expect(installed[0]?.getClientInfo().name).toBe('test-client');
    });

    it('should check status of all clients', async () => {
      const statuses = await registry.checkAllStatuses();
      expect(statuses.size).toBe(1);
      expect(statuses.get('test-client')).toBeDefined();
    });
  });
});
