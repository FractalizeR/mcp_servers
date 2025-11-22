/**
 * InversifyJS DI Container
 *
 * Централизованная конфигурация всех зависимостей проекта.
 * Использует Symbol-based токены для типобезопасной привязки.
 */

import { Container } from 'inversify';
import type { ServerConfig } from '#config';
import { Logger } from '@mcp-framework/infrastructure';
import { TYPES, TOOL_SYMBOLS, OPERATION_SYMBOLS } from '#composition-root/types.js';
import { validateDIRegistrations } from '#composition-root/validation.js';

// HTTP Layer
import type { IHttpClient, RetryStrategy } from '@mcp-framework/infrastructure';
import { AxiosHttpClient, ExponentialBackoffStrategy } from '@mcp-framework/infrastructure';

// Cache Layer
import type { CacheManager } from '@mcp-framework/infrastructure';
import { NoOpCache } from '@mcp-framework/infrastructure';

// Yandex Tracker Facade
import { YandexTrackerFacade } from '#tracker_api/facade/yandex-tracker.facade.js';

// Tool Registry
import { ToolRegistry } from '@mcp-framework/core';

// Search Engine
import { ToolSearchEngine } from '@mcp-framework/search';
import { WeightedCombinedStrategy } from '@mcp-framework/search';
import { NameSearchStrategy } from '@mcp-framework/search';
import { DescriptionSearchStrategy } from '@mcp-framework/search';
import { CategorySearchStrategy } from '@mcp-framework/search';
import { FuzzySearchStrategy } from '@mcp-framework/search';
import type { ISearchStrategy } from '@mcp-framework/search';
import type { StrategyType } from '@mcp-framework/search';

// Автоматически импортируемые определения
import { TOOL_CLASSES, OPERATION_CLASSES, bindFacadeServices } from './definitions/index.js';

/**
 * Регистрация базовых зависимостей (config, logger)
 */
