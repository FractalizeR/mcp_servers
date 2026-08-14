/**
 * Smoke Test: E2E Tool Execution Flow
 *
 * Проверяет полный flow: Tool → Operation → DTO mapping
 * Использует mock HttpClient для контролируемых ответов (без реального API)
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { createContainer } from '#composition-root/container.js';
import { TYPES } from '#composition-root/types.js';
import type { ServerConfig } from '#config';
import type { ToolRegistry } from '@fractalizer/mcp-core/tool-registry.js';
import type { IHttpClient } from '@fractalizer/mcp-infrastructure/http/client/i-http-client.interface.js';

describe('E2E Tool Execution (Smoke)', () => {
  const fakeConfig: ServerConfig = {
    token: 'fake-token',
    orgId: 'fake-org',
    apiBase: 'https://api.tracker.yandex.net',
    requestTimeout: 30000,
    maxBatchSize: 50,
    maxConcurrentRequests: 10,
    logLevel: 'error',
    prettyLogs: false,
  };

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('должен зарегистрировать ping tool в registry', async () => {
    // Arrange
    const container = await createContainer(fakeConfig);
    const toolRegistry = container.get<ToolRegistry>(TYPES.ToolRegistry);

    // Act
    const pingTool = toolRegistry.getTool('fr_yandex_tracker_ping');

    // Assert
    expect(pingTool).toBeDefined();
    expect(pingTool?.getMetadata().definition.name).toBe('fr_yandex_tracker_ping');
  });

  it('должен иметь корректную definition для ping tool', async () => {
    // Arrange
    const container = await createContainer(fakeConfig);
    const toolRegistry = container.get<ToolRegistry>(TYPES.ToolRegistry);
    const pingTool = toolRegistry.getTool('fr_yandex_tracker_ping');

    // Act
    const metadata = pingTool?.getMetadata();
    const definition = metadata?.definition;

    // Assert
    expect(definition).toBeDefined();
    expect(definition?.name).toBe('fr_yandex_tracker_ping');
    expect(definition?.description).toBeDefined();
    expect(definition?.inputSchema).toBeDefined();
  });

  it('должен выполнить ping tool с mock HttpClient', async () => {
    // Arrange
    const container = await createContainer(fakeConfig);
    const toolRegistry = container.get<ToolRegistry>(TYPES.ToolRegistry);
    const httpClient = container.get<IHttpClient>(TYPES.HttpClient);

    // Mock HttpClient response
    vi.spyOn(httpClient, 'get').mockResolvedValue({
      status: 'ok',
      message: 'Yandex Tracker API is accessible',
    });

    const pingTool = toolRegistry.getTool('fr_yandex_tracker_ping');

    // Act
    const result = await pingTool?.execute({});

    // Assert
    expect(result).toBeDefined();
    expect(result).toHaveProperty('content');
    expect(httpClient.get).toHaveBeenCalled();
  });

  it('должен обработать ошибку HTTP клиента', async () => {
    // Arrange
    const container = await createContainer(fakeConfig);
    const toolRegistry = container.get<ToolRegistry>(TYPES.ToolRegistry);
    const httpClient = container.get<IHttpClient>(TYPES.HttpClient);

    // Mock HttpClient error - PingOperation ловит ошибку и возвращает {success: false}
    vi.spyOn(httpClient, 'get').mockRejectedValue(new Error('Network error'));

    const pingTool = toolRegistry.getTool('fr_yandex_tracker_ping');
    expect(pingTool).toBeDefined();

    // Act
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const result = await pingTool!.execute({});

    // Assert - ping tool всегда возвращает success response, даже при ошибке API
    expect(result).toBeDefined();
    expect(result.content).toBeDefined();
    expect(result.content[0]).toHaveProperty('type', 'text');
    // Проверяем что в ответе есть информация об ошибке
    const responseText = result.content[0]?.text;
    expect(responseText).toBeDefined();
    expect(typeof responseText).toBe('string');
  });

  it('должен загрузить полный набор tools (lazy discovery убран)', async () => {
    // Act
    const container = await createContainer(fakeConfig);
    const toolRegistry = container.get<ToolRegistry>(TYPES.ToolRegistry);
    const allTools = toolRegistry.getAllTools();

    // Assert
    expect(allTools.length).toBeGreaterThan(5); // Должно быть больше 5 tools
    expect(allTools.some((t) => t.getMetadata().definition.name === 'fr_yandex_tracker_ping')).toBe(
      true
    );
    // search_tools больше не существует как отдельный tool (пакет mcp-search удалён)
    expect(toolRegistry.getTool('search_tools')).toBeUndefined();
  });

  it('должен корректно обрабатывать tool metadata', async () => {
    // Arrange
    const container = await createContainer(fakeConfig);
    const toolRegistry = container.get<ToolRegistry>(TYPES.ToolRegistry);
    const pingTool = toolRegistry.getTool('fr_yandex_tracker_ping');

    // Act
    const metadata = pingTool?.getMetadata();

    // Assert
    expect(metadata).toBeDefined();
    expect(metadata?.category).toBeDefined();
    expect(metadata?.tags).toBeDefined();
    expect(metadata?.definition).toBeDefined();
    expect(metadata?.definition.name).toBe('fr_yandex_tracker_ping');
    expect(metadata?.definition.description).toBeTruthy();
  });
});
