/**
 * Smoke Test: MCP Server Lifecycle
 *
 * Проверяет базовый lifecycle MCP сервера без обращения к реальному API
 * Использует fake tokens для инициализации
 */

import { describe, it, expect } from 'vitest';
import { Server } from '@modelcontextprotocol/server';
import { createContainer } from '#composition-root/container.js';
import { TYPES } from '#composition-root/types.js';
import type { ServerConfig } from '#config';
import type { ToolRegistry } from '@fractalizer/mcp-core';
import { createServerConfigFixture } from '#helpers/index.js';

describe('MCP Server Lifecycle (Smoke)', () => {
  const fakeConfig: ServerConfig = createServerConfigFixture();

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
    const { orgId: _orgId, ...fakeConfigWithoutOrgId } = fakeConfig;
    const cloudConfig: ServerConfig = {
      ...fakeConfigWithoutOrgId,
      cloudOrgId: 'bpf3crucp1v2fake',
    };

    // Act & Assert
    await expect(createContainer(cloudConfig)).resolves.toBeDefined();
  });

  it('должен создавать server с минимальной конфигурацией', async () => {
    // Arrange
    const minimalConfig: ServerConfig = createServerConfigFixture({
      token: 'OAuth minimal-fake-token',
    });

    // Act & Assert
    await expect(createContainer(minimalConfig)).resolves.toBeDefined();
  });

  it('tools/list всегда возвращает полный набор инструментов (lazy discovery убран)', async () => {
    // Act
    const container = await createContainer(fakeConfig);
    const registry = container.get<ToolRegistry>(TYPES.ToolRegistry);
    const definitions = registry.getDefinitions();

    // Assert
    expect(registry).toBeDefined();
    expect(definitions.length).toBeGreaterThan(5);
  });

  it('DoD: два последовательных tools/list дают побайтово одинаковый список', async () => {
    // Act
    const container = await createContainer(fakeConfig);
    const registry = container.get<ToolRegistry>(TYPES.ToolRegistry);
    const first = registry.getDefinitions();
    const second = registry.getDefinitions();

    // Assert
    expect(JSON.stringify(second)).toBe(JSON.stringify(first));
  });
});
