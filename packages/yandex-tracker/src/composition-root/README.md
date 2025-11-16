# Composition Root & Dependency Injection — Конвенции

**Перед добавлением зависимости в DI ОБЯЗАТЕЛЬНО прочитай этот файл.**

---

## 🎯 Назначение Composition Root

**Composition Root** — единственное место в приложении, где создаются и связываются все зависимости:
- Высший слой архитектуры (выше `infrastructure`, `tracker_api`, `mcp`)
- Инкапсулирует знание о том, как создавать объекты
- Использует InversifyJS для DI

**⚠️ ВАЖНО:** Только `src/index.ts` может импортировать `@composition-root`

---

## 📁 Структура

```
src/composition-root/
├── definitions/        # Декларативная регистрация (автоматическая)
│   ├── index.ts
│   ├── tool-definitions.ts
│   └── operation-definitions.ts
├── types.ts            # Symbol-based DI токены (TYPES)
├── container.ts        # Конфигурация DI контейнера
├── index.ts            # Публичный API
└── CONVENTIONS.md
```

---

## 🔑 types.ts — DI токены

**Все токены — Symbol-based, НЕ классы:**

```typescript
export const TYPES = {
  // === Config & Infrastructure ===
  ServerConfig: Symbol.for('ServerConfig'),
  Logger: Symbol.for('Logger'),

  // === HTTP Layer ===
  HttpClient: Symbol.for('HttpClient'),
  RetryStrategy: Symbol.for('RetryStrategy'),
  RetryHandler: Symbol.for('RetryHandler'),

  // === Cache Layer ===
  CacheManager: Symbol.for('CacheManager'),

  // === Yandex Tracker Facade ===
  YandexTrackerFacade: Symbol.for('YandexTrackerFacade'),

  // === Tool Registry ===
  ToolRegistry: Symbol.for('ToolRegistry'),

  // === Search Engine ===
  ToolSearchEngine: Symbol.for('ToolSearchEngine'),

  // === Operations (автоматически сгенерированы) ===
  ...OPERATION_SYMBOLS,

  // === Tools (автоматически сгенерированы) ===
  ...TOOL_SYMBOLS,
} as const;
```

**⚠️ НЕ используй классы напрямую для DI:**
```typescript
// ❌ НЕПРАВИЛЬНО
container.bind(HttpClient).toSelf();

// ✅ ПРАВИЛЬНО
container.bind<HttpClient>(TYPES.HttpClient).toDynamicValue(() => { ... });
```

---

## 🤖 definitions/ — Автоматическая регистрация

**Проблема:** При добавлении нового Tool/Operation приходится:
1. Создать класс
2. Добавить символ в `types.ts`
3. Зарегистрировать в `container.ts`
4. Добавить в `ToolRegistry` (для tools)

**Решение:** Декларативный подход через `definitions/`.

### Структура

```
definitions/
├── index.ts                   # Реэкспорт
├── tool-definitions.ts        # Массив всех Tool классов
└── operation-definitions.ts   # Массив всех Operation классов
```

### Как это работает

**1. Добавляешь класс в definitions:**

```typescript
// definitions/tool-definitions.ts
export const TOOL_CLASSES = [
  PingTool,
  GetIssuesTool,
  NewTool,  // ← ДОБАВИЛ ОДНУ СТРОКУ
] as const;
```

**2. ВСЁ ОСТАЛЬНОЕ АВТОМАТИЧЕСКИ:**

- **types.ts:** Символы генерируются из `TOOL_CLASSES.map(ToolClass.name)`
- **container.ts:** Loop по `TOOL_CLASSES` регистрирует все tools
- **ToolRegistry:** Извлекает все tools из контейнера через `TOOL_CLASSES`

**Результат:** 1 строка вместо ~30 строк boilerplate кода.

**Эталон:** `src/composition-root/container.ts:189-199` (bindTools)

---

## 🏗️ container.ts — Конфигурация контейнера

**Структура:**

```typescript
import { Container } from 'inversify';
import { TYPES } from './types.js';

export function createContainer(): Container {
  const container = new Container({
    defaultScope: 'Singleton' // Убирает .inSingletonScope()
  });

  bindInfrastructure(container);
  bindOperations(container);
  bindFacade(container);
  bindTools(container);
  bindMCP(container);

  return container;
}

function bindInfrastructure(container: Container): void {
  // Config
  container.bind<ServerConfig>(TYPES.Config).toDynamicValue(() => {
    return loadConfig();
  });

  // HttpClient
  container.bind<HttpClient>(TYPES.HttpClient).toDynamicValue((context) => {
    const config = context.container.get<ServerConfig>(TYPES.Config);
    const logger = context.container.get<Logger>(TYPES.Logger);
    return new HttpClient(/* ... */);
  });

  // ... остальные зависимости
}

function bindOperations(container: Container): void {
  container.bind<GetIssuesOperation>(TYPES.GetIssuesOperation).toDynamicValue((context) => {
    return new GetIssuesOperation(
      context.container.get<HttpClient>(TYPES.HttpClient),
      context.container.get<Logger>(TYPES.Logger),
      context.container.get<Cache<IssueWithUnknownFields>>(TYPES.Cache),
      context.container.get<ParallelExecutor>(TYPES.ParallelExecutor)
    );
  });
}
```

