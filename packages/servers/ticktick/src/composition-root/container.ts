/**
 * InversifyJS DI Container
 *
 * Centralized dependency injection configuration.
 * Uses Symbol-based tokens for type-safe binding.
 */

// IMPORTANT: Must be imported before any inversify code/decorators
import 'reflect-metadata';

import { Container } from 'inversify';
import type { ServerConfig } from '#config';
import {
  Logger,
  ExponentialBackoffStrategy,
  InMemoryCacheManager,
} from '@mcp-framework/infrastructure';
import type { IHttpClient, RetryStrategy, CacheManager } from '@mcp-framework/infrastructure';
import { ToolRegistry } from '@mcp-framework/core';
import { ToolSearchEngine } from '@mcp-framework/search';
import { WeightedCombinedStrategy } from '@mcp-framework/search';
import { NameSearchStrategy } from '@mcp-framework/search';
import { DescriptionSearchStrategy } from '@mcp-framework/search';
import { CategorySearchStrategy } from '@mcp-framework/search';
import { FuzzySearchStrategy } from '@mcp-framework/search';
import type { ISearchStrategy, StrategyType } from '@mcp-framework/search';
import { TYPES } from './types.js';
import { OPERATION_DEFINITIONS } from './definitions/operation-definitions.js';
import { TOOL_CLASSES } from './definitions/tool-definitions.js';
import { validateDIRegistrations } from './validation.js';
import { TickTickOAuthClient } from '#ticktick_api/auth/oauth-client.js';
import { AuthenticatedHttpClient } from '#ticktick_api/http/authenticated-http-client.js';
import { TickTickFacade } from '#ticktick_api/facade/ticktick.facade.js';

/**
 * Bind infrastructure dependencies (config, logger)
 */
function bindInfrastructure(container: Container, config: ServerConfig): void {
  container.bind<ServerConfig>(TYPES.ServerConfig).toConstantValue(config);

  // Logger created based on configuration
  container.bind<Logger>(TYPES.Logger).toDynamicValue(() => {
    return new Logger({
      level: config.logging.level,
      logsDir: config.logging.dir,
      pretty: config.logging.prettyLogs,
      rotation: {
        maxSize: config.logging.maxSize,
        maxFiles: config.logging.maxFiles,
      },
    });
  });
}

/**
 * Bind OAuth layer
 */
function bindOAuthLayer(container: Container): void {
  container.bind<TickTickOAuthClient>(TYPES.OAuthClient).toDynamicValue(() => {
    const config = container.get<ServerConfig>(TYPES.ServerConfig);
    return new TickTickOAuthClient(config.oauth);
  });
}

/**
 * Bind HTTP layer (retry, http client)
 */
function bindHttpLayer(container: Container): void {
  // Register RetryStrategy
  container.bind<RetryStrategy>(TYPES.RetryStrategy).toDynamicValue(() => {
    const config = container.get<ServerConfig>(TYPES.ServerConfig);
    const logger = container.get<Logger>(TYPES.Logger);

    const retryStrategy = new ExponentialBackoffStrategy(
      config.retry.attempts,
      config.retry.minDelay,
      config.retry.maxDelay
    );

    logger.info(
      `HTTP retry configuration loaded: attempts=${config.retry.attempts}, ` +
        `minDelay=${config.retry.minDelay}ms, maxDelay=${config.retry.maxDelay}ms`
    );

    return retryStrategy;
  });

  // Register HTTP Client
  container.bind<IHttpClient>(TYPES.HttpClient).toDynamicValue(() => {
    const config = container.get<ServerConfig>(TYPES.ServerConfig);
    const logger = container.get<Logger>(TYPES.Logger);
    const oauthClient = container.get<TickTickOAuthClient>(TYPES.OAuthClient);
    const retryStrategy = container.get<RetryStrategy>(TYPES.RetryStrategy);

    return new AuthenticatedHttpClient(
      oauthClient,
      {
        baseUrl: config.api.baseUrl,
        timeout: config.requestTimeout,
      },
      logger,
      retryStrategy
    );
  });
}

/**
 * Bind cache layer
 */
function bindCacheLayer(container: Container): void {
  container.bind<CacheManager>(TYPES.CacheManager).toDynamicValue(() => {
    const config = container.get<ServerConfig>(TYPES.ServerConfig);
    return new InMemoryCacheManager(config.cache.ttlMs);
  });
}

