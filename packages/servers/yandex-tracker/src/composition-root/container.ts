/**
 * InversifyJS DI Container
 *
 * Централизованная конфигурация всех зависимостей проекта.
 * Использует Symbol-based токены для типобезопасной привязки.
 */

import { Container } from 'inversify';
import type { ServerConfig } from '@mcp-framework/infrastructure';
import { Logger } from '@mcp-framework/infrastructure';
import { TYPES } from '@composition-root/types.js';

// HTTP Layer
import { HttpClient } from '@mcp-framework/infrastructure';
import type { RetryStrategy } from '@mcp-framework/infrastructure';
import { ExponentialBackoffStrategy } from '@mcp-framework/infrastructure';

// Cache Layer
import type { CacheManager } from '@mcp-framework/infrastructure';
import { NoOpCache } from '@mcp-framework/infrastructure';

// Yandex Tracker Facade
import { YandexTrackerFacade } from '@tracker_api/facade/yandex-tracker.facade.js';

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
import { TOOL_CLASSES, OPERATION_CLASSES } from './definitions/index.js';

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
 */
function bindOperations(container: Container): void {
  for (const OperationClass of OPERATION_CLASSES) {
    const symbol = Symbol.for(OperationClass.name);

    container.bind(symbol).toDynamicValue(() => {
      const httpClient = container.get<HttpClient>(TYPES.HttpClient);
      const cacheManager = container.get<CacheManager>(TYPES.CacheManager);
      const loggerInstance = container.get<Logger>(TYPES.Logger);
      const configInstance = container.get<ServerConfig>(TYPES.ServerConfig);
      return new OperationClass(httpClient, cacheManager, loggerInstance, configInstance);
    });
  }
}

/**
 * Регистрация Facade
 *
 * КРИТИЧЕСКИЕ ИЗМЕНЕНИЯ:
 * - Передаём контейнер вместо зависимостей
 * - Facade извлекает Operations ленив но из контейнера
 * - Масштабируется до 50+ операций БЕЗ изменения регистрации
 */
function bindFacade(container: Container): void {
  container.bind<YandexTrackerFacade>(TYPES.YandexTrackerFacade).toDynamicValue(() => {
    return new YandexTrackerFacade(container);
  });
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
 */
function bindTools(container: Container): void {
  // Стандартные tools: (facade, logger)
  for (const ToolClass of TOOL_CLASSES) {
    const symbol = Symbol.for(ToolClass.name);

    // Пропускаем SearchToolsTool (регистрируется отдельно)
    if (ToolClass.name === 'SearchToolsTool') {
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
  const container = new Container({
    defaultScope: 'Singleton', // Все зависимости по умолчанию Singleton
  });

  // 1. Инфраструктура (config, logger, http, cache)
  bindInfrastructure(container, config);
  bindHttpLayer(container);
  bindCacheLayer(container);

  // 2. Бизнес-логика (operations, facade)
  bindOperations(container);
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

  return container;
}
