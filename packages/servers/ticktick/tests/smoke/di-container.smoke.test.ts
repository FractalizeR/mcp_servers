/**
 * Smoke Test: DI Container Initialization
 *
 * Verifies DI container initialization without calling real API.
 * Checks that all basic dependencies resolve correctly.
 *
 * NOTE: reflect-metadata is loaded via vitest setup file (tests/setup.ts)
 */

import { describe, it, expect } from 'vitest';
import { createContainer } from '../../src/composition-root/container.js';
import { TYPES } from '../../src/composition-root/types.js';
import type { ServerConfig } from '../../src/config/server-config.interface.js';
import type { Logger, IHttpClient, CacheManager } from '@mcp-framework/infrastructure';
import type { TickTickFacade } from '../../src/ticktick_api/facade/ticktick.facade.js';
import type { ToolRegistry } from '@mcp-framework/core';

describe('DI Container (Smoke)', () => {
  const fakeConfig: ServerConfig = {
    oauth: {
      clientId: 'fake-client-id',
      clientSecret: 'fake-client-secret',
      redirectUri: 'http://localhost:3000/callback',
      accessToken: 'fake-access-token',
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

  it('should create DI container', async () => {
    // Act
    const container = await createContainer(fakeConfig);

    // Assert
    expect(container).toBeDefined();
    expect(container.isBound(TYPES.Logger)).toBe(true);
    expect(container.isBound(TYPES.HttpClient)).toBe(true);
  });

  it('should resolve Logger', async () => {
    // Arrange
    const container = await createContainer(fakeConfig);

    // Act
    const logger = container.get<Logger>(TYPES.Logger);

    // Assert
    expect(logger).toBeDefined();
    expect(logger).toHaveProperty('info');
    expect(logger).toHaveProperty('error');
    expect(logger).toHaveProperty('warn');
    expect(logger).toHaveProperty('debug');
  });

  it('should resolve HttpClient', async () => {
    // Arrange
    const container = await createContainer(fakeConfig);

    // Act
    const httpClient = container.get<IHttpClient>(TYPES.HttpClient);

    // Assert
    expect(httpClient).toBeDefined();
    expect(httpClient).toHaveProperty('get');
    expect(httpClient).toHaveProperty('post');
    expect(httpClient).toHaveProperty('delete');
  });

  it('should resolve CacheManager', async () => {
    // Arrange
    const container = await createContainer(fakeConfig);

    // Act
    const cacheManager = container.get<CacheManager>(TYPES.CacheManager);

    // Assert
    expect(cacheManager).toBeDefined();
    expect(cacheManager).toHaveProperty('get');
    expect(cacheManager).toHaveProperty('set');
    expect(cacheManager).toHaveProperty('delete');
  });

  it('should resolve TickTickFacade', async () => {
    // Arrange
    const container = await createContainer(fakeConfig);

    // Act
    const facade = container.get<TickTickFacade>(TYPES.TickTickFacade);

    // Assert
    expect(facade).toBeDefined();
    expect(facade).toHaveProperty('getProjects');
    expect(facade).toHaveProperty('getTask');
    expect(facade).toHaveProperty('createTask');
  });

  it('should resolve ToolRegistry', async () => {
    // Arrange
    const container = await createContainer(fakeConfig);

    // Act
    const toolRegistry = container.get<ToolRegistry>(TYPES.ToolRegistry);

    // Assert
    expect(toolRegistry).toBeDefined();
    expect(toolRegistry).toHaveProperty('registerToolFromContainer');
    expect(toolRegistry).toHaveProperty('getTool');
    expect(toolRegistry).toHaveProperty('getAllTools');
  });

  it('should work in lazy mode', async () => {
    // Arrange
    const lazyConfig = {
      ...fakeConfig,
      tools: { ...fakeConfig.tools, discoveryMode: 'lazy' as const },
    };

    // Act
    const container = await createContainer(lazyConfig);
    const toolRegistry = container.get<ToolRegistry>(TYPES.ToolRegistry);

    // Assert
    expect(container).toBeDefined();
    expect(toolRegistry).toBeDefined();
  });

  it('should work in eager mode', async () => {
    // Arrange
    const eagerConfig = {
      ...fakeConfig,
      tools: { ...fakeConfig.tools, discoveryMode: 'eager' as const },
    };

    // Act
    const container = await createContainer(eagerConfig);
    const toolRegistry = container.get<ToolRegistry>(TYPES.ToolRegistry);
    const allTools = toolRegistry.getAllTools();

    // Assert
    expect(container).toBeDefined();
    expect(toolRegistry).toBeDefined();
    expect(allTools.length).toBeGreaterThan(0); // In eager mode all tools are loaded
  });

  it('should create Singleton instances', async () => {
    // Arrange
    const container = await createContainer(fakeConfig);

    // Act
    const logger1 = container.get<Logger>(TYPES.Logger);
    const logger2 = container.get<Logger>(TYPES.Logger);

    // Assert - Should be the same instance
    expect(logger1).toBe(logger2);
  });

  it('should support Dida365 API base URL', async () => {
    // Arrange
    const dida365Config = {
      ...fakeConfig,
      api: {
        baseUrl: 'https://api.dida365.com/open/v1',
      },
    };

    // Act & Assert
    await expect(createContainer(dida365Config)).resolves.toBeDefined();
  });
});
