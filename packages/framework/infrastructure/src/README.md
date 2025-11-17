# Infrastructure — Переиспользуемый инфраструктурный слой

**HTTP, кеш, асинхронность, логирование, конфигурация**

---

## 🎯 Назначение

**Принцип:** Инфраструктурный слой НЕ знает о домене (Яндекс.Трекер, MCP)

**Переиспользуемость:** Все компоненты можно использовать в других проектах без изменений

**Архитектурное правило:** Infrastructure НЕ импортирует `tracker_api`, `mcp`, `composition-root`

---

## 📁 Структура

```
src/infrastructure/
├── http/                    # HTTP клиент + retry + error mapping
│   ├── client/
│   │   └── http-client.ts  # Axios wrapper
│   ├── retry/
│   │   ├── retry-handler.ts
│   │   └── exponential-backoff.strategy.ts
│   └── error/
│       └── error-mapper.ts # AxiosError → ApiError
├── cache/                   # Кеширование (Strategy Pattern)
│   ├── cache-manager.interface.ts
│   └── no-op-cache.ts      # Null Object
├── async/                   # Параллелизация
│   └── parallel-executor.ts # Throttling для batch-запросов
├── logging/                 # Production logging (Pino)
│   └── README.md           # Подробная документация
├── config.ts                # Конфигурация из env
└── index.ts                 # Экспорты
```

---

## 🔧 Компоненты

### HTTP Слой

**HttpClient** — Axios wrapper с встроенным retry и error mapping

**Ключевые возможности:**
- ✅ Автоматический retry (ExponentialBackoffStrategy)
- ✅ Маппинг AxiosError → ApiError
- ✅ Timeout конфигурация (через config)
- ✅ Типобезопасность (generic `<T>`)

**Файлы:**
- `http/client/http-client.ts` — главный класс
- `http/retry/retry-handler.ts` — retry логика
- `http/retry/exponential-backoff.strategy.ts` — стратегия
- `http/error/error-mapper.ts` — маппинг ошибок

**Использование:**
```typescript
const client = new HttpClient(config, logger, retryHandler);
const data = await client.get<Issue>('/v3/issues/QUEUE-1');
```

### Кеширование

**CacheManager** — интерфейс (Strategy Pattern)

**Реализации:**
- `NoOpCache` — Null Object (кеш выключен)
- Можно добавить Redis, Memcached и т.д.

**Файлы:** `cache/cache-manager.interface.ts`, `cache/no-op-cache.ts`

### Параллелизация

**ParallelExecutor** — выполнение batch-запросов с throttling

**Два независимых лимита:**
1. **MAX_BATCH_SIZE** (бизнес-лимит): 200 элементов
2. **MAX_CONCURRENT_REQUESTS** (технический лимит): 5 одновременных запросов

**Как работает:**
- Разбивает массив на chunks по `MAX_BATCH_SIZE`
- Выполняет chunks параллельно с лимитом `MAX_CONCURRENT_REQUESTS`
- Использует `Promise.allSettled` для сохранения всех результатов

**Файл:** `async/parallel-executor.ts`

**Использование:**
```typescript
const executor = new ParallelExecutor(config);
const results = await executor.execute(
  keys,
  (key) => httpClient.get<Issue>(`/v3/issues/${key}`)
);
// results: BatchResult<string, Issue>
```

### Логирование

**Pino** — production-ready logging с автоматической ротацией

**Подробная документация:** [logging/README.md](./logging/README.md)

**Ключевые возможности:**
- ✅ Structured JSON логи
- ✅ Автоматическая ротация (старые логи → `.gz`)
- ✅ Dual output (error/warn → stderr + файл, info/debug → файл)
- ✅ Request tracing (child loggers)

**Конфигурация:**
- `LOGS_DIR` — директория логов
- `LOG_LEVEL` — уровень (debug, info, warn, error)
- `PRETTY_LOGS` — pretty-printing для development
- `LOG_MAX_SIZE` — размер для ротации (по умолчанию 50KB)
- `LOG_MAX_FILES` — количество ротируемых файлов (по умолчанию 20)

### Конфигурация

**loadConfig()** — загрузка и валидация env переменных

**Файл:** `config.ts`

**Валидация:**
- ✅ Обязательные параметры (token, orgId)
- ✅ Диапазоны значений (timeout: 5000-120000ms, batchSize: 1-1000)
- ✅ Дефолтные значения
- ✅ Type-safe `ServerConfig` интерфейс

**Переменные:**
- `YANDEX_TRACKER_TOKEN` — OAuth токен (обязательно)
- `YANDEX_ORG_ID` — ID организации (обязательно)
- `REQUEST_TIMEOUT` — таймаут запросов (по умолчанию 30000ms)
- `MAX_BATCH_SIZE` — лимит batch (по умолчанию 200)
- `MAX_CONCURRENT_REQUESTS` — лимит параллелизма (по умолчанию 5)
- + переменные логирования (см. logging/README.md)

---

## 🚨 Критические правила

### 1. Инфраструктура НЕ знает о домене

```typescript
// ❌ ЗАПРЕЩЕНО (импорт из tracker_api)
import { Issue } from '@tracker_api/entities/issue.entity.js';

// ✅ ПРАВИЛЬНО (generic типы)
class HttpClient {
  async get<T>(url: string): Promise<T> { ... }
}
```

### 2. Используй config для всех параметров

```typescript
// ❌ ЗАПРЕЩЕНО (хардкод значений)
const timeout = 30000;

// ✅ ПРАВИЛЬНО (через config)
const timeout = config.requestTimeout;
```

### 3. Retry встроен в HttpClient

```typescript
// ✅ Retry работает автоматически
const client = new HttpClient(config, logger, retryHandler);
await client.get('/v3/issues/QUEUE-1'); // Retry при ошибке
```

### 4. Все ошибки маппятся в ApiError

```typescript
// ✅ HttpClient автоматически маппит AxiosError → ApiError
try {
  await client.get('/v3/issues/NOT-FOUND');
} catch (error) {
  // error: ApiError (не AxiosError)
}
```

---

## 🔗 См. также

- **Logging подробно:** [logging/README.md](./logging/README.md)
- **ARCHITECTURE.md:** [ARCHITECTURE.md](../../ARCHITECTURE.md)
- **Конфигурация:** [config.ts](./config.ts)
