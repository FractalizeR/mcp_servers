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
├── types.ts            # Symbol-based DI токены (TYPES)
├── container.ts        # Конфигурация DI контейнера
└── index.ts            # Публичный API (экспорт контейнера)
```

---

## 🔑 types.ts — DI токены

**Все токены — Symbol-based, НЕ классы:**

```typescript
export const TYPES = {
  // Infrastructure
  Config: Symbol.for('Config'),
  HttpClient: Symbol.for('HttpClient'),
  Logger: Symbol.for('Logger'),
  Cache: Symbol.for('Cache'),
  ParallelExecutor: Symbol.for('ParallelExecutor'),

  // Operations
  GetIssuesOperation: Symbol.for('GetIssuesOperation'),
  PingOperation: Symbol.for('PingOperation'),

  // Facade
  YandexTrackerFacade: Symbol.for('YandexTrackerFacade'),

  // MCP Tools
  GetIssuesTool: Symbol.for('GetIssuesTool'),
  PingTool: Symbol.for('PingTool'),

  // MCP
  ToolRegistry: Symbol.for('ToolRegistry'),
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

- [ ] **Добавить токен в `types.ts`:**
  ```typescript
  export const TYPES = {
    // ...
    NewService: Symbol.for('NewService'),
  } as const;
  ```

- [ ] **Зарегистрировать в `container.ts`:**
  - [ ] Определить категорию: Infrastructure / Operations / Facade / Tools / MCP
  - [ ] Добавить в соответствующую функцию `bind*()`
  - [ ] Использовать `toDynamicValue()` для создания инстанса
  - [ ] Inject зависимости через `context.container.get<T>(TYPES.Dependency)`

  ```typescript
  function bindOperations(container: Container): void {
    container.bind<NewOperation>(TYPES.NewOperation).toDynamicValue((context) => {
      return new NewOperation(
        context.container.get<HttpClient>(TYPES.HttpClient),
        context.container.get<Logger>(TYPES.Logger)
      );
    });
  }
  ```

- [ ] **Использование в коде:**
  ```typescript
  const operation = container.get<NewOperation>(TYPES.NewOperation);
  ```

- [ ] **Тесты:**
  - [ ] Создать mock-контейнер в тестах
  - [ ] Примеры: `tests/unit/tracker_api/facade/yandex-tracker.facade.test.ts`

- [ ] `npm run validate` — проходит

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

**Причина:** Декораторы требуют `reflect-metadata` и усложняют отладку

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

## 🔧 Тестирование с DI

**Создание mock-контейнера:**

```typescript
import { Container } from 'inversify';
import { TYPES } from '@composition-root/types.js';

describe('MyService', () => {
  let container: Container;
  let mockHttpClient: HttpClient;

  beforeEach(() => {
    container = new Container();

    // Mock зависимостей
    mockHttpClient = {
      get: vi.fn(),
      post: vi.fn(),
    } as unknown as HttpClient;

    container.bind<HttpClient>(TYPES.HttpClient).toConstantValue(mockHttpClient);

    // Реальный сервис
    container.bind<MyService>(TYPES.MyService).toDynamicValue((context) => {
      return new MyService(
        context.container.get<HttpClient>(TYPES.HttpClient)
      );
    });
  });

  it('should work', () => {
    const service = container.get<MyService>(TYPES.MyService);
    // ...
  });
});
```

---

## 🔗 См. также

- **DI использование в тестах:** [docs/di-usage-example.md](../../docs/di-usage-example.md)
- **Operations:** [src/tracker_api/api_operations/CONVENTIONS.md](../tracker_api/api_operations/CONVENTIONS.md)
- **MCP Tools:** [src/mcp/CONVENTIONS.md](../mcp/CONVENTIONS.md)
- **Общие правила:** [CLAUDE.md](../../CLAUDE.md)