---

## 📋 Чек-лист добавления зависимости

### Для Infrastructure/Facade/Registry зависимостей

- [ ] **Добавить токен в `types.ts` вручную**
- [ ] **Зарегистрировать в `container.ts`** в соответствующей функции `bind*()`
- [ ] **Использование в коде:**
  ```typescript
  const service = container.get<NewService>(TYPES.NewService);
  ```
- [ ] **Тесты:**
  - [ ] Создать mock-контейнер в тестах
  - [ ] Примеры: `tests/unit/tracker_api/facade/yandex-tracker.facade.test.ts`
- [ ] `npm run validate` — проходит

### Для Operation/Tool зависимостей

- [ ] **АВТОМАТИЧЕСКАЯ РЕГИСТРАЦИЯ:**
  - [ ] Для Tool: добавь 1 строку в `definitions/tool-definitions.ts`
  - [ ] Для Operation: добавь 1 строку в `definitions/operation-definitions.ts`
  - [ ] ВСЁ! (Символы, bind, registry — автоматически)

⚠️ **Особый случай:** Helper tools с нестандартным конструктором
(как `SearchToolsTool`) требуют отдельной регистрации в `container.ts`.

---

## 🚨 Критические правила

### 1. Symbol-based токены, НЕ классы

✅ **Правильно:**
```typescript
// types.ts
export const TYPES = {
  HttpClient: Symbol.for('HttpClient'),
};

// container.ts
container.bind<HttpClient>(TYPES.HttpClient).toDynamicValue(() => { ... });
```

❌ **Неправильно:**
```typescript
container.bind(HttpClient).toSelf(); // Привязка по классу — ЗАПРЕЩЕНО
```

---

### 2. toDynamicValue(), НЕ декораторы

✅ **Правильно:**
```typescript
container.bind<T>(TYPES.Service).toDynamicValue((context) => {
  return new Service(/* dependencies */);
});
```

❌ **Неправильно:**
```typescript
@injectable() // НЕ используем декораторы
class Service { ... }

container.bind(Service).toSelf();
```

**Причина:** Предпочитаем явную конфигурацию в `container.ts`.
Легче отлаживать (все зависимости в одном месте).
Меньше "магии" в runtime.

**Примечание:** Проект использует `reflect-metadata` для других целей,
но НЕ для InversifyJS декораторов `@injectable()`.

---

### 3. defaultScope: 'Singleton'

**Контейнер создаётся с `defaultScope: 'Singleton'`:**

```typescript
const container = new Container({ defaultScope: 'Singleton' });
```

**Это означает:**
- ❌ НЕ пиши `.inSingletonScope()` явно (redundant)
- ✅ Все зависимости — singleton по умолчанию
- ✅ Для transient scope — явно укажи `.inTransientScope()`

---

### 4. Только index.ts импортирует Composition Root

✅ **Правильно:**
```typescript
// src/index.ts
import { createContainer } from '@composition-root/container.js';
const container = createContainer();
```

❌ **Неправильно:**
```typescript
// src/mcp/tools/some-tool.ts
import { createContainer } from '@composition-root/container.js'; // ЗАПРЕЩЕНО
```

**Проверяется:** `dependency-cruiser` (правило "composition-root-top-level")

---

## 📚 Примеры

### Infrastructure зависимость

```typescript
function bindInfrastructure(container: Container): void {
  container.bind<Logger>(TYPES.Logger).toDynamicValue((context) => {
    const config = context.container.get<ServerConfig>(TYPES.Config);
    return Logger.createPinoLogger({
      logsDir: config.logsDir,
      level: config.logLevel,
      prettyPrint: config.prettyLogs,
    });
  });
}
```

### Operation зависимость

```typescript
function bindOperations(container: Container): void {
  container.bind<GetIssuesOperation>(TYPES.GetIssuesOperation).toDynamicValue((context) => {
    return new GetIssuesOperation(
      context.container.get<HttpClient>(TYPES.HttpClient),
      context.container.get<Logger>(TYPES.Logger),
      context.container.get<Cache<IssueWithUnknownFields>>(TYPES.Cache),
      context.container.get<ParallelExecutor>(TYPES.ParallelExecutor)
    );
  });
}
```

