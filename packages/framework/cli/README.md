# @mcp-framework/cli

Generic CLI framework for MCP server connection management.

## Overview

`@mcp-framework/cli` provides a reusable, extensible CLI framework for managing MCP server connections across multiple AI clients (Claude Desktop, Claude Code, Codex, Gemini, Qwen, etc.). It's designed to be client-agnostic and easily adaptable to any MCP server implementation.

## Features

- **Multi-Client Support**: Built-in connectors for Claude Desktop, Claude Code, Codex, Gemini, Qwen
- **Extensible Architecture**: Easy to add new client connectors
- **Type-Safe Configuration**: Generic configuration system with TypeScript support
- **Interactive Prompts**: User-friendly CLI with interactive prompts (powered by Inquirer)
- **Command Framework**: Built on Commander.js for consistent CLI experience
- **Configuration Management**: TOML-based configuration with validation

## Installation

```bash
npm install @mcp-framework/cli
```

## Quick Start

### Basic Usage

```typescript
import {
  ConnectorRegistry,
  ConfigManager,
  type BaseMCPServerConfig
} from '@mcp-framework/cli';

// Define your server-specific configuration
interface MyServerConfig extends BaseMCPServerConfig {
  apiKey: string;
  endpoint: string;
}

// Initialize CLI components
const registry = new ConnectorRegistry();
const configManager = new ConfigManager<MyServerConfig>({
  configDir: '.my-mcp-server',
  configFileName: 'config.json',
});

// Use connectors
const connector = registry.getConnector('claude-desktop');
await connector.connect(config);
```

### Extending for Your MCP Server

See the [yandex-tracker implementation](../../servers/yandex-tracker/src/cli) for a complete example of how to extend this framework for a specific MCP server.

## Architecture

```
@mcp-framework/cli/
├── connectors/       # Client-specific connection logic
│   ├── base/        # Base connector interface
│   ├── claude-desktop/
│   ├── claude-code/
│   ├── codex/
│   ├── gemini/
│   └── qwen/
├── commands/        # CLI command implementations
├── utils/          # Utilities (config, prompts, file management)
└── types.ts        # Core type definitions
```

## Supported Clients

- **Claude Desktop** - Anthropic's desktop application
- **Claude Code** - VS Code extension
- **Codex** - OpenAI's code assistant
- **Gemini** - Google's AI assistant
- **Qwen** - Alibaba's AI assistant

## Adding a New Client

To add support for a new AI client:

1. Create a new connector class extending `BaseConnector`
2. Implement the required methods: `connect()`, `disconnect()`, `getStatus()`
3. Register the connector in `ConnectorRegistry`
4. Add client-specific configuration handling

See [CONTRIBUTING.md](../../../.github/CONTRIBUTING.md) for detailed guidelines.

## API Reference

### Core Types

- `BaseMCPServerConfig` - Base configuration interface
- `ConnectorType` - Supported client types
- `ConnectionStatus` - Connection state enumeration

### Main Classes

- `ConnectorRegistry` - Manages available connectors
- `ConfigManager<T>` - Handles configuration persistence
- `InteractivePrompter` - Interactive CLI prompts

### Utilities

- `CommandExecutor` - Execute shell commands
- `FileManager` - File system operations
- `createLogger()` - Pino-based logging

For detailed API documentation, see [API.md](./API.md) (coming soon).

## Dependencies

This package depends only on:
- `@mcp-framework/infrastructure` - Core utilities (HTTP, logging, cache)
- Standard CLI libraries (chalk, commander, inquirer, ora)

It does NOT depend on `@mcp-framework/core` - the CLI is purely an infrastructure tool.

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Test
npm run test

# Lint
npm run lint

# Validate (lint + typecheck + test)
npm run validate
```

## License

MIT

## Related Packages

- [@mcp-framework/infrastructure](../infrastructure) - Infrastructure utilities
- [@mcp-framework/core](../core) - MCP tool framework
- [@mcp-server/yandex-tracker](../../servers/yandex-tracker) - Example implementation