/**
 * Bind all API operations
 *
 * Uses OPERATION_DEFINITIONS for automatic registration.
 * Operations receive dependencies via dynamic value resolution.
 */
function bindOperations(container: Container): void {
  for (const definition of OPERATION_DEFINITIONS) {
    container.bind(definition.symbol).toDynamicValue(() => {
      const httpClient = container.get<IHttpClient>(TYPES.HttpClient);
      const cacheManager = container.get<CacheManager>(TYPES.CacheManager);
      const logger = container.get<Logger>(TYPES.Logger);

      if (definition.needsConfig) {
        const config = container.get<ServerConfig>(TYPES.ServerConfig);
        return new definition.operationClass(httpClient, cacheManager, logger, config);
      }

      return new definition.operationClass(httpClient, cacheManager, logger);
    });
  }
}

/**
 * Bind TickTickFacade
 *
 * Facade depends on all operations, so must be bound after them.
 */
function bindFacade(container: Container): void {
  container.bind<TickTickFacade>(TYPES.TickTickFacade).to(TickTickFacade);
}

/**
 * Bind all MCP tools
 *
 * Uses TOOL_CLASSES for automatic registration.
 * SearchToolsTool is handled separately as it requires ToolSearchEngine.
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
      throw new Error(
        '[DI Validation Error] Tool class must have a name. ' +
          'Ensure the class is properly defined and not minified.'
      );
    }

    const symbol = Symbol.for(className);

    // Skip SearchToolsTool (registered separately)
    if (className === 'SearchToolsTool') {
      continue;
    }

    container.bind(symbol).toDynamicValue(() => {
      const facade = container.get<TickTickFacade>(TYPES.TickTickFacade);
      const loggerInstance = container.get<Logger>(TYPES.Logger);
      return new (ToolClass as new (facade: TickTickFacade, logger: Logger) => unknown)(
        facade,
        loggerInstance
      );
    });
  }
}

/**
 * Bind ToolRegistry
 *
 * ToolRegistry automatically extracts all tools from container.
 * SearchToolsTool is added separately via registerToolFromContainer().
 */
function bindToolRegistry(container: Container): void {
  container.bind<ToolRegistry>(TYPES.ToolRegistry).toDynamicValue(() => {
    const loggerInstance = container.get<Logger>(TYPES.Logger);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument
    return new ToolRegistry(container, loggerInstance, TOOL_CLASSES as any);
  });
}

/**
 * Bind ToolSearchEngine
 *
 * ToolSearchEngine requires ToolRegistry for dynamic index generation.
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
 * Bind SearchToolsTool
 *
 * Separate function for correct typing as constructor differs from BaseTool.
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
 * Create and configure DI container
 *
 * @param config - Server configuration
 * @returns Configured DI container
 */
export async function createContainer(config: ServerConfig): Promise<Container> {
  // Validate uniqueness of class names before creating container
  validateDIRegistrations();

  const container = new Container({
    defaultScope: 'Singleton',
  });

  // 1. Infrastructure (config, logger)
  bindInfrastructure(container, config);

  // 2. OAuth layer
  bindOAuthLayer(container);

  // 3. HTTP layer (depends on OAuth)
  bindHttpLayer(container);

  // 4. Cache layer
  bindCacheLayer(container);

  // 5. API operations (depend on HTTP and Cache)
  bindOperations(container);

  // 6. Facade (depends on all operations)
  bindFacade(container);

  // 7. MCP Tools (depend on Facade)
  bindTools(container);

  // 8. ToolRegistry (uses tool classes)
  bindToolRegistry(container);

  // 9-11. SearchEngine and SearchToolsTool only in lazy mode
  if (config.tools.discoveryMode === 'lazy') {
    // 9. SearchEngine (requires ToolRegistry)
    bindSearchEngine(container);

    // 10. SearchToolsTool (requires SearchEngine)
    await bindSearchToolsTool(container);

    // 11. Register SearchToolsTool in ToolRegistry
    const toolRegistry = container.get<ToolRegistry>(TYPES.ToolRegistry);
    toolRegistry.registerToolFromContainer('SearchToolsTool');
  }

  // Log initialization
  const logger = container.get<Logger>(TYPES.Logger);
  logger.info('DI container initialized successfully', {
    registeredSymbols: Object.keys(TYPES).length,
    operationsCount: OPERATION_DEFINITIONS.length,
    toolsCount: TOOL_CLASSES.length,
  });

  return container;
}
