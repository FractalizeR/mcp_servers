/**
 * InversifyJS DI Container для Yandex Wiki
 */

import { Container } from 'inversify';
import type { ServerConfig } from '#config';
import { Logger } from '@fractalizer/mcp-infrastructure';
import { TYPES, TOOL_SYMBOLS, OPERATION_SYMBOLS } from '#composition-root/types.js';
import { validateDIRegistrations } from '#composition-root/validation.js';

// HTTP Layer
import type { IHttpClient, RetryStrategy } from '@fractalizer/mcp-infrastructure';
import { AxiosHttpClient, ExponentialBackoffStrategy } from '@fractalizer/mcp-infrastructure';

// Cache Layer
import type { CacheManager } from '@fractalizer/mcp-infrastructure';
import { InMemoryCacheManager } from '@fractalizer/mcp-infrastructure';

// Yandex Wiki Facade
import { YandexWikiFacade } from '#wiki_api/facade/yandex-wiki.facade.js';

// Tool Registry
import { ToolRegistry, ConfiguredToolAccessPolicy, ResourceRegistry } from '@fractalizer/mcp-core';

// Resource Registry (пакет 5.1.C.wiki)
import { WikiPageResourceProvider, WikiPageItemResourceProvider } from '#resources/index.js';

// Автоматически импортируемые определения
import { TOOL_CLASSES, OPERATION_CLASSES, bindFacadeServices } from './definitions/index.js';

/**
 * Регистрация базовых зависимостей
 */
function bindInfrastructure(container: Container, config: ServerConfig): void {
  container.bind<ServerConfig>(TYPES.ServerConfig).toConstantValue(config);

  container.bind<Logger>(TYPES.Logger).toDynamicValue(() => {
    return new Logger({
      level: config.logLevel,
      ...(config.logsDir && { logsDir: config.logsDir }),
      pretty: config.prettyLogs,
      rotation: {
        maxSize: config.logMaxSize,
        maxFiles: config.logMaxFiles,
      },
    });
  });
}

/**
 * Регистрация HTTP слоя
 */
function bindHttpLayer(container: Container): void {
  container.bind(TYPES.RetryStrategy).toDynamicValue(() => {
    const configInstance = container.get<ServerConfig>(TYPES.ServerConfig);
    const loggerInstance = container.get<Logger>(TYPES.Logger);

    const retryStrategy = new ExponentialBackoffStrategy(
      configInstance.retryAttempts,
      configInstance.retryMinDelay,
      configInstance.retryMaxDelay
    );

    loggerInstance.info(
      `HTTP retry configuration: attempts=${configInstance.retryAttempts}, ` +
        `minDelay=${configInstance.retryMinDelay}ms, ` +
        `maxDelay=${configInstance.retryMaxDelay}ms`
    );

    return retryStrategy;
  });

  container.bind<IHttpClient>(TYPES.HttpClient).toDynamicValue(() => {
    const loggerInstance = container.get<Logger>(TYPES.Logger);
    const configInstance = container.get<ServerConfig>(TYPES.ServerConfig);
    const retryStrategy = container.get<RetryStrategy>(TYPES.RetryStrategy);

    return new AxiosHttpClient(
      {
        baseURL: configInstance.apiBase,
        timeout: configInstance.requestTimeout,
        token: configInstance.token,
        ...(configInstance.orgId && { orgId: configInstance.orgId }),
        ...(configInstance.cloudOrgId && { cloudOrgId: configInstance.cloudOrgId }),
      },
      loggerInstance,
      retryStrategy
    );
  });
}

/**
 * Регистрация кеша
 */
function bindCacheLayer(container: Container): void {
  const cacheManager = new InMemoryCacheManager(300000); // 5 minutes TTL
  container.bind<CacheManager>(TYPES.CacheManager).toConstantValue(cacheManager);
}

/**
 * Регистрация операций
 */
