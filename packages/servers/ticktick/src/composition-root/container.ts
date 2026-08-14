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
} from '@fractalizer/mcp-infrastructure';
import type { IHttpClient, RetryStrategy, CacheManager } from '@fractalizer/mcp-infrastructure';
import {
  ToolRegistry,
  ConfiguredToolAccessPolicy,
  ResourceRegistry,
  PromptRegistry,
} from '@fractalizer/mcp-core';
import { TYPES } from './types.js';
import { OPERATION_DEFINITIONS } from './definitions/operation-definitions.js';
import { TOOL_CLASSES } from './definitions/tool-definitions.js';
import { validateDIRegistrations } from './validation.js';
import { TickTickOAuthClient } from '#ticktick_api/auth/oauth-client.js';
import { AuthenticatedHttpClient } from '#ticktick_api/http/authenticated-http-client.js';
import { TickTickFacade } from '#ticktick_api/facade/ticktick.facade.js';
import {
  ProjectOperationsContainer,
  TaskOperationsContainer,
} from '#ticktick_api/facade/containers/index.js';
import { TaskResourceProvider, ProjectResourceProvider } from '#resources/index.js';
import { TickTickPromptProvider } from '#prompts/index.js';

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
 * Bind Operations Containers
 *
 * Containers group operations by domain for facade.
 * Must be bound after operations but before facade.
 */
function bindContainers(container: Container): void {
  container
    .bind<ProjectOperationsContainer>(TYPES.ProjectOperationsContainer)
    .to(ProjectOperationsContainer);
  container
    .bind<TaskOperationsContainer>(TYPES.TaskOperationsContainer)
    .to(TaskOperationsContainer);
}

/**
 * Bind TickTickFacade
 *
 * Facade depends on containers, so must be bound after them.
 */
function bindFacade(container: Container): void {
  container.bind<TickTickFacade>(TYPES.TickTickFacade).to(TickTickFacade);
}

/**
 * Bind all MCP tools
 *
 * Uses TOOL_CLASSES for automatic registration.
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
 * ACCESS POLICY: ToolAccessPolicy is built from the same configuration
 * (tools.disabledGroups) that determines the tools/list composition in
 * server.ts — single source of truth for tool visibility (tools/list) and
 * callability (tools/call).
 */
function bindToolRegistry(container: Container, config: ServerConfig): void {
  container.bind<ToolRegistry>(TYPES.ToolRegistry).toDynamicValue(() => {
    const loggerInstance = container.get<Logger>(TYPES.Logger);
    const accessPolicy = new ConfiguredToolAccessPolicy(config.tools.disabledGroups);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return new ToolRegistry(container, loggerInstance, TOOL_CLASSES as any, accessPolicy);
  });
}

/**
 * Bind MCP Resources: провайдеры (пакет 5.1.C.ticktick) и `ResourceRegistry`
 * framework, зарегистрированный тем же паттерном, что и `ToolRegistry` выше —
 * composition root регистрирует провайдеров, `server.ts` передаёт готовый
 * реестр в `createMcpServerAdapter`.
 */
function bindResources(container: Container): void {
  container.bind<TaskResourceProvider>(TYPES.TaskResourceProvider).toDynamicValue(() => {
    const facade = container.get<TickTickFacade>(TYPES.TickTickFacade);
    return new TaskResourceProvider(facade);
  });

  container.bind<ProjectResourceProvider>(TYPES.ProjectResourceProvider).toDynamicValue(() => {
    const facade = container.get<TickTickFacade>(TYPES.TickTickFacade);
    return new ProjectResourceProvider(facade);
  });

  container.bind<ResourceRegistry>(TYPES.ResourceRegistry).toDynamicValue(() => {
    const registry = new ResourceRegistry();
    registry.register(container.get<TaskResourceProvider>(TYPES.TaskResourceProvider));
    registry.register(container.get<ProjectResourceProvider>(TYPES.ProjectResourceProvider));
    return registry;
  });
}

/**
 * Bind MCP Prompts: провайдер слэш-команд (дневной/недельный обзор,
 * GTD-разбор входящих — оставшаяся часть пакета 5.1.C.ticktick) и
 * `PromptRegistry` framework, тот же паттерн, что и у `bindResources` выше.
 * `TickTickPromptProvider` не зависит от facade — `getPrompt()` строит
 * только текст сообщений, без обращения к API (см. заголовок провайдера).
 */
function bindPrompts(container: Container): void {
  container.bind<TickTickPromptProvider>(TYPES.TickTickPromptProvider).toDynamicValue(() => {
    return new TickTickPromptProvider();
  });

  container.bind<PromptRegistry>(TYPES.PromptRegistry).toDynamicValue(() => {
    const registry = new PromptRegistry();
    registry.register(container.get<TickTickPromptProvider>(TYPES.TickTickPromptProvider));
    return registry;
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

  // 6. Operations Containers (group operations by domain)
  bindContainers(container);

  // 7. Facade (depends on containers)
  bindFacade(container);

  // 8. MCP Tools (depend on Facade)
  bindTools(container);

  // 9. ToolRegistry (uses tool classes)
  bindToolRegistry(container, config);

  // 10. MCP Resources (providers + registry, depend on Facade)
  bindResources(container);

  // 11. MCP Prompts (не зависят от facade, но регистрируются той же волной)
  bindPrompts(container);

  // Log initialization
  const logger = container.get<Logger>(TYPES.Logger);
  logger.info('DI container initialized successfully', {
    registeredSymbols: Object.keys(TYPES).length,
    operationsCount: OPERATION_DEFINITIONS.length,
    toolsCount: TOOL_CLASSES.length,
  });

  return container;
}
