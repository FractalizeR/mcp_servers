#!/usr/bin/env node

/**
 * TickTick MCP Server
 *
 * MCP server for TickTick todo-list application API integration.
 * Implements Model Context Protocol for LLM tool integration.
 *
 * All protocol logic (lifecycle, transport, tools/list, tools/call) lives in
 * @fractalizer/mcp-core (createMcpServerAdapter, package 4.1.B of the MCP
 * modernization plan) — this file only assembles the DI container and starts
 * the adapter.
 */

// IMPORTANT: Must be imported before any inversify decorators are used
import 'reflect-metadata';

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { loadConfig } from '#config';
import type { Logger } from '@fractalizer/mcp-infrastructure';
import type { ToolRegistry } from '@fractalizer/mcp-core';
import { createMcpServerAdapter } from '@fractalizer/mcp-core';
import { MCP_SERVER_NAME, MCP_SERVER_DISPLAY_NAME } from './constants.js';

// DI Container (Composition Root)
import { createContainer } from '#composition-root/container.js';
import { TYPES } from '#composition-root/types.js';

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

    // Create DI container (Logger created inside)
    const container = await createContainer(config);

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

    // Get ToolRegistry from container (already carries its own
    // ToolAccessPolicy — the single source of truth for tools/list and
    // tools/call, see tool-registry.ts)
    const toolRegistry = container.get<ToolRegistry>(TYPES.ToolRegistry);

    const adapter = createMcpServerAdapter({
      serverName: MCP_SERVER_NAME,
      serverDisplayName: MCP_SERVER_DISPLAY_NAME,
      version: getPackageVersion(),
      toolRegistry,
      logger,
    });

    await adapter.start();

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
