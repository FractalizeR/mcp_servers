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
import { ToolRegistry } from '@fractalizer/mcp-core';

// Search Engine
import { ToolSearchEngine } from '@fractalizer/mcp-search';
import { WeightedCombinedStrategy } from '@fractalizer/mcp-search';
import { NameSearchStrategy } from '@fractalizer/mcp-search';
import { DescriptionSearchStrategy } from '@fractalizer/mcp-search';
import { CategorySearchStrategy } from '@fractalizer/mcp-search';
import { FuzzySearchStrategy } from '@fractalizer/mcp-search';
import type { ISearchStrategy } from '@fractalizer/mcp-search';
import type { StrategyType } from '@fractalizer/mcp-search';

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
    container.bind(OperationClass).toDynamicValue(factory);
  }
}

/**
 * Регистрация Facade
 */
function bindFacade(container: Container): void {
  container.bind<YandexWikiFacade>(TYPES.YandexWikiFacade).to(YandexWikiFacade);
}

/**
 * Регистрация поисковой системы tools
 */
function bindSearchEngine(container: Container): void {
  container.bind<ToolSearchEngine>(TYPES.ToolSearchEngine).toDynamicValue(() => {
    const toolRegistry = container.get<ToolRegistry>(TYPES.ToolRegistry);

    const strategies = new Map<StrategyType, ISearchStrategy>([
      ['name', new NameSearchStrategy()],
      ['description', new DescriptionSearchStrategy()],
      ['category', new CategorySearchStrategy()],
      ['fuzzy', new FuzzySearchStrategy(3)],
    ]);

    const combinedStrategy = new WeightedCombinedStrategy(strategies);

    return new ToolSearchEngine(null, toolRegistry, combinedStrategy);
  });
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

    if (className === 'SearchToolsTool') {
      continue;
    }

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
 * Регистрация SearchToolsTool
 */
async function bindSearchToolsTool(container: Container): Promise<void> {
  const { SearchToolsTool } = await import('@fractalizer/mcp-search');

  container.bind(Symbol.for('SearchToolsTool')).toDynamicValue(() => {
    const searchEngine = container.get<ToolSearchEngine>(TYPES.ToolSearchEngine);
    const loggerInstance = container.get<Logger>(TYPES.Logger);
    return new SearchToolsTool(searchEngine, loggerInstance);
  });
}

/**
 * Регистрация ToolRegistry
 */
function bindToolRegistry(container: Container): void {
  container.bind<ToolRegistry>(TYPES.ToolRegistry).toDynamicValue(() => {
    const loggerInstance = container.get<Logger>(TYPES.Logger);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return new ToolRegistry(container, loggerInstance, TOOL_CLASSES as any);
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
  bindToolRegistry(container);

  // 5-7. SearchEngine и SearchToolsTool только в lazy mode
  if (config.toolDiscoveryMode === 'lazy') {
    bindSearchEngine(container);
    await bindSearchToolsTool(container);

    const toolRegistry = container.get<ToolRegistry>(TYPES.ToolRegistry);
    toolRegistry.registerToolFromContainer('SearchToolsTool');
  }

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
