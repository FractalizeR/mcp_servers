# Composition Root & Dependency Injection — Конвенции

**Перед добавлением зависимости в DI ОБЯЗАТЕЛЬНО прочитай этот файл.**


## 🎯 Назначение Composition Root

**Composition Root** — единственное место в приложении, где создаются и связываются все зависимости:
- Высший слой архитектуры (выше `infrastructure`, `tracker_api`, `mcp`)
- Инкапсулирует знание о том, как создавать объекты
- Использует InversifyJS для DI

**⚠️ ВАЖНО:** Только `src/index.ts` может импортировать `@composition-root`


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


## 🔑 types.ts — DI токены

**Все токены — Symbol-based, НЕ классы:**

```typescript
export const TYPES = {
  ServerConfig: Symbol.for('ServerConfig'),
  HttpClient: Symbol.for('HttpClient'),
  YandexTrackerFacade: Symbol.for('YandexTrackerFacade'),
  // ... operations & tools symbols
} as const;
```


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


## 🛡️ Защита от коллизий имён

**Проблема:** Автоматическая генерация Symbol токенов из имён классов может привести к коллизиям, если два класса имеют одинаковое имя или если минификация изменит имена.

**Решение:** Двухуровневая защита

### 1. Namespace префиксы

DI система автоматически генерирует символы с namespace префиксами:

```typescript
// types.ts
Symbol.for("tool:GetIssuesTool")      // Tool классы
Symbol.for("operation:GetIssuesOperation")  // Operation классы
```

**Преимущества:**
- ✅ Разделение namespaces (tool, operation)
- ✅ Меньше вероятность коллизий
- ✅ Более читаемые символы в отладке

### 2. Runtime валидация уникальности

При создании контейнера автоматически проверяется уникальность имён:

```typescript
// container.ts
export async function createContainer(config: ServerConfig): Promise<Container> {
  // Валидация перед созданием контейнера
  validateDIRegistrations();

  // ... остальной код
}
```

**Обработка ошибок:**

Если валидация не проходит, приложение не запустится:

```
Error: Duplicate Tool class names detected: UpdateIssueTool.
Each Tool must have a unique name for DI registration.
```

**Решение:** Переименовать один из классов.

### 3. Debug логирование

При старте приложения логируются все зарегистрированные символы:

```json
{
  "toolSymbols": ["PingTool", "GetIssuesTool", ...],
  "operationSymbols": ["PingOperation", "GetIssuesOperation", ...],
  "totalTools": 48,
  "totalOperations": 65
}
```

**Запуск с debug логами:**
```bash
LOG_LEVEL=debug npm start
```

### Best Practices

1. ✅ **Уникальные имена:** Каждый Tool/Operation должен иметь уникальное имя
2. ✅ **Избегать минификации:** Не минифицировать production build (или использовать `keep_classnames`)
3. ✅ **Namespace separation:** `tool:*` и `operation:*` не могут конфликтовать между собой


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


## 🚨 Критические правила

### 1. DI Tokens: Symbol vs Class-based

**Проект использует ДВА типа токенов в зависимости от паттерна:**

#### **Symbol-based tokens (для Infrastructure, Operations, Tools)**

**Когда использовать:**
- ✅ Infrastructure компоненты (Logger, HttpClient, CacheManager)
- ✅ Operations и Tools (автоматически генерируются)
- ✅ Используется паттерн **Factory** (`toDynamicValue`)

**Пример:**
```typescript
// types.ts
export const TYPES = {
  HttpClient: Symbol.for('HttpClient'),
  Logger: Symbol.for('Logger'),
};

// container.ts
container.bind<IHttpClient>(TYPES.HttpClient).toDynamicValue(() => {
  return new AxiosHttpClient(...);
});

// Использование
const httpClient = container.get<IHttpClient>(TYPES.HttpClient);
```


#### **Class-based tokens (для Services & Facade)**

**Когда использовать:**
- ✅ Facade Services (IssueService, UserService, etc.)
- ✅ YandexTrackerFacade
- ✅ Используется паттерн **Decorators** (`@injectable()`)

**Пример:**
```typescript
// service.ts
@injectable()
export class IssueService { ... }

// definitions/facade-services.ts
container.bind(IssueService).toSelf(); // ← Класс как токен

// Использование (auto-wiring через @inject)
@injectable()
export class YandexTrackerFacade {
  constructor(
    @inject(IssueService) private readonly issueService: IssueService
  ) {}
}
```

**Преимущество:** InversifyJS автоматически разрешает зависимости через TypeScript metadata


#### **Правила выбора:**

| Компонент | Token Type | Регистрация | Пример |
|-----------|-----------|-------------|--------|
| **Infrastructure** | Symbol | `toDynamicValue()` | `TYPES.HttpClient` |
| **Operations** | Symbol (auto) | `toDynamicValue()` | `Symbol.for('PingOperation')` |
| **Tools** | Symbol (auto) | `toDynamicValue()` | `Symbol.for('PingTool')` |
| **Services** | Class | `.toSelf()` | `IssueService` |
| **Facade** | Symbol + Class | `.to(Class)` | `TYPES.YandexTrackerFacade` |


