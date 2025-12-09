/**
 * Smoke Test: DI Container Initialization
 *
 * Проверяет инициализацию DI контейнера без обращения к API
 * Проверяет что все базовые зависимости резолвятся корректно
 */

import { describe, it, expect } from 'vitest';
import { createContainer } from '#composition-root/container.js';
import { TYPES } from '#composition-root/types.js';
import type { ServerConfig } from '#config';
import type { Logger } from '@mcp-framework/infrastructure/logging/index.js';
import type { IHttpClient } from '@mcp-framework/infrastructure/http/client/i-http-client.interface.js';
import type { CacheManager } from '@mcp-framework/infrastructure/cache/cache-manager.interface.js';
import type { YandexWikiFacade } from '#wiki_api/facade/yandex-wiki.facade.js';
import type { ToolRegistry } from '@mcp-framework/core/tool-registry.js';

describe('DI Container (Smoke)', () => {
  const fakeConfig: ServerConfig = {
    token: 'OAuth fake-test-token',
    orgId: 'fake-test-org',
    apiBase: 'https://api.wiki.yandex.net',
    requestTimeout: 30000,
    maxBatchSize: 50,
    maxConcurrentRequests: 10,
    logLevel: 'error', // Минимум логов
    prettyLogs: false,
    toolDiscoveryMode: 'lazy',
    essentialTools: ['yw_ping'],
    logsDir: '/tmp/logs',
    logMaxSize: 10485760,
    logMaxFiles: 5,
    retryAttempts: 3,
    retryMinDelay: 1000,
    retryMaxDelay: 10000,
  };

  it('должен создать DI container', async () => {
    // Act
    const container = await createContainer(fakeConfig);

    // Assert
    expect(container).toBeDefined();
    expect(container.isBound(TYPES.Logger)).toBe(true);
    expect(container.isBound(TYPES.HttpClient)).toBe(true);
  });

  it('должен резолвить Logger', async () => {
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

  it('должен резолвить HttpClient', async () => {
    // Arrange
    const container = await createContainer(fakeConfig);

    // Act
    const httpClient = container.get<IHttpClient>(TYPES.HttpClient);

    // Assert
    expect(httpClient).toBeDefined();
    expect(httpClient).toHaveProperty('get');
    expect(httpClient).toHaveProperty('post');
    expect(httpClient).toHaveProperty('patch');
    expect(httpClient).toHaveProperty('delete');
  });

  it('должен резолвить CacheManager', async () => {
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

  it('должен резолвить YandexWikiFacade', async () => {
    // Arrange
    const container = await createContainer(fakeConfig);

    // Act
    const facade = container.get<YandexWikiFacade>(TYPES.YandexWikiFacade);

    // Assert
    expect(facade).toBeDefined();
    expect(facade).toHaveProperty('getPage');
  });

  it('должен резолвить ToolRegistry', async () => {
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

  it('должен работать в lazy mode', async () => {
    // Arrange
    const lazyConfig = { ...fakeConfig, toolDiscoveryMode: 'lazy' as const };

    // Act
    const container = await createContainer(lazyConfig);
    const toolRegistry = container.get<ToolRegistry>(TYPES.ToolRegistry);

    // Assert
    expect(container).toBeDefined();
    expect(toolRegistry).toBeDefined();
  });

  it('должен работать в eager mode', async () => {
    // Arrange
    const eagerConfig = { ...fakeConfig, toolDiscoveryMode: 'eager' as const };

    // Act
    const container = await createContainer(eagerConfig);
    const toolRegistry = container.get<ToolRegistry>(TYPES.ToolRegistry);
    const allTools = toolRegistry.getAllTools();

    // Assert
    expect(container).toBeDefined();
    expect(toolRegistry).toBeDefined();
    expect(allTools.length).toBeGreaterThan(0); // В eager mode все tools загружены
  });

  it('должен поддерживать cloudOrgId конфигурацию', async () => {
    // Arrange
    const cloudConfig = {
      ...fakeConfig,
      cloudOrgId: 'bpf3crucp1v2fake',
      orgId: undefined,
    };

    // Act
    const container = await createContainer(cloudConfig);

    // Assert
    expect(container).toBeDefined();
    expect(container.isBound(TYPES.HttpClient)).toBe(true);
  });

  it('должен создавать Singleton instances', async () => {
    // Arrange
    const container = await createContainer(fakeConfig);

    // Act
    const logger1 = container.get<Logger>(TYPES.Logger);
    const logger2 = container.get<Logger>(TYPES.Logger);

    // Assert - Должен быть тот же экземпляр
    expect(logger1).toBe(logger2);
  });
});