### MCP Tool зависимость

```typescript
function bindTools(container: Container): void {
  container.bind<GetIssuesTool>(TYPES.GetIssuesTool).toDynamicValue((context) => {
    return new GetIssuesTool(
      context.container.get<YandexTrackerFacade>(TYPES.YandexTrackerFacade),
      context.container.get<Logger>(TYPES.Logger)
    );
  });
}
```

---

## 💡 Примеры использования

### Извлечение зависимостей в продакшене

```typescript
import { loadConfig } from '@infrastructure/config.js';
import { createContainer, TYPES } from '@composition-root/index.js';
import type { Logger } from '@infrastructure/logging/index.js';

const config = loadConfig();
const container = await createContainer(config); // ASYNC!
const logger = container.get<Logger>(TYPES.Logger);
logger.info('Приложение запущено');
```

### Unit тесты: Mock Container с Operations

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Container } from 'inversify';
import { YandexTrackerFacade } from '@tracker_api/facade/yandex-tracker.facade.js';
import type { PingOperation } from '@tracker_api/api_operations/user/ping.operation.js';

describe('YandexTrackerFacade', () => {
  let facade: YandexTrackerFacade;
  let mockContainer: Container;
  let mockPingOperation: PingOperation;

  beforeEach(() => {
    mockPingOperation = { execute: vi.fn() } as unknown as PingOperation;

    mockContainer = {
      get: vi.fn((symbol: symbol) => {
        if (symbol === Symbol.for('PingOperation')) return mockPingOperation;
        throw new Error(`Unknown symbol: ${symbol.toString()}`);
      }),
    } as unknown as Container;

    facade = new YandexTrackerFacade(mockContainer);
  });

  it('должна успешно вызвать операцию ping', async () => {
    vi.mocked(mockPingOperation.execute).mockResolvedValue({ success: true });
    const result = await facade.ping();
    expect(result.success).toBe(true);
  });
});
```

### Unit тесты: Mock Facade

```typescript
import { ToolRegistry } from '@mcp/tool-registry.js';
import type { YandexTrackerFacade } from '@tracker_api/facade/yandex-tracker.facade.js';
import { PingTool } from '@mcp/tools/ping.tool.js';

let mockFacade = { ping: vi.fn() } as unknown as YandexTrackerFacade;
let mockContainer = {
  get: vi.fn((symbol: symbol) => {
    if (symbol.toString().includes('PingTool')) {
      return new PingTool(mockFacade, mockLogger);
    }
    throw new Error(`Unknown symbol: ${symbol.toString()}`);
  }),
} as unknown as Container;

const registry = new ToolRegistry(mockContainer, mockLogger);
```

### Интеграционные тесты: Реальный контейнер

```typescript
import { createContainer, TYPES } from '@composition-root/index.js';
import type { ToolRegistry } from '@mcp/tool-registry.js';

const config = {
  apiBase: 'https://api.tracker.yandex.net',
  orgId: 'test-org',
  token: 'test-token',
  logLevel: 'silent', // Отключаем логи
  logsDir: '',
};

const container = await createContainer(config);
const registry = container.get<ToolRegistry>(TYPES.ToolRegistry);
expect(registry.getDefinitions().length).toBeGreaterThan(0);
```

### Типичные ошибки

**❌ Забыть await:**
```typescript
const container = createContainer(config); // ❌ Забыли await
const logger = container.get(TYPES.Logger); // TypeError: container is Promise
```

**✅ Правильно:**
```typescript
const container = await createContainer(config); // ✅
```

**❌ Создавать Logger вручную:**
```typescript
const logger = new Logger({ level: 'info' }); // ❌
```

**✅ Правильно:**
```typescript
const logger = container.get<Logger>(TYPES.Logger); // ✅
```

**❌ Использовать container.rebind() в unit тестах:**
```typescript
container.rebind(TYPES.HttpClient).toConstantValue(mockHttp); // ❌ Ошибка: не зарегистрирован
```

**✅ Правильно:**
```typescript
container.bind(TYPES.HttpClient).toConstantValue(mockHttp); // ✅
```

---

## 🔗 См. также

- **Operations:** [src/tracker_api/api_operations/README.md](../tracker_api/api_operations/README.md)
- **MCP Tools:** [src/mcp/README.md](../mcp/README.md)
- **Общие правила:** [CLAUDE.md](../../CLAUDE.md)
- **Реальные unit тесты:** `tests/unit/tracker_api/facade/yandex-tracker.facade.test.ts`
- **Реальные integration тесты:** `tests/integration/helpers/mcp-client.ts`
