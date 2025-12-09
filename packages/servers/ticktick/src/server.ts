#!/usr/bin/env node

/**
 * TickTick MCP Server
 *
 * MCP server for TickTick todo-list application API integration.
 * Implements Model Context Protocol for LLM tool integration.
 */

// IMPORTANT: Must be imported before any inversify decorators are used
import 'reflect-metadata';

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  InitializeRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { loadConfig } from '#config';
import type { ServerConfig } from '#config';
import type { Logger } from '@mcp-framework/infrastructure';
import type { ToolRegistry } from '@mcp-framework/core';
import { MCP_SERVER_NAME, TICKTICK_ESSENTIAL_TOOLS } from './constants.js';

// DI Container (Composition Root)
import { createContainer } from '#composition-root/container.js';
import { TYPES } from '#composition-root/types.js';

// Handler helpers (extracted to reduce setupServer size)
import {
  calculateToolsMetrics,
  normalizeToolName,
  logToolsMetrics,
  logToolsWarnings,
  createErrorResponse,
} from './server/handlers.js';

/**
 * Setup MCP server request handlers
 */
function setupServer(
  server: Server,
  toolRegistry: ToolRegistry,
  config: ServerConfig,
  logger: Logger
): void {
  // Initialize connection handler
  server.setRequestHandler(InitializeRequestSchema, (request) => {
    const { clientInfo, protocolVersion } = request.params;

    logger.info(`🤝 MCP client connected`, {
      clientName: clientInfo.name,
      clientVersion: clientInfo.version,
      protocolVersion,
    });

    return {
      protocolVersion: '2025-06-18',
      capabilities: {
        tools: {},
      },
      serverInfo: {
        name: MCP_SERVER_NAME,
        version: getPackageVersion(),
      },
    };
  });

  // List tools handler
  server.setRequestHandler(ListToolsRequestSchema, () => {
    logger.info(`📋 tools/list request from client`);

    const definitions = toolRegistry.getDefinitionsByMode(
      config.tools.discoveryMode,
      config.tools.essentialTools,
      config.tools.enabledCategories,
      config.tools.disabledGroups
    );

    const metrics = calculateToolsMetrics(definitions);
    logToolsMetrics(logger, config, definitions, metrics);
    logToolsWarnings(logger, config, metrics);

    return {
      tools: definitions.map((def) => ({
        name: def.name,
        description: def.description,
        inputSchema: def.inputSchema,
      })),
    };
  });

  // Call tool handler
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const originalName = request.params.name;
    const { arguments: args } = request.params;

    logger.info(`🔧 Tool request: ${originalName}`);

    // Name normalization: remove server prefix (added by MCP clients)
    const { name, removedPrefix } = normalizeToolName(originalName, logger);

    try {
      const result = await toolRegistry.execute(name, args as Record<string, unknown>);

      if (result.isError) {
        logger.error(`❌ Tool ${name} returned error`, {
          originalName,
          normalizedName: name,
          removedPrefix,
          hasContent: result.content.length > 0,
        });
      } else {
        logger.info(`✅ Tool ${name} executed successfully`);
      }

      return result;
    } catch (error) {
      logger.error(`💥 Unhandled exception executing tool ${name}:`, {
        originalName,
        normalizedName: name,
        removedPrefix,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });

      return createErrorResponse(error, name, originalName);
    }
  });

  // Server error handler
  server.onerror = (error): void => {
    logger.error('MCP server error:', error);
  };
}

/**
 * Setup signal handlers for graceful shutdown
 */
function setupSignalHandlers(server: Server, logger: Logger): void {
  const handleShutdown = (signal: string): void => {
    logger.info(`Received ${signal} signal, shutting down...`);
    void server
      .close()
      .then(() => {
        process.exit(0);
      })
      .catch((error) => {
        logger.error('Error closing server:', error);
        process.exit(1);
      });
  };

  process.on('SIGINT', () => handleShutdown('SIGINT'));
  process.on('SIGTERM', () => handleShutdown('SIGTERM'));
}

/**
 * Get version from package.json
 */
function getPackageVersion(): string {
  try {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    const packageJsonPath = join(__dirname, '..', 'package.json');
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8')) as { version: string };
    return packageJson.version;
  } catch {
    return '0.0.0';
  }
}

/**
 * Main server startup function
 */
async function main(): Promise<void> {
  let logger: Logger | undefined;

  try {
    // Load configuration
    const config = loadConfig();

    // Override essentialTools based on discovery mode
    // - eager: only ping (search_tools is redundant as Claude sees all tools)
    // - lazy: ping + search_tools (search_tools needed for discovery)
    const essentialTools =
      config.tools.discoveryMode === 'eager' ? ['fr_ticktick_ping'] : TICKTICK_ESSENTIAL_TOOLS;

    const configWithEssentialTools: ServerConfig = {
      ...config,
      tools: {
        ...config.tools,
        essentialTools,
      },
    };

    // Create DI container (Logger created inside)
    const container = await createContainer(configWithEssentialTools);

    // Get Logger from container
    logger = container.get<Logger>(TYPES.Logger);
    logger.info('Starting TickTick MCP Server...');
    logger.debug('Configuration loaded', {
      apiBase: config.api.baseUrl,
      logLevel: config.logging.level,
      requestTimeout: config.requestTimeout,
      logsDir: config.logging.dir,
      prettyLogs: config.logging.prettyLogs,
    });

    // Get ToolRegistry from container
    const toolRegistry = container.get<ToolRegistry>(TYPES.ToolRegistry);

    // Create MCP server
    const server = new Server(
      {
        name: MCP_SERVER_NAME,
        version: getPackageVersion(),
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    // Setup server handlers
    setupServer(server, toolRegistry, configWithEssentialTools, logger);

    // Setup signal handlers
    setupSignalHandlers(server, logger);

    // Start server with stdio transport
    const transport = new StdioServerTransport();
    await server.connect(transport);

    logger.info('TickTick MCP Server started successfully');
    logger.info('Waiting for requests from MCP client...');
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    if (logger) {
      logger.error('Critical error starting server:', error);
    } else {
      console.error(`[ERROR] Critical error starting server: ${errorMessage}`);
      if (error instanceof Error && error.stack) {
        console.error(error.stack);
      }
    }

    process.exit(1);
  }
}

// Запуск сервера
main().catch((error) => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
