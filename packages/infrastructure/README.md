# @mcp-framework/infrastructure

**Reusable infrastructure layer: HTTP, cache, logging, async utilities**

[![npm version](https://img.shields.io/npm/v/@mcp-framework/infrastructure.svg)](https://www.npmjs.com/package/@mcp-framework/infrastructure)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## 🎯 Purpose

**Principle:** Infrastructure layer does NOT know about domain (Yandex.Tracker, MCP)

**Reusability:** All components can be used in other projects without modifications

**Architecture rule:** Infrastructure does NOT import domain-specific code

---

## 📦 Installation

```bash
npm install @mcp-framework/infrastructure
```

**Dependencies:** 0 framework dependencies (only external libs: axios, pino, rotating-file-stream)

---

## 📁 Structure

```
src/
├── http/                    # HTTP client + retry + error mapping
│   ├── client/
│   │   └── http-client.ts  # Axios wrapper
│   ├── retry/
│   │   ├── retry-handler.ts
│   │   └── exponential-backoff.strategy.ts
│   └── error/
│       └── error-mapper.ts # AxiosError → ApiError
├── cache/                   # Caching (Strategy Pattern)
│   ├── cache-manager.interface.ts
│   └── no-op-cache.ts      # Null Object
├── async/                   # Parallel execution
│   └── parallel-executor.ts # Throttling for batch requests
├── logging/                 # Production logging (Pino)
│   └── README.md           # Detailed docs
├── config.ts                # Configuration from env
└── index.ts                 # Public exports
```

---

## 🔧 Components

### HTTP Layer

**HttpClient** — Axios wrapper with built-in retry and error mapping

**Key features:**
- ✅ Automatic retry (ExponentialBackoffStrategy)
- ✅ AxiosError → ApiError mapping
- ✅ Timeout configuration
- ✅ Type-safe (generic `<T>`)

**Usage:**
```typescript
import { HttpClient, loadConfig, createLogger } from '@mcp-framework/infrastructure';

const config = loadConfig();
const logger = createLogger(config);
const retryHandler = new RetryHandler(logger, new ExponentialBackoffStrategy());
const client = new HttpClient(config, logger, retryHandler);

const data = await client.get<YourType>('/api/endpoint');
```

### Caching

**CacheManager** — interface (Strategy Pattern)

**Implementations:**
- `NoOpCache` — Null Object (cache disabled)
- Extensible: add Redis, Memcached, etc.

**Usage:**
```typescript
import { NoOpCache } from '@mcp-framework/infrastructure';

const cache = new NoOpCache();
await cache.set('key', value);
const cached = await cache.get('key'); // null (no-op)
```

### Parallel Execution

**ParallelExecutor** — execute batch requests with throttling

**Two independent limits:**
1. **MAX_BATCH_SIZE** (business limit): 200 items per chunk
2. **MAX_CONCURRENT_REQUESTS** (technical limit): 5 concurrent requests

**How it works:**
- Splits array into chunks by `MAX_BATCH_SIZE`
- Executes chunks in parallel with `MAX_CONCURRENT_REQUESTS` limit
- Uses `Promise.allSettled` to preserve all results (fulfilled + rejected)

**Usage:**
```typescript
import { ParallelExecutor } from '@mcp-framework/infrastructure';

const executor = new ParallelExecutor(config);
const results = await executor.execute(
  keys,
  async (key) => httpClient.get<Issue>(`/api/items/${key}`)
);

// results: BatchResult<string, Issue>
results.forEach((result) => {
  if (result.status === 'fulfilled') {
    console.log('Success:', result.value);
  } else {
    console.error('Error:', result.reason);
  }
});
```

### Logging

**Pino** — production-ready logging with automatic rotation

**Key features:**
- ✅ Structured JSON logs
- ✅ Automatic rotation (old logs → `.gz`)
- ✅ Dual output (error/warn → stderr + file, info/debug → file only)
- ✅ Request tracing (child loggers)

**Configuration:**
- `LOGS_DIR` — logs directory
- `LOG_LEVEL` — level (debug, info, warn, error)
- `PRETTY_LOGS` — pretty-printing for development
- `LOG_MAX_SIZE` — rotation size (default: 50KB)
- `LOG_MAX_FILES` — rotated files count (default: 20)

**Usage:**
```typescript
import { createLogger, loadConfig } from '@mcp-framework/infrastructure';

const config = loadConfig();
const logger = createLogger(config);

logger.info({ userId: 123 }, 'User logged in');
logger.error({ error }, 'Failed to process request');
```

**Details:** [src/logging/README.md](src/logging/README.md)

### Configuration

**loadConfig()** — load and validate environment variables

**Validation:**
- ✅ Required parameters (token, orgId)
- ✅ Value ranges (timeout: 5000-120000ms, batchSize: 1-1000)
- ✅ Default values
- ✅ Type-safe `ServerConfig` interface

**Environment variables:**
```bash
# Required
YANDEX_TRACKER_TOKEN=y0_xxx
YANDEX_ORG_ID=123456

# Optional (with defaults)
REQUEST_TIMEOUT=30000           # 5000-120000ms
MAX_BATCH_SIZE=200              # 1-1000
MAX_CONCURRENT_REQUESTS=5       # 1-20

# Logging
LOG_LEVEL=info                  # debug|info|warn|error
LOGS_DIR=./logs
LOG_MAX_SIZE=50K
LOG_MAX_FILES=20
PRETTY_LOGS=false
```

**Usage:**
```typescript
import { loadConfig } from '@mcp-framework/infrastructure';

const config = loadConfig();
console.log(config.requestTimeout); // 30000
```

---

## 🚨 Critical Rules

### 1. Infrastructure does NOT know about domain

```typescript
// ❌ FORBIDDEN (domain import)
import { Issue } from 'your-domain/entities/issue.js';

// ✅ CORRECT (generic types)
class HttpClient {
  async get<T>(url: string): Promise<T> { ... }
}
```

### 2. Use config for all parameters

```typescript
// ❌ FORBIDDEN (hardcoded values)
const timeout = 30000;

// ✅ CORRECT (from config)
const timeout = config.requestTimeout;
```

### 3. Retry is built into HttpClient

```typescript
// ✅ Retry works automatically
const client = new HttpClient(config, logger, retryHandler);
await client.get('/api/endpoint'); // Auto-retry on error
```

### 4. All errors are mapped to ApiError

```typescript
// ✅ HttpClient automatically maps AxiosError → ApiError
try {
  await client.get('/api/not-found');
} catch (error) {
  // error: ApiError (not AxiosError)
  console.error(error.statusCode, error.message);
}
```

---

## 📖 API Reference

### Exports

```typescript
// HTTP
export { HttpClient } from './http/client/http-client.js';
export { RetryHandler } from './http/retry/retry-handler.js';
export { ExponentialBackoffStrategy } from './http/retry/exponential-backoff.strategy.js';
export { ErrorMapper } from './http/error/error-mapper.js';

// Cache
export { CacheManager } from './cache/cache-manager.interface.js';
export { NoOpCache } from './cache/no-op-cache.js';

// Async
export { ParallelExecutor } from './async/parallel-executor.js';

// Logging
export { createLogger } from './logging/logger.js';

// Config
export { loadConfig } from './config.js';
export type { ServerConfig } from './types.js';

// Types
export { ApiError } from './types.js';
```

---

## 🧪 Testing

**Run tests:**
```bash
cd packages/infrastructure
npm run test
```

**With coverage:**
```bash
npm run test:coverage
```

**Watch mode:**
```bash
npm run test:watch
```

---

## 🤝 Contributing

See [../../.github/CONTRIBUTING.md](../../.github/CONTRIBUTING.md)

**Architecture rules:** [../../CLAUDE.md](../../CLAUDE.md)

---

## 📄 License

MIT License

---

## 🔗 Links

- **Monorepo root:** [../../README.md](../../README.md)
- **Architecture:** [../../ARCHITECTURE.md](../../ARCHITECTURE.md)
- **Changelog:** [CHANGELOG.md](CHANGELOG.md)