function bindInfrastructure(container: Container, config: ServerConfig): void {
  container.bind<ServerConfig>(TYPES.ServerConfig).toConstantValue(config);

  // Logger создаётся на основе конфигурации
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
 * Регистрация HTTP слоя (retry, http client)
 */
function bindHttpLayer(container: Container): void {
  // Регистрируем RetryStrategy как отдельный сервис
  container.bind(TYPES.RetryStrategy).toDynamicValue(() => {
    const configInstance = container.get<ServerConfig>(TYPES.ServerConfig);
    const loggerInstance = container.get<Logger>(TYPES.Logger);

    // Создаём retry стратегию с конфигурируемыми параметрами
    const retryStrategy = new ExponentialBackoffStrategy(
      configInstance.retryAttempts ?? 3,
      configInstance.retryMinDelay ?? 1000,
      configInstance.retryMaxDelay ?? 10000
    );

    // Логируем retry конфигурацию при инициализации
    loggerInstance.info(
      `HTTP retry configuration loaded: attempts=${configInstance.retryAttempts ?? 3}, ` +
        `minDelay=${configInstance.retryMinDelay ?? 1000}ms, ` +
        `maxDelay=${configInstance.retryMaxDelay ?? 10000}ms`
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
  container.bind<CacheManager>(TYPES.CacheManager).to(NoOpCache);
}

/**
 * Регистрация операций Yandex Tracker
 *
 * АВТОМАТИЧЕСКАЯ РЕГИСТРАЦИЯ:
 * - Все операции из OPERATION_CLASSES автоматически регистрируются
 * - Символы создаются из имени класса (ClassName → Symbol.for('ClassName'))
 * - Для добавления новой операции: добавь класс в definitions/operation-definitions.ts
 *
 * VALIDATION:
 * - Проверяет наличие имени класса
 * - Проверяет, что класс является функцией-конструктором
 */
function bindOperations(container: Container): void {
  for (const OperationClass of OPERATION_CLASSES) {
    // Validate operation class - check type first
    if (typeof OperationClass !== 'function') {
      throw new Error(
        '[DI Validation Error] Operation must be a constructor function. ' +
          `Received: ${typeof OperationClass}`
      );
    }

    // Now safe to access .name
    const className = OperationClass.name;
    if (!className) {
      throw new Error(
        '[DI Validation Error] Operation class must have a name. ' +
          'Ensure the class is properly defined and not minified.'
      );
    }

    const symbol = Symbol.for(className);

    // Factory function для создания операции
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const factory = (): any => {
      const httpClient = container.get<IHttpClient>(TYPES.HttpClient);
      const cacheManager = container.get<CacheManager>(TYPES.CacheManager);
      const loggerInstance = container.get<Logger>(TYPES.Logger);
      const configInstance = container.get<ServerConfig>(TYPES.ServerConfig);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-call
      return new (OperationClass as any)(httpClient, cacheManager, loggerInstance, configInstance);
    };

    // Двойная регистрация:
    // 1. Symbol-based (для обратной совместимости со старым кодом)
    container.bind(symbol).toDynamicValue(factory);

    // 2. Class-based (для новых сервисов с декораторами @inject)
    container.bind(OperationClass).toDynamicValue(factory);
  }
}

/**
 * Регистрация Facade
 *
 * АРХИТЕКТУРНЫЕ ИЗМЕНЕНИЯ (v2.0):
 * - Facade теперь использует Service-based architecture
 * - Все 14 доменных сервисов инжектятся напрямую через @inject()
 * - Facade имеет декоратор @injectable() и регистрируется через toSelf()
 */
function bindFacade(container: Container): void {
  container.bind<YandexTrackerFacade>(TYPES.YandexTrackerFacade).to(YandexTrackerFacade);
}

/**
 * Регистрация поисковой системы tools
 *
 * ToolSearchEngine требует:
 * - ToolRegistry для динамической генерации индекса и lazy loading метаданных
 * - WeightedCombinedStrategy с набором стратегий
 *
 * ДИНАМИЧЕСКИЙ ИНДЕКС:
 * - Передаём null вместо статического индекса
 * - ToolSearchEngine автоматически генерирует индекс из ToolRegistry при первом поиске
 * - Всегда актуальные имена инструментов с правильными префиксами
 */
function bindSearchEngine(container: Container): void {
  container.bind<ToolSearchEngine>(TYPES.ToolSearchEngine).toDynamicValue(() => {
    const toolRegistry = container.get<ToolRegistry>(TYPES.ToolRegistry);

    // Создаём все стратегии поиска
    const strategies = new Map<StrategyType, ISearchStrategy>([
      ['name', new NameSearchStrategy()],
      ['description', new DescriptionSearchStrategy()],
      ['category', new CategorySearchStrategy()],
      ['fuzzy', new FuzzySearchStrategy(3)], // maxDistance = 3
    ]);

    // Комбинированная стратегия с весами
    const combinedStrategy = new WeightedCombinedStrategy(strategies);

    // ToolSearchEngine с динамическим индексом (null = генерация из ToolRegistry)
    return new ToolSearchEngine(null, toolRegistry, combinedStrategy);
  });
}

/**
 * Регистрация Tools
 *
 * АВТОМАТИЧЕСКАЯ РЕГИСТРАЦИЯ:
 * - Все tools из TOOL_CLASSES автоматически регистрируются
 * - Символы создаются из имени класса (ClassName → Symbol.for('ClassName'))
 * - Для добавления нового tool: добавь класс в definitions/tool-definitions.ts
 *
 * ОСОБЫЕ СЛУЧАИ:
 * - SearchToolsTool требует (searchEngine, logger) вместо (facade, logger)
 * - Регистрируется отдельно для корректной типизации
 *
 * VALIDATION:
 * - Проверяет наличие имени класса
 * - Проверяет, что класс является функцией-конструктором
 */
function bindTools(container: Container): void {
  // Стандартные tools: (facade, logger)
  for (const ToolClass of TOOL_CLASSES) {
    // Validate tool class - check type first
    if (typeof ToolClass !== 'function') {
      throw new Error(
        '[DI Validation Error] Tool must be a constructor function. ' +
          `Received: ${typeof ToolClass}`
      );
    }

    // Now safe to access .name
    const className = ToolClass.name;
    if (!className) {
      throw new Error(
        '[DI Validation Error] Tool class must have a name. ' +
          'Ensure the class is properly defined and not minified.'
      );
    }

    const symbol = Symbol.for(className);

    // Пропускаем SearchToolsTool (регистрируется отдельно)
    if (className === 'SearchToolsTool') {
      continue;
    }

    container.bind(symbol).toDynamicValue(() => {
      const facade = container.get<YandexTrackerFacade>(TYPES.YandexTrackerFacade);
      const loggerInstance = container.get<Logger>(TYPES.Logger);
      // Type assertion: все tools кроме SearchToolsTool имеют конструктор (facade, logger)
      return new (ToolClass as new (facade: YandexTrackerFacade, logger: Logger) => unknown)(
        facade,
        loggerInstance
      );
    });
  }
}

/**
 * Регистрация SearchToolsTool
 *
 * Отдельная функция для корректной типизации,
 * т.к. конструктор отличается от BaseTool: (searchEngine, logger)
 */
async function bindSearchToolsTool(container: Container): Promise<void> {
  const { SearchToolsTool } = await import('@mcp-framework/search');

  container.bind(Symbol.for('SearchToolsTool')).toDynamicValue(() => {
    const searchEngine = container.get<ToolSearchEngine>(TYPES.ToolSearchEngine);
    const loggerInstance = container.get<Logger>(TYPES.Logger);
    return new SearchToolsTool(searchEngine, loggerInstance);
  });
}

/**
 * Регистрация ToolRegistry
 *
 * ВАЖНО: ToolRegistry автоматически извлекает все tools из контейнера
 * SearchToolsTool добавляется отдельно через registerToolFromContainer()
 * после регистрации SearchEngine (разрывает циклическую зависимость)
 */
function bindToolRegistry(container: Container): void {
  container.bind<ToolRegistry>(TYPES.ToolRegistry).toDynamicValue(() => {
    const loggerInstance = container.get<Logger>(TYPES.Logger);
    // Передаём контейнер, logger и только стандартные tool классы
    // SearchToolsTool будет добавлен позже через registerToolFromContainer
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument
    return new ToolRegistry(container, loggerInstance, TOOL_CLASSES as any);
  });
}

/**
 * Создание и конфигурация DI контейнера
 */
export async function createContainer(config: ServerConfig): Promise<Container> {
  // Валидация уникальности имён классов перед созданием контейнера
  validateDIRegistrations();

  const container = new Container({
    defaultScope: 'Singleton', // Все зависимости по умолчанию Singleton
  });

  // 1. Инфраструктура (config, logger, http, cache)
  bindInfrastructure(container, config);
  bindHttpLayer(container);
  bindCacheLayer(container);

  // 2. Бизнес-логика (operations, facade services, facade)
  bindOperations(container);
  bindFacadeServices(container);
  bindFacade(container);

  // 3. Стандартные tools (facade, logger)
  bindTools(container);

  // 4. ToolRegistry (БЕЗ SearchToolsTool - разрываем циклическую зависимость)
  bindToolRegistry(container);

  // 5-7. SearchEngine и SearchToolsTool ТОЛЬКО в lazy mode
  // В eager mode Claude видит все инструменты, поэтому search_tools избыточен
  if (config.toolDiscoveryMode === 'lazy') {
    // 5. SearchEngine (требует ToolRegistry)
    bindSearchEngine(container);

    // 6. SearchToolsTool (требует SearchEngine)
    await bindSearchToolsTool(container);

    // 7. Добавляем SearchToolsTool в ToolRegistry (завершаем цепочку зависимостей)
    const toolRegistry = container.get<ToolRegistry>(TYPES.ToolRegistry);
    // Используем строку вместо класса, т.к. компилятор переименовывает класс в _SearchToolsTool
    toolRegistry.registerToolFromContainer('SearchToolsTool');
  }

  // Логирование зарегистрированных DI символов
  const logger = container.get<Logger>(TYPES.Logger);
  logger.debug('DI symbols registered successfully', {
    toolSymbols: Object.keys(TOOL_SYMBOLS),
    operationSymbols: Object.keys(OPERATION_SYMBOLS),
    totalTools: Object.keys(TOOL_SYMBOLS).length,
    totalOperations: Object.keys(OPERATION_SYMBOLS).length,
  });

  return container;
}
