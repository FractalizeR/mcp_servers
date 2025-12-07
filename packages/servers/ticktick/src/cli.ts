#!/usr/bin/env node

/**
 * CLI Entry Point for TickTick MCP Server
 *
 * This file is the actual entry point for running the server.
 * It imports and runs the main function from index.ts.
 */

// Skip execution in test environment
const isTestEnv = process.env['NODE_ENV'] === 'test' || process.env['VITEST'] === 'true';

if (!isTestEnv) {
  // Dynamic import to avoid execution during module scanning
  void import('./index.js').then(({ main }) => {
    main().catch((error) => {
      console.error('Unhandled error:', error);
      process.exit(1);
    });
  });
}
