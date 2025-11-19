/**
 * Unit тесты для DI Container
 */

import { describe, it, expect } from 'vitest';
import type { Container } from 'inversify';
import type { ServerConfig } from '@mcp-framework/infrastructure/types.js';
import { createContainer } from '@composition-root/container.js';
import { TYPES } from '@composition-root/types.js';
import type { Logger } from '@mcp-framework/infrastructure/logging/index.js';
import type { HttpClient } from '@mcp-framework/infrastructure/http/client/http-client.js';
import type { CacheManager } from '@mcp-framework/infrastructure/cache/cache-manager.interface.js';
import type { YandexTrackerFacade } from '@tracker_api/facade/yandex-tracker.facade.js';
import type { ToolRegistry } from '@mcp-framework/core/tool-registry.js';

describe('Container', () => {
  let container: Container;
  let mockConfig: ServerConfig;

  beforeEach(async () => {
    mockConfig = {
      token: 'test-token',
      orgId: 'test-org',
      apiBase: 'https://api.tracker.yandex.net',
      requestTimeout: 30000,
      maxBatchSize: 50,
      maxConcurrentRequests: 10,
      logLevel: 'info',
      logsDir: '/tmp/logs',
      logMaxSize: 10485760,
      logMaxFiles: 10,
      prettyLogs: false,
      toolDiscoveryMode: 'lazy', // По умолчанию lazy mode для обратной совместимости тестов
      essentialTools: ['fr_yandex_tracker_ping', 'search_tools'],
    };

    container = await createContainer(mockConfig);
  });

  describe('Container initialization', () => {
    it('должен создать экземпляр контейнера', () => {
      expect(container).toBeDefined();
      // Container создан с defaultScope: 'Singleton'
      // Проверяется поведением в тестах Singleton scope
    });
  });

  describe('Infrastructure dependencies', () => {
    it('должен resolve Logger', () => {
      const logger = container.get<Logger>(TYPES.Logger);
      expect(logger).toBeDefined();
      expect(logger).toHaveProperty('info');
      expect(logger).toHaveProperty('error');
      expect(logger).toHaveProperty('warn');
      expect(logger).toHaveProperty('debug');
    });

    it('должен resolve HttpClient', () => {
      const httpClient = container.get<HttpClient>(TYPES.HttpClient);
      expect(httpClient).toBeDefined();
      expect(httpClient).toHaveProperty('get');
      expect(httpClient).toHaveProperty('post');
      expect(httpClient).toHaveProperty('patch');
    });

    it('должен resolve CacheManager', () => {
      const cacheManager = container.get<CacheManager>(TYPES.CacheManager);
      expect(cacheManager).toBeDefined();
      expect(cacheManager).toHaveProperty('get');
      expect(cacheManager).toHaveProperty('set');
    });

    it('должен resolve ServerConfig', () => {
      const config = container.get<ServerConfig>(TYPES.ServerConfig);
      expect(config).toBeDefined();
      expect(config.token).toBe('test-token');
      expect(config.orgId).toBe('test-org');
    });

    it('должен resolve RetryStrategy', () => {
      const retryStrategy = container.get(TYPES.RetryStrategy);
      expect(retryStrategy).toBeDefined();
      expect(retryStrategy).toHaveProperty('getDelay');
    });
  });

  describe('Operations dependencies', () => {
    it('должен resolve GetIssuesOperation', () => {
      const operation = container.get(Symbol.for('GetIssuesOperation'));
      expect(operation).toBeDefined();
      expect(operation).toHaveProperty('execute');
    });

    it('должен resolve FindIssuesOperation', () => {
      const operation = container.get(Symbol.for('FindIssuesOperation'));
      expect(operation).toBeDefined();
      expect(operation).toHaveProperty('execute');
    });

    it('должен resolve CreateIssueOperation', () => {
      const operation = container.get(Symbol.for('CreateIssueOperation'));
      expect(operation).toBeDefined();
      expect(operation).toHaveProperty('execute');
    });

    it('должен resolve UpdateIssueOperation', () => {
      const operation = container.get(Symbol.for('UpdateIssueOperation'));
      expect(operation).toBeDefined();
      expect(operation).toHaveProperty('execute');
    });

    it('должен resolve GetIssueChangelogOperation', () => {
      const operation = container.get(Symbol.for('GetIssueChangelogOperation'));
      expect(operation).toBeDefined();
      expect(operation).toHaveProperty('execute');
    });

    it('должен resolve GetIssueTransitionsOperation', () => {
      const operation = container.get(Symbol.for('GetIssueTransitionsOperation'));
      expect(operation).toBeDefined();
      expect(operation).toHaveProperty('execute');
    });

    it('должен resolve TransitionIssueOperation', () => {
      const operation = container.get(Symbol.for('TransitionIssueOperation'));
      expect(operation).toBeDefined();
      expect(operation).toHaveProperty('execute');
    });

    it('должен resolve PingOperation', () => {
      const operation = container.get(Symbol.for('PingOperation'));
      expect(operation).toBeDefined();
      expect(operation).toHaveProperty('execute');
    });
  });

  describe('Facade dependencies', () => {
    it('должен resolve YandexTrackerFacade', () => {
      const facade = container.get<YandexTrackerFacade>(TYPES.YandexTrackerFacade);
      expect(facade).toBeDefined();
      expect(facade).toHaveProperty('getIssues');
      expect(facade).toHaveProperty('findIssues');
      expect(facade).toHaveProperty('createIssue');
      expect(facade).toHaveProperty('updateIssue');
    });

    it('должен инжектировать Container в Facade', () => {
      const facade = container.get<YandexTrackerFacade>(TYPES.YandexTrackerFacade);
      expect(facade).toBeDefined();
      // Facade должен иметь доступ к операциям через контейнер
      expect(facade).toHaveProperty('getIssues');
    });
  });

  describe('Tools dependencies', () => {
    it('должен resolve GetIssuesTool', () => {
      const tool = container.get(Symbol.for('GetIssuesTool'));
      expect(tool).toBeDefined();
      expect(tool).toHaveProperty('execute');
      expect(tool).toHaveProperty('getDefinition');
    });

    it('должен resolve FindIssuesTool', () => {
      const tool = container.get(Symbol.for('FindIssuesTool'));
      expect(tool).toBeDefined();
      expect(tool).toHaveProperty('execute');
    });

    it('должен resolve CreateIssueTool', () => {
      const tool = container.get(Symbol.for('CreateIssueTool'));
      expect(tool).toBeDefined();
      expect(tool).toHaveProperty('execute');
    });

    it('должен resolve ToolRegistry', () => {
      const registry = container.get<ToolRegistry>(TYPES.ToolRegistry);
      expect(registry).toBeDefined();
      expect(registry).toHaveProperty('getDefinitions');
      expect(registry).toHaveProperty('getTool');
      expect(registry).toHaveProperty('getAllTools');
      expect(registry).toHaveProperty('execute');
    });

    // SearchToolsTool и ToolSearchEngine тесты перенесены в "Tool Discovery Mode" секцию
  });

  describe('Singleton scope', () => {
    it('должен возвращать один и тот же экземпляр Logger', () => {
      const logger1 = container.get<Logger>(TYPES.Logger);
      const logger2 = container.get<Logger>(TYPES.Logger);
      expect(logger1).toBe(logger2);
    });

    it('должен возвращать один и тот же экземпляр HttpClient', () => {
      const client1 = container.get<HttpClient>(TYPES.HttpClient);
      const client2 = container.get<HttpClient>(TYPES.HttpClient);
      expect(client1).toBe(client2);
    });

    it('должен возвращать один и тот же экземпляр YandexTrackerFacade', () => {
      const facade1 = container.get<YandexTrackerFacade>(TYPES.YandexTrackerFacade);
      const facade2 = container.get<YandexTrackerFacade>(TYPES.YandexTrackerFacade);
      expect(facade1).toBe(facade2);
    });

    it('должен возвращать один и тот же экземпляр ToolRegistry', () => {
      const registry1 = container.get<ToolRegistry>(TYPES.ToolRegistry);
      const registry2 = container.get<ToolRegistry>(TYPES.ToolRegistry);
      expect(registry1).toBe(registry2);
    });

    it('должен возвращать один и тот же экземпляр Operation', () => {
      const op1 = container.get(Symbol.for('GetIssuesOperation'));
      const op2 = container.get(Symbol.for('GetIssuesOperation'));
      expect(op1).toBe(op2);
    });

    it('должен возвращать один и тот же экземпляр Tool', () => {
      const tool1 = container.get(Symbol.for('GetIssuesTool'));
      const tool2 = container.get(Symbol.for('GetIssuesTool'));
      expect(tool1).toBe(tool2);
    });
  });

  describe('No circular dependencies', () => {
    it('должен создать контейнер без ошибок', async () => {
      await expect(createContainer(mockConfig)).resolves.toBeDefined();
    });

    it('должен resolve все зарегистрированные типы без ошибок', () => {
      expect(() => {
        container.get<Logger>(TYPES.Logger);
        container.get<HttpClient>(TYPES.HttpClient);
        container.get<CacheManager>(TYPES.CacheManager);
        container.get<YandexTrackerFacade>(TYPES.YandexTrackerFacade);
        container.get<ToolRegistry>(TYPES.ToolRegistry);
        // ToolSearchEngine доступен только в lazy mode (по умолчанию в beforeEach)
        container.get(TYPES.ToolSearchEngine);
      }).not.toThrow();
    });

    it('должен resolve все Operations без ошибок', () => {
      expect(() => {
        container.get(Symbol.for('GetIssuesOperation'));
        container.get(Symbol.for('FindIssuesOperation'));
        container.get(Symbol.for('CreateIssueOperation'));
        container.get(Symbol.for('UpdateIssueOperation'));
        container.get(Symbol.for('PingOperation'));
      }).not.toThrow();
    });

    it('должен resolve все Tools без ошибок', () => {
      expect(() => {
        container.get(Symbol.for('GetIssuesTool'));
        container.get(Symbol.for('FindIssuesTool'));
        container.get(Symbol.for('CreateIssueTool'));
        // SearchToolsTool доступен только в lazy mode (по умолчанию в beforeEach)
        container.get(Symbol.for('SearchToolsTool'));
      }).not.toThrow();
    });
  });

  describe('Configuration propagation', () => {
    it('должен передать конфигурацию в HttpClient', () => {
      const httpClient = container.get<HttpClient>(TYPES.HttpClient);
      expect(httpClient).toBeDefined();
      // HttpClient должен быть настроен с параметрами из config
    });

    it('должен передать конфигурацию в Logger', () => {
      const logger = container.get<Logger>(TYPES.Logger);
      expect(logger).toBeDefined();
      // Logger должен быть настроен с logLevel из config
    });
  });

  describe('Tool Discovery Mode: eager', () => {
    let eagerContainer: Container;
    let eagerConfig: ServerConfig;

    beforeEach(async () => {
      eagerConfig = {
        token: 'test-token',
        orgId: 'test-org',
        apiBase: 'https://api.tracker.yandex.net',
        requestTimeout: 30000,
        maxBatchSize: 50,
        maxConcurrentRequests: 10,
        logLevel: 'info',
        logsDir: '/tmp/logs',
        logMaxSize: 10485760,
        logMaxFiles: 10,
        prettyLogs: false,
        toolDiscoveryMode: 'eager',
        essentialTools: ['fr_yandex_tracker_ping'], // В eager mode только ping
      };

      eagerContainer = await createContainer(eagerConfig);
    });

    it('должен создать контейнер в eager mode', () => {
      expect(eagerContainer).toBeDefined();
    });

    it('НЕ должен регистрировать SearchToolsTool в eager mode', () => {
      // SearchToolsTool не должен быть в контейнере
      expect(() => {
        eagerContainer.get(Symbol.for('SearchToolsTool'));
      }).toThrow();
    });

    it('НЕ должен регистрировать ToolSearchEngine в eager mode', () => {
      // ToolSearchEngine не должен быть в контейнере
      expect(() => {
        eagerContainer.get(TYPES.ToolSearchEngine);
      }).toThrow();
    });

    it('search_tools НЕ должен быть в ToolRegistry в eager mode', () => {
      const registry = eagerContainer.get<ToolRegistry>(TYPES.ToolRegistry);
      const definitions = registry.getDefinitions();

      // Проверяем, что search_tools отсутствует
      const searchToolDefinition = definitions.find((def) => def.name === 'search_tools');
      expect(searchToolDefinition).toBeUndefined();

      // Проверяем, что getTool возвращает undefined
      const searchTool = registry.getTool('search_tools');
      expect(searchTool).toBeUndefined();
    });

    it('должен иметь все остальные tools кроме search_tools в eager mode', () => {
      const registry = eagerContainer.get<ToolRegistry>(TYPES.ToolRegistry);
      const definitions = registry.getDefinitions();

      // Проверяем, что есть другие инструменты
      expect(definitions.length).toBeGreaterThan(0);

      // Проверяем, что ping tool доступен
      const pingTool = definitions.find((def) => def.name === 'fr_yandex_tracker_ping');
      expect(pingTool).toBeDefined();

      // Проверяем, что get_issues tool доступен
      const getIssuesTool = definitions.find((def) => def.name === 'fr_yandex_tracker_get_issues');
      expect(getIssuesTool).toBeDefined();
    });

    it('ToolRegistry должен возвращать все tools в eager mode через getDefinitionsByMode', () => {
      const registry = eagerContainer.get<ToolRegistry>(TYPES.ToolRegistry);
      const definitions = registry.getDefinitionsByMode('eager');

      // В eager mode должны быть все инструменты кроме search_tools
      expect(definitions.length).toBeGreaterThan(0);

      // search_tools НЕ должен быть в списке
      const searchToolDef = definitions.find((def) => def.name === 'search_tools');
      expect(searchToolDef).toBeUndefined();
    });
  });

  describe('Tool Discovery Mode: lazy', () => {
    it('должен регистрировать SearchToolsTool в lazy mode', () => {
      // В lazy mode (по умолчанию в beforeEach) SearchToolsTool должен быть доступен
      const tool = container.get(Symbol.for('SearchToolsTool'));
      expect(tool).toBeDefined();
      expect(tool).toHaveProperty('execute');
      expect(tool).toHaveProperty('getDefinition');
    });

    it('должен регистрировать ToolSearchEngine в lazy mode', () => {
      const searchEngine = container.get(TYPES.ToolSearchEngine);
      expect(searchEngine).toBeDefined();
      expect(searchEngine).toHaveProperty('search');
    });

    it('search_tools должен быть в ToolRegistry в lazy mode', () => {
      const registry = container.get<ToolRegistry>(TYPES.ToolRegistry);
      const definitions = registry.getDefinitions();

      const searchToolDefinition = definitions.find((def) => def.name === 'search_tools');
      expect(searchToolDefinition).toBeDefined();
      expect(searchToolDefinition?.description).toContain(
        'PRIMARY способ обнаружения инструментов'
      );

      const searchTool = registry.getTool('search_tools');
      expect(searchTool).toBeDefined();
      expect(searchTool?.getDefinition().name).toBe('search_tools');
    });
  });
});
