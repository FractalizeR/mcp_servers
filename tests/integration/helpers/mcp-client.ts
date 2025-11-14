/**
 * Тестовый MCP клиент для интеграционных тестов
 * Напрямую взаимодействует с ToolRegistry без запуска реального MCP сервера
 */

import { Container } from 'inversify';
import type { ToolRegistry } from '@mcp/tool-registry.js';
import type { ServerConfig } from '@types';
import { TYPES } from '@composition-root/types.js';
import { createContainer } from '@composition-root/index.js';

/**
 * Результат выполнения MCP tool
 */
export interface ToolExecutionResult {
  content: Array<{
    type: string;
    text: string;
  }>;
  isError?: boolean;
}

/**
 * Тестовый MCP клиент
 */
export class TestMCPClient {
  private container: Container;
  private toolRegistry: ToolRegistry;

  private constructor(container: Container, toolRegistry: ToolRegistry) {
    this.container = container;
    this.toolRegistry = toolRegistry;
  }

  /**
   * Создать экземпляр TestMCPClient (async factory)
   */
  static async create(config: ServerConfig): Promise<TestMCPClient> {
    const container = await createContainer(config);
    const toolRegistry = container.get<ToolRegistry>(TYPES.ToolRegistry);
    return new TestMCPClient(container, toolRegistry);
  }

  /**
   * Вызвать MCP tool по имени с параметрами
   */
  async callTool(name: string, args: Record<string, unknown>): Promise<ToolExecutionResult> {
    return this.toolRegistry.execute(name, args);
  }

  /**
   * Получить список доступных tools
   */
  async listTools(): Promise<string[]> {
    const definitions = this.toolRegistry.getDefinitions();
    return definitions.map((def) => def.name);
  }

  /**
   * Получить DI контейнер (для продвинутых тестов)
   */
  getContainer(): Container {
    return this.container;
  }

  /**
   * Получить ToolRegistry (для продвинутых тестов)
   */
  getToolRegistry(): ToolRegistry {
    return this.toolRegistry;
  }
}

/**
 * Создать тестовый MCP клиент с переопределённой конфигурацией
 */
export async function createTestClient(
  configOverrides: Partial<ServerConfig> = {}
): Promise<TestMCPClient> {
  const defaultConfig: ServerConfig = {
    apiBase: 'https://api.tracker.yandex.net',
    orgId: 'test-org-id',
    token: 'test-oauth-token',
    requestTimeout: 10000,
    logLevel: 'silent', // Отключаем логи в тестах
    logsDir: '', // Отключаем файловое логирование в тестах
    prettyLogs: false,
    logMaxSize: 1048576, // 1MB в байтах (минимум для корректной работы ротации)
    logMaxFiles: 20,
    maxBatchSize: 100,
    maxConcurrentRequests: 5,
  };

  const config: ServerConfig = { ...defaultConfig, ...configOverrides };

  return await TestMCPClient.create(config);
}