function bindOperations(container: Container): void {
  for (const OperationClass of OPERATION_CLASSES) {
    if (typeof OperationClass !== 'function') {
      throw new Error(
        '[DI Validation Error] Operation must be a constructor function. ' +
          `Received: ${typeof OperationClass}`
      );
    }

    const className = OperationClass.name;
    if (!className) {
      throw new Error('[DI Validation Error] Operation class must have a name.');
    }

    const symbol = Symbol.for(className);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const factory = (): any => {
      const httpClient = container.get<IHttpClient>(TYPES.HttpClient);
      const cacheManager = container.get<CacheManager>(TYPES.CacheManager);
      const loggerInstance = container.get<Logger>(TYPES.Logger);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return new (OperationClass as any)(httpClient, cacheManager, loggerInstance);
    };

    container.bind(symbol).toDynamicValue(factory);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    container.bind(OperationClass as any).toDynamicValue(factory);
  }
}

/**
 * Регистрация Facade
 */
function bindFacade(container: Container): void {
  container.bind<YandexWikiFacade>(TYPES.YandexWikiFacade).to(YandexWikiFacade);
}

/**
 * Регистрация Tools
 */
function bindTools(container: Container): void {
  for (const ToolClass of TOOL_CLASSES) {
    if (typeof ToolClass !== 'function') {
      throw new Error(
        '[DI Validation Error] Tool must be a constructor function. ' +
          `Received: ${typeof ToolClass}`
      );
    }

    const className = ToolClass.name;
    if (!className) {
      throw new Error('[DI Validation Error] Tool class must have a name.');
    }

    const symbol = Symbol.for(className);

    container.bind(symbol).toDynamicValue(() => {
      const facade = container.get<YandexWikiFacade>(TYPES.YandexWikiFacade);
      const loggerInstance = container.get<Logger>(TYPES.Logger);
      return new (ToolClass as new (facade: YandexWikiFacade, logger: Logger) => unknown)(
        facade,
        loggerInstance
      );
    });
  }
}

/**
 * Регистрация ToolRegistry
 *
 * ACCESS POLICY: ToolAccessPolicy строится из той же конфигурации
 * (disabledToolGroups), что определяет состав tools/list в server.ts —
 * единый источник истины о доступности tool для tools/list (видимость)
 * и tools/call (исполняемость).
 */
function bindToolRegistry(container: Container, config: ServerConfig): void {
  container.bind<ToolRegistry>(TYPES.ToolRegistry).toDynamicValue(() => {
    const loggerInstance = container.get<Logger>(TYPES.Logger);
    const accessPolicy = new ConfiguredToolAccessPolicy(config.disabledToolGroups);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return new ToolRegistry(container, loggerInstance, TOOL_CLASSES as any, accessPolicy);
  });
}

/**
 * Регистрация ResourceRegistry (пакет 5.1.C.wiki)
 *
 * Провайдеры получают уже собранный `YandexWikiFacade` — тот же паттерн, что
 * у `bindTools`: composition root регистрирует, adapter (framework) обходит
 * реестр в обработчиках `resources/list`/`resources/read`/`resources/templates/list`.
 */
function bindResourceRegistry(container: Container): void {
  container.bind<ResourceRegistry>(TYPES.ResourceRegistry).toDynamicValue(() => {
    const facade = container.get<YandexWikiFacade>(TYPES.YandexWikiFacade);
    const registry = new ResourceRegistry();
    registry.register(new WikiPageResourceProvider(facade));
    registry.register(new WikiPageItemResourceProvider(facade));
    return registry;
  });
}

/**
 * Создание и конфигурация DI контейнера
 */
export async function createContainer(config: ServerConfig): Promise<Container> {
  validateDIRegistrations();

  const container = new Container({
    defaultScope: 'Singleton',
  });

  // 1. Инфраструктура
  bindInfrastructure(container, config);
  bindHttpLayer(container);
  bindCacheLayer(container);

  // 2. Бизнес-логика
  bindOperations(container);
  bindFacadeServices(container);
  bindFacade(container);

  // 3. Tools
  bindTools(container);

  // 4. ToolRegistry
  bindToolRegistry(container, config);

  // 5. ResourceRegistry
  bindResourceRegistry(container);

  // Логирование
  const logger = container.get<Logger>(TYPES.Logger);
  logger.debug('DI symbols registered successfully', {
    toolSymbols: Object.keys(TOOL_SYMBOLS),
    operationSymbols: Object.keys(OPERATION_SYMBOLS),
    totalTools: Object.keys(TOOL_SYMBOLS).length,
    totalOperations: Object.keys(OPERATION_SYMBOLS).length,
  });

  return container;
}