### 2. Два паттерна DI: Factory vs Decorators

**Проект использует HYBRID APPROACH** — два разных паттерна для разных типов классов.

#### **Паттерн A: Decorators (для Services & Facade)**

**Когда использовать:**
- ✅ Класс имеет **переменные зависимости** (каждый класс уникален)
- ✅ Класс — это Service или Facade (доменная логика)
- ✅ Много зависимостей в конструкторе (5-14 параметров)

**Пример (IssueService):**
```typescript
import { injectable, inject } from 'inversify';

@injectable()
export class IssueService {
  constructor(
    @inject(GetIssuesOperation) private readonly getIssuesOp: GetIssuesOperation,
    @inject(FindIssuesOperation) private readonly findIssuesOp: FindIssuesOperation,
    @inject(CreateIssueOperation) private readonly createIssueOp: CreateIssueOperation,
    // ... 7 operations - каждый Service уникален
  ) {}
}
```

**Регистрация:**
```typescript
// definitions/facade-services.ts
container.bind(IssueService).toSelf(); // Class-based token, auto-wiring
```

**Преимущества:**
- 🎯 Минимальный boilerplate (1 строка регистрации вместо 10+)
- 🎯 Auto-wiring зависимостей (InversifyJS читает типы из конструктора)
- 🎯 Type-safe (TypeScript проверяет соответствие типов)

**Используется в:** 14 Facade Services + YandexTrackerFacade (15 классов)


#### **Паттерн B: Factory (для Operations, Tools, Infrastructure)**

**Когда использовать:**
- ✅ Классы имеют **одинаковый конструктор** (uniform dependencies)
- ✅ Класс наследует BaseOperation или BaseTool
- ✅ Можно использовать **одну универсальную factory** для всех классов

**Пример (Operations — 65+ классов с одинаковым конструктором):**
```typescript
// Все Operations: (httpClient, cacheManager, logger, config)
export class PingOperation extends BaseOperation {
  constructor(
    httpClient: IHttpClient,
    cacheManager: CacheManager,
    logger: Logger,
    config: ServerConfig
  ) {
    super(httpClient, cacheManager, logger);
  }
}
```

**Регистрация (универсальная для ВСЕХ Operations):**
```typescript
// container.ts
for (const OperationClass of OPERATION_CLASSES) {
  container.bind(OperationClass).toDynamicValue(() => {
    const httpClient = container.get<IHttpClient>(TYPES.HttpClient);
    const cacheManager = container.get<CacheManager>(TYPES.CacheManager);
    const logger = container.get<Logger>(TYPES.Logger);
    const config = container.get<ServerConfig>(TYPES.ServerConfig);
    return new OperationClass(httpClient, cacheManager, logger, config);
  });
}
```

**Преимущества:**
- 🎯 Один factory на 65+ классов (максимальная переиспользуемость)
- 🎯 Explicit dependencies (все зависимости видны в одном месте)
- 🎯 Проще тестировать (можно создать `new Operation(mockDeps)` без контейнера)

**Используется в:** 65+ Operations, 48+ Tools, Infrastructure (Logger, HttpClient, etc.)


#### **Когда использовать какой паттерн?**

| Критерий | Decorators | Factory |
|----------|-----------|---------|
| **Конструкторы** | Разные (3-14 параметров) | Одинаковые (4 параметра) |
| **Количество классов** | Мало (15) | Много (100+) |
| **Boilerplate без DI** | Высокий (~10 строк/класс) | Низкий (1 функция на все) |
| **Примеры** | Facade Services | Operations, Tools |
| **Регистрация** | `.toSelf()` | `.toDynamicValue(factory)` |

**Вывод:** Hybrid approach — это не баг, а pragmatic engineering решение!


### 3. defaultScope: 'Singleton'

**Контейнер создаётся с `defaultScope: 'Singleton'`:**

```typescript
const container = new Container({ defaultScope: 'Singleton' });
```

**Это означает:**
- ❌ НЕ пиши `.inSingletonScope()` явно (redundant)
- ✅ Все зависимости — singleton по умолчанию
- ✅ Для transient scope — явно укажи `.inTransientScope()`


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

### Unit тесты

**См. примеры:** `tests/unit/tracker_api/**/*.test.ts`

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


## 🔗 См. также

- **Operations:** [src/tracker_api/api_operations/README.md](../tracker_api/api_operations/README.md)
- **MCP Tools:** [src/tools/README.md](../tools/README.md)
- **Общие правила:** [CLAUDE.md](../../CLAUDE.md)
- **Реальные unit тесты:** `tests/unit/tracker_api/facade/yandex-tracker.facade.test.ts`
- **Реальные integration тесты:** `tests/integration/helpers/mcp-client.ts`
