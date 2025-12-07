/**
 * InversifyJS DI Container
 *
 * Centralized dependency injection configuration.
 * Uses Symbol-based tokens for type-safe binding.
 */

import { Container } from 'inversify';
import type { ServerConfig } from '#config';
import {
  Logger,
  ExponentialBackoffStrategy,
  InMemoryCacheManager,
} from '@mcp-framework/infrastructure';
import type { IHttpClient, RetryStrategy, CacheManager } from '@mcp-framework/infrastructure';
import { TYPES } from './types.js';
import { TickTickOAuthClient } from '#ticktick_api/auth/oauth-client.js';
import { AuthenticatedHttpClient } from '#ticktick_api/http/authenticated-http-client.js';

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
 * Create and configure DI container
 *
 * NOTE: Function will become async in stage 5 (bindSearchToolsTool requires await)
 *
 * @param config - Server configuration
 * @returns Configured DI container
 */
export function createContainer(config: ServerConfig): Container {
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

  // Log initialization
  const logger = container.get<Logger>(TYPES.Logger);
  logger.info('DI container initialized successfully', {
    registeredSymbols: Object.keys(TYPES).length,
  });

  return container;
}
