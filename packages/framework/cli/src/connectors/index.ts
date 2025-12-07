/**
 * MCP Client Connectors
 * @packageDocumentation
 */

// Base connector types and classes
export * from './base/index.js';

// Connector factory (recommended for new code)
export * from './connector-factory.js';

// Specific client connectors
export * from './claude-desktop/claude-desktop.connector.js';
export * from './claude-code/claude-code.connector.js';

// Legacy connectors (use createConnector() factory instead)
// Kept for backwards compatibility
export * from './codex/codex.connector.js';
export * from './gemini/gemini.connector.js';
export * from './qwen/qwen.connector.js';

// Registry
export * from './registry.js';
