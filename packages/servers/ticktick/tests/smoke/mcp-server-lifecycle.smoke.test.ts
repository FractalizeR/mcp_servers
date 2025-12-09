/**
 * Smoke Test: MCP Server Lifecycle
 *
 * Verifies basic MCP server lifecycle without calling real API.
 * Uses fake tokens for initialization.
 *
 * NOTE: reflect-metadata is loaded via vitest setup file (tests/setup.ts)
 */

import { describe, it, expect } from 'vitest';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { createContainer } from '../../src/composition-root/container.js';
import { TYPES } from '../../src/composition-root/types.js';
import type { ServerConfig } from '../../src/config/server-config.interface.js';
import type { ToolRegistry } from '@fractalizer/mcp-core';

describe('MCP Server Lifecycle (Smoke)', () => {
  const fakeConfig: ServerConfig = {
    oauth: {
      clientId: 'fake-client-id',
      clientSecret: 'fake-client-secret',
      redirectUri: 'http://localhost:3000/callback',
      accessToken: 'fake-access-token-for-testing',
    },
    api: {
      baseUrl: 'https://api.ticktick.com/open/v1',
    },
    batch: {
      maxBatchSize: 100,
      maxConcurrentRequests: 5,
    },
    retry: {
      attempts: 3,
      minDelay: 1000,
      maxDelay: 10000,
    },
    cache: {
      ttlMs: 300000,
    },
    tools: {
      discoveryMode: 'eager',
      essentialTools: ['fr_ticktick_ping'],
    },
    logging: {
      level: 'error', // Minimal logs for smoke test
      dir: '/tmp/ticktick-mcp-test-logs',
      prettyLogs: false,
      maxSize: 50000,
      maxFiles: 5,
    },
    requestTimeout: 30000,
  };

  it('should create MCP server instance', () => {
    // Act
    const server = new Server(
      {
        name: 'ticktick-mcp-test',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    // Assert
    expect(server).toBeDefined();
    expect(server).toBeInstanceOf(Server);
  });

  it('should create DI container and get ToolRegistry', async () => {
    // Act
    const container = await createContainer(fakeConfig);
    const toolRegistry = container.get<ToolRegistry>(TYPES.ToolRegistry);

    // Assert
    expect(container).toBeDefined();
    expect(toolRegistry).toBeDefined();
  });

  it('should initialize without errors (without real API)', async () => {
    // Arrange & Act
    const createServerComponents = async () => {
      const container = await createContainer(fakeConfig);
      const toolRegistry = container.get<ToolRegistry>(TYPES.ToolRegistry);
      const server = new Server(
        { name: 'ticktick-mcp-test', version: '1.0.0' },
        { capabilities: { tools: {} } }
      );
      return { container, toolRegistry, server };
    };

    // Assert - no errors during creation
    await expect(createServerComponents()).resolves.toBeDefined();
  });

  it('should accept different logging configurations', async () => {
    // Arrange
    const configs: ServerConfig[] = [
      { ...fakeConfig, logging: { ...fakeConfig.logging, level: 'debug', prettyLogs: false } },
      { ...fakeConfig, logging: { ...fakeConfig.logging, level: 'info', prettyLogs: true } },
      { ...fakeConfig, logging: { ...fakeConfig.logging, level: 'warn', prettyLogs: false } },
      { ...fakeConfig, logging: { ...fakeConfig.logging, level: 'error', prettyLogs: false } },
    ];

    // Act & Assert
    for (const config of configs) {
      await expect(createContainer(config)).resolves.toBeDefined();
    }
  });

  it('should create server with minimal configuration', async () => {
    // Arrange
    const minimalConfig: ServerConfig = {
      oauth: {
        clientId: '',
        clientSecret: '',
        redirectUri: 'http://localhost:3000/callback',
        accessToken: 'minimal-fake-token',
      },
      api: {
        baseUrl: 'https://api.ticktick.com/open/v1',
      },
      batch: {
        maxBatchSize: 50,
        maxConcurrentRequests: 5,
      },
      retry: {
        attempts: 3,
        minDelay: 1000,
        maxDelay: 10000,
      },
      cache: {
        ttlMs: 300000,
      },
      tools: {
        discoveryMode: 'eager',
        essentialTools: ['fr_ticktick_ping'],
      },
      logging: {
        level: 'error',
        dir: '/tmp/ticktick-mcp-test-logs',
        prettyLogs: false,
        maxSize: 50000,
        maxFiles: 5,
      },
      requestTimeout: 30000,
    };

    // Act & Assert
    await expect(createContainer(minimalConfig)).resolves.toBeDefined();
  });

  it('should support lazy and eager discovery modes', async () => {
    // Arrange
    const lazyConfig = {
      ...fakeConfig,
      tools: {
        ...fakeConfig.tools,
        discoveryMode: 'lazy' as const,
        essentialTools: ['fr_ticktick_ping', 'fr_ticktick_search_tools'],
      },
    };
    const eagerConfig = {
      ...fakeConfig,
      tools: { ...fakeConfig.tools, discoveryMode: 'eager' as const },
    };

    // Act
    const lazyContainer = await createContainer(lazyConfig);
    const eagerContainer = await createContainer(eagerConfig);

    const lazyRegistry = lazyContainer.get<ToolRegistry>(TYPES.ToolRegistry);
    const eagerRegistry = eagerContainer.get<ToolRegistry>(TYPES.ToolRegistry);

    // Both modes register all tools (getAllTools)
    // The difference is which tools are exported via getDefinitionsByMode
    const lazyDefinitions = lazyRegistry.getEssentialDefinitions(lazyConfig.tools.essentialTools);
    const eagerDefinitions = eagerRegistry.getDefinitions();

    // Assert
    expect(lazyRegistry).toBeDefined();
    expect(eagerRegistry).toBeDefined();
    // In lazy mode only essential tools (minus search_tools if not bound)
    expect(lazyDefinitions.length).toBeGreaterThanOrEqual(1);
    // In eager mode all tools
    expect(eagerDefinitions.length).toBeGreaterThan(10);
  });

  it('should return all tools with correct metadata in eager mode', async () => {
    // Arrange
    const container = await createContainer(fakeConfig);
    const toolRegistry = container.get<ToolRegistry>(TYPES.ToolRegistry);

    // Act
    const definitions = toolRegistry.getDefinitions();

    // Assert
    expect(definitions.length).toBeGreaterThan(0);

    // Check that all definitions have required fields
    for (const def of definitions) {
      expect(def.name).toBeDefined();
      expect(def.description).toBeDefined();
      expect(def.inputSchema).toBeDefined();
    }

    // Check that we have project and task tools
    const projectTools = definitions.filter((d) => d.name.includes('project'));
    const taskTools = definitions.filter((d) => d.name.includes('task'));

    expect(projectTools.length).toBeGreaterThan(0);
    expect(taskTools.length).toBeGreaterThan(0);
  });

  it('should have ping tool available', async () => {
    // Arrange
    const container = await createContainer(fakeConfig);
    const toolRegistry = container.get<ToolRegistry>(TYPES.ToolRegistry);

    // Act
    const pingTool = toolRegistry.getTool('fr_ticktick_ping');

    // Assert
    expect(pingTool).toBeDefined();
  });
});
