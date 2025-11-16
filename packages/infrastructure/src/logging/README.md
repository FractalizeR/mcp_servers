# Logging — Production-ready логирование

**Pino + rotating-file-stream для structured logging с автоматической ротацией**

---

## 🎯 Назначение

**Production-ready логирование** для MCP сервера с поддержкой:
- Structured JSON logging
- Автоматическая ротация файлов
- Dual output (stderr + файлы)
- Request tracing (child loggers)
- Готовность к интеграции с alerting

---

## 🏗️ Архитектура

**Основа:** [Pino](https://github.com/pinojs/pino) — высокопроизводительный JSON logger для Node.js

**Wrapper:** `Logger` класс с расширенной функциональностью (src/infrastructure/logging/logger.ts)

**Ротация:** `rotating-file-stream` — автоматическое сжатие старых логов в `.gz`

---

## ⚙️ Конфигурация

**Переменные окружения:**

| Переменная | Тип | По умолчанию | Описание |
|-----------|-----|--------------|----------|
| `LOG_LEVEL` | string | `info` | Уровень: `debug`, `info`, `warn`, `error`, `silent` |
| `LOGS_DIR` | string | `./logs` | Директория для лог-файлов |
| `PRETTY_LOGS` | boolean | `false` | Pretty-printing для development |
| `LOG_MAX_SIZE` | number | `51200` (50KB) | Размер файла для ротации (байты) |
| `LOG_MAX_FILES` | number | `20` | Количество ротируемых файлов |

**Создание Logger:**
```typescript
import { Logger } from '@infrastructure/logging/index.js';
import { loadConfig } from '@infrastructure/config.js';

const config = loadConfig();
const logger = new Logger({
  level: config.logLevel,
  logsDir: config.logsDir,
  pretty: config.prettyLogs,
  rotation: {
    maxSize: config.logMaxSize,
    maxFiles: config.logMaxFiles,
  },
});
```

---

## 📁 Структура логов

**Dual Output:**
- **stderr** — error + warn (для мониторинга/alerting)
- **Файлы** — все уровни (debug, info, warn, error)

**Файлы:**
```
logs/
├── combined.log           # Все логи (JSON)
├── combined.log.1.gz      # Ротированный архив
├── combined.log.2.gz
├── ...
├── error.log              # Только error
├── error.log.1.gz         # Ротированный архив
└── ...
```

**Автоматическая очистка:** При превышении `LOG_MAX_FILES` старые архивы удаляются

---

## 🚀 Использование

### Базовое логирование

```typescript
logger.info('Operation completed', { userId: '123', duration: 45 });
logger.error('Operation failed', error, { requestId: '456' });
logger.warn('Rate limit approaching', { remaining: 10 });
logger.debug('Cache hit', { key: 'user:123' });
```

**Формат логов (JSON):**
```json
{
  "level": "info",
  "time": 1699999999999,
  "pid": 12345,
  "msg": "Operation completed",
  "userId": "123",
  "duration": 45
}
```

### Child loggers (request tracing)

**Назначение:** Привязка correlation ID к группе логов

```typescript
// Создать child logger с correlation ID
const requestLogger = logger.child({ requestId: 'abc-123' });

// Все логи автоматически включают requestId
requestLogger.info('Request started');      // { requestId: 'abc-123', msg: 'Request started' }
requestLogger.error('Request failed', err); // { requestId: 'abc-123', msg: 'Request failed', ... }
```

**Реальный пример:** См. `src/tracker_api/api_operations/issue/get-issues.operation.ts`

---

## 🔧 Development mode

**Pretty-printing для локальной разработки:**

```bash
PRETTY_LOGS=true LOG_LEVEL=debug npm run dev
```

**Формат (human-readable):**
```
[2024-11-15 10:30:45] INFO: Operation completed
    userId: "123"
    duration: 45
```

**Важно:** Pretty logs НЕ записываются в файлы, только в stderr

---

## 🚨 Alerting (задел на будущее)

**Интерфейс готов** (`AlertingTransport`), но алерты пока НЕ отправляются

**Поддерживаемые transports:** Sentry, PagerDuty, Slack webhooks, Email, Custom webhooks

**Реализация:** `logger.setAlertingTransport(transport)`

---

## 📏 Управление размером логов

**Проблема:** Логи не должны занимать весь диск

**Решение:** Автоматическая ротация + лимиты

**Расчёт:**
```
Максимальный размер = LOG_MAX_SIZE * LOG_MAX_FILES * 2 (combined + error)

По умолчанию:
50KB * 20 * 2 = ~2MB на диске
```

**Рекомендации:**
- **Development:** `LOG_MAX_SIZE=1048576` (1MB), `LOG_MAX_FILES=10` (~20MB)
- **Production:** `LOG_MAX_SIZE=10485760` (10MB), `LOG_MAX_FILES=50` (~1GB)

---

## 🚨 Критические правила

### 1. ВСЕГДА используй structured logging

```typescript
// ❌ НЕПРАВИЛЬНО (строковая конкатенация)
logger.info(`User ${userId} completed operation in ${duration}ms`);

// ✅ ПРАВИЛЬНО (structured JSON)
logger.info('User completed operation', { userId, duration });
```

**Почему:** Structured JSON легко парсить/агрегировать в мониторинге

### 2. Используй child loggers для tracing

```typescript
// ✅ ПРАВИЛЬНО (correlation ID автоматически добавляется)
const requestLogger = logger.child({ requestId });
requestLogger.info('Started');
requestLogger.error('Failed');
```

### 3. НЕ логируй чувствительные данные

```typescript
// ❌ ЗАПРЕЩЕНО (утечка токена)
logger.info('API request', { token: 'secret-token-123' });

// ✅ ПРАВИЛЬНО (токен скрыт)
logger.info('API request', { orgId: 'example' });
```

### 4. Используй правильные уровни

- **debug** — детали для отладки (обычно выключен)
- **info** — успешные операции
- **warn** — потенциальные проблемы (rate limit, retry)
- **error** — ошибки, требующие внимания

---

## 🔗 См. также

- **Pino документация:** https://github.com/pinojs/pino
- **rotating-file-stream:** https://github.com/iccicci/rotating-file-stream
- **Infrastructure README:** [../README.md](../README.md)
- **Конфигурация:** [../config.ts](../config.ts)
