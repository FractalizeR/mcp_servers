/**
 * Smoke Test: MCP Server Lifecycle
 *
 * Проверяет базовый lifecycle MCP сервера без обращения к реальному API
 * Использует fake tokens для инициализации
 */

import { describe, it, expect } from 'vitest';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { createContainer } from '#composition-root/container.js';
import { TYPES } from '#composition-root/types.js';
import type { ServerConfig } from '#config';
import type { ToolRegistry } from '@mcp-framework/core';

describe('MCP Server Lifecycle (Smoke)', () => {
  const fakeConfig: ServerConfig = {
    token: 'OAuth fake-token-for-testing',
    orgId: 'fake-org-id',
    apiBase: 'https://api.wiki.yandex.net',
    requestTimeout: 30000,
    logLevel: 'error', // Минимум логов для smoke теста
    prettyLogs: false,
    toolDiscoveryMode: 'lazy',
    essentialTools: ['yw_ping'], // С подчеркиванием (автонормализация)
  };

  it('должен создать MCP server instance', () => {
    // Act
    const server = new Server(
      {
        name: 'test-server',
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

  it('должен создать DI container и получить ToolRegistry', async () => {
    // Act
    const container = await createContainer(fakeConfig);
    const toolRegistry = container.get<ToolRegistry>(TYPES.ToolRegistry);

    // Assert
    expect(container).toBeDefined();
    expect(toolRegistry).toBeDefined();
  });

  it('должен инициализироваться без ошибок (без реального API)', async () => {
    // Arrange & Act
    const createServerComponents = async () => {
      const container = await createContainer(fakeConfig);
      const toolRegistry = container.get<ToolRegistry>(TYPES.ToolRegistry);
      const server = new Server(
        { name: 'test', version: '1.0.0' },
        { capabilities: { tools: {} } }
      );
      return { container, toolRegistry, server };
    };

    // Assert - не должно быть ошибок при создании
    await expect(createServerComponents()).resolves.toBeDefined();
  });

  it('должен принимать различные конфигурации логирования', async () => {
    // Arrange
    const configs: ServerConfig[] = [
      { ...fakeConfig, logLevel: 'debug', prettyLogs: false },
      { ...fakeConfig, logLevel: 'info', prettyLogs: true },
      { ...fakeConfig, logLevel: 'warn', prettyLogs: false },
      { ...fakeConfig, logLevel: 'error', prettyLogs: false },
    ];

    // Act & Assert
    for (const config of configs) {
      await expect(createContainer(config)).resolves.toBeDefined();
    }
  });

  it('должен принимать cloudOrgId вместо orgId', async () => {
    // Arrange
    const cloudConfig: ServerConfig = {
      ...fakeConfig,
      cloudOrgId: 'bpf3crucp1v2fake',
      orgId: undefined,
    };

    // Act & Assert
    await expect(createContainer(cloudConfig)).resolves.toBeDefined();
  });

  it('должен создавать server с минимальной конфигурацией', async () => {
    // Arrange
    const minimalConfig: ServerConfig = {
      token: 'OAuth minimal-fake-token',
      apiBase: 'https://api.wiki.yandex.net',
      requestTimeout: 30000,
      logLevel: 'error',
      prettyLogs: false,
      toolDiscoveryMode: 'lazy',
      essentialTools: ['yw_ping'], // С подчеркиванием (автонормализация)
    };

    // Act & Assert
    await expect(createContainer(minimalConfig)).resolves.toBeDefined();
  });

  it('должен поддерживать lazy и eager режимы discovery', async () => {
    // Arrange
    const lazyConfig = {
      ...fakeConfig,
      toolDiscoveryMode: 'lazy' as const,
      essentialTools: ['yw_ping'], // С подчеркиванием (автонормализация)
    };
    const eagerConfig = { ...fakeConfig, toolDiscoveryMode: 'eager' as const };

    // Act
    const lazyContainer = await createContainer(lazyConfig);
    const eagerContainer = await createContainer(eagerConfig);

    const lazyRegistry = lazyContainer.get<ToolRegistry>(TYPES.ToolRegistry);
    const eagerRegistry = eagerContainer.get<ToolRegistry>(TYPES.ToolRegistry);

    // В обоих режимах регистрируются все tools (getAllTools)
    // Разница только в том, какие tools экспортируются через getDefinitionsByMode
    const lazyDefinitions = lazyRegistry.getEssentialDefinitions(lazyConfig.essentialTools);
    const eagerDefinitions = eagerRegistry.getDefinitions();

    // Assert
    expect(lazyRegistry).toBeDefined();
    expect(eagerRegistry).toBeDefined();
    // В lazy mode только essential tools
    expect(lazyDefinitions.length).toBe(1);
    // В eager mode все tools
    expect(eagerDefinitions.length).toBeGreaterThan(5);
  });
});
