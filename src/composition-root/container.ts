/**
 * InversifyJS DI Container
 *
 * Централизованная конфигурация всех зависимостей проекта.
 * Использует Symbol-based токены для типобезопасной привязки.
 */

import 'reflect-metadata';
import { Container } from 'inversify';
import type { ServerConfig } from '@types';
import { Logger } from '@infrastructure/logging/index.js';
import { TYPES } from '@composition-root/types.js';

// HTTP Layer
import { HttpClient } from '@infrastructure/http/client/http-client.js';
import { RetryHandler } from '@infrastructure/http/retry/retry-handler.js';
import type { RetryStrategy } from '@infrastructure/http/retry/retry-strategy.interface.js';
import { ExponentialBackoffStrategy } from '@infrastructure/http/retry/exponential-backoff.strategy.js';

// Cache Layer
import type { CacheManager } from '@infrastructure/cache/cache-manager.interface.js';
import { NoOpCache } from '@infrastructure/cache/no-op-cache.js';

// Yandex Tracker Operations
import { PingOperation } from '@tracker_api/operations/user/ping.operation.js';
import { GetIssuesOperation } from '@tracker_api/operations/issue/get-issues.operation.js';

// Yandex Tracker Facade
import { YandexTrackerFacade } from '@tracker_api/facade/yandex-tracker.facade.js';

// Tools
import { PingTool } from '@mcp/tools/ping.tool.js';
import { GetIssuesTool } from '@mcp/tools/api/issues/get/index.js';

// Tool Registry
import { ToolRegistry } from '@mcp/tool-registry.js';

/**
 * Регистрация базовых зависимостей (config, logger)
 */
function bindInfrastructure(container: Container, config: ServerConfig): void {
  container.bind<ServerConfig>(TYPES.ServerConfig).toConstantValue(config);

  // Logger создаётся на основе конфигурации
  container.bind<Logger>(TYPES.Logger).toDynamicValue(() => {
    return new Logger({
      level: config.logLevel,
      logsDir: config.prettyLogs ? undefined : config.logsDir,
      pretty: config.prettyLogs,
      rotation: {
        maxSize: config.logMaxSize,
        maxFiles: config.logMaxFiles,
      },
    });
  });
}

/**
 * Регистрация HTTP слоя (retry, http client)
 */
function bindHttpLayer(container: Container): void {
  container
    .bind<RetryStrategy>(TYPES.RetryStrategy)
    .toConstantValue(new ExponentialBackoffStrategy(3, 1000, 10000));

  container.bind<HttpClient>(TYPES.HttpClient).toDynamicValue(() => {
    const retryStrategy = container.get<RetryStrategy>(TYPES.RetryStrategy);
    const loggerInstance = container.get<Logger>(TYPES.Logger);
    const configInstance = container.get<ServerConfig>(TYPES.ServerConfig);

    return new HttpClient(
      {
        baseURL: configInstance.apiBase,
        timeout: configInstance.requestTimeout,
        token: configInstance.token,
        orgId: configInstance.orgId,
        cloudOrgId: configInstance.cloudOrgId,
        maxBatchSize: configInstance.maxBatchSize,
        maxConcurrentRequests: configInstance.maxConcurrentRequests,
      },
      loggerInstance,
      retryStrategy
    );
  });

  container.bind<RetryHandler>(TYPES.RetryHandler).toDynamicValue(() => {
    const retryStrategy = container.get<RetryStrategy>(TYPES.RetryStrategy);
    const loggerInstance = container.get<Logger>(TYPES.Logger);
    return new RetryHandler(retryStrategy, loggerInstance);
  });
}

/**
 * Регистрация кеша
 */
function bindCacheLayer(container: Container): void {
  container.bind<CacheManager>(TYPES.CacheManager).to(NoOpCache);
}

/**
 * Регистрация операций Yandex Tracker
 */
function bindOperations(container: Container): void {
  // Все операции наследуют BaseOperation с конструктором (httpClient, retryHandler, cacheManager, logger)
  const operations = [
    { type: TYPES.PingOperation, class: PingOperation },
    { type: TYPES.GetIssuesOperation, class: GetIssuesOperation },
  ];

  operations.forEach(({ type, class: OperationClass }) => {
    container.bind(type).toDynamicValue(() => {
      const httpClient = container.get<HttpClient>(TYPES.HttpClient);
      const retryHandler = container.get<RetryHandler>(TYPES.RetryHandler);
      const cacheManager = container.get<CacheManager>(TYPES.CacheManager);
      const loggerInstance = container.get<Logger>(TYPES.Logger);
      return new OperationClass(httpClient, retryHandler, cacheManager, loggerInstance);
    });
  });
}

/**
 * Регистрация Facade
 */
function bindFacade(container: Container): void {
  container.bind<YandexTrackerFacade>(TYPES.YandexTrackerFacade).toDynamicValue(() => {
    const httpClient = container.get<HttpClient>(TYPES.HttpClient);
    const retryHandler = container.get<RetryHandler>(TYPES.RetryHandler);
    const cacheManager = container.get<CacheManager>(TYPES.CacheManager);
    const loggerInstance = container.get<Logger>(TYPES.Logger);
    const configInstance = container.get<ServerConfig>(TYPES.ServerConfig);
    return new YandexTrackerFacade(
      httpClient,
      retryHandler,
      cacheManager,
      loggerInstance,
      configInstance
    );
  });
}

/**
 * Регистрация Tools
 */
function bindTools(container: Container): void {
  const tools = [
    { type: TYPES.PingTool, class: PingTool },
    { type: TYPES.GetIssuesTool, class: GetIssuesTool },
  ];

  tools.forEach(({ type, class: ToolClass }) => {
    container.bind(type).toDynamicValue(() => {
      const facade = container.get<YandexTrackerFacade>(TYPES.YandexTrackerFacade);
      const loggerInstance = container.get<Logger>(TYPES.Logger);
      return new ToolClass(facade, loggerInstance);
    });
  });
}

/**
 * Регистрация ToolRegistry
 */
function bindToolRegistry(container: Container): void {
  container.bind<ToolRegistry>(TYPES.ToolRegistry).toDynamicValue(() => {
    const facade = container.get<YandexTrackerFacade>(TYPES.YandexTrackerFacade);
    const loggerInstance = container.get<Logger>(TYPES.Logger);
    return new ToolRegistry(facade, loggerInstance);
  });
}

/**
 * Создание и конфигурация DI контейнера
 */
export function createContainer(config: ServerConfig): Container {
  const container = new Container({
    defaultScope: 'Singleton', // Все зависимости по умолчанию Singleton
  });

  bindInfrastructure(container, config);
  bindHttpLayer(container);
  bindCacheLayer(container);
  bindOperations(container);
  bindFacade(container);
  bindTools(container);
  bindToolRegistry(container);

  return container;
}
