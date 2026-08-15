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

describe('MCP Server Lifecycle (Smoke)', () => {
  const fakeConfig: ServerConfig = {
    token: 'fake-token-for-testing',
    orgId: 'fake-org-id',
    apiBase: 'https://api.tracker.yandex.net',
    requestTimeout: 30000,
    maxBatchSize: 50,
    maxConcurrentRequests: 10,
    logLevel: 'error', // Минимум логов для smoke теста
    prettyLogs: false,
    logsDir: '/tmp/logs',
    logMaxSize: 10485760,
    logMaxFiles: 10,
  };

  // L10 (REVIEW_MCP_SDK_FINDINGS.md): здесь раньше был тест
  // «должен создать MCP server instance», который создавал `new Server(...)`
  // из SDK напрямую и проверял `toBeDefined()`/`toBeInstanceOf(Server)` —
  // это проверка конструктора самого SDK, не нашего кода: всегда зелёный
  // и ничего не доказывает про этот пакет. Удалён; `Server` из
  // `@modelcontextprotocol/server` остаётся импортированным ниже — он
  // используется в тесте «должен инициализироваться без ошибок», который
  // ЭТО ЖЕ создание SDK-объекта комбинирует с реальным createContainer()
  // нашего composition root, что уже даёт содержательную проверку.

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
    const { orgId, ...fakeConfigWithoutOrgId } = fakeConfig;
    void orgId; // exactOptionalPropertyTypes: убираем ключ, а не присваиваем undefined
    const cloudConfig: ServerConfig = {
      ...fakeConfigWithoutOrgId,
      cloudOrgId: 'bpf3crucp1v2fake',
    };

    // Act & Assert
    await expect(createContainer(cloudConfig)).resolves.toBeDefined();
  });

  it('должен создавать server с минимальной конфигурацией', async () => {
    // Arrange
    const minimalConfig: ServerConfig = {
      token: 'minimal-fake-token',
      apiBase: 'https://api.tracker.yandex.net',
      requestTimeout: 30000,
      maxBatchSize: 50,
      maxConcurrentRequests: 10,
      logLevel: 'error',
      prettyLogs: false,
      logsDir: '/tmp/logs',
      logMaxSize: 10485760,
      logMaxFiles: 10,
    };

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
    expect(definitions.length).toBeGreaterThan(10);
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
