# Архитектура проекта Yandex Tracker MCP

## 🎯 Архитектурные принципы

### 1. Feature-by-Folder
Группируем файлы по функциональности, а не по типу файла.

**✅ Правильно:**
```
api/http/retry/
├── retry-handler.ts
├── retry-strategy.interface.ts
└── exponential-backoff.strategy.ts
```

**❌ Неправильно:**
```
strategies/
└── exponential-backoff.ts
handlers/
└── retry-handler.ts
```

### 2. Строгий SRP (Single Responsibility Principle)
Каждый класс отвечает ТОЛЬКО за одну операцию/стратегию/фичу.

- ✅ `PingOperation` — только проверка подключения
- ✅ `GetIssuesOperation` — только batch-получение задач
- ❌ `IssueOperations` с методами get, create, update, delete

### 3. Dependency Injection
Все зависимости передаются через конструктор, не создаются внутри классов.

**Используемый IoC контейнер:** InversifyJS v7
**Подход:** Symbol-based tokens (TYPES) для типобезопасной привязки зависимостей

### 4. Interface Segregation
Каждый интерфейс минимален и специфичен для конкретной задачи.

### 5. Open/Closed Principle
Система открыта для расширения (новые стратегии, операции), закрыта для модификации.

---

## 📂 Структура проекта

**Исследование структуры:** используй `Glob` или `tree src/` для актуального состояния.

**Ключевые директории:**

- **`infrastructure/`** — Инфраструктурный слой (переиспользуемый, не знает о домене)
  - `di/` — DI контейнер (InversifyJS v7, Symbol-based tokens)
    - `types.ts` — токены TYPES для всех зависимостей
    - `container.ts` — конфигурация контейнера
  - `http/` — HTTP слой (низкоуровневый)
    - `client/` — HttpClient (Axios wrapper)
    - `retry/` — RetryHandler + стратегии
    - `error/` — ErrorMapper (AxiosError → ApiError)
  - `cache/` — Кеширование
    - `cache-manager.interface.ts` — интерфейс (Strategy Pattern)
    - `no-op-cache.ts` — реализация (Null Object)
  - `async/` — Утилиты для параллелизации
    - `parallel-executor.ts` — параллельное выполнение с throttling
  - `logger.ts` — Логирование
  - `config.ts` — Конфигурация из env

- **`tracker_api/`** — Доменная логика (специфика Яндекс.Трекера)
  - `entities/` — доменные типы (Issue, User)
  - `operations/` — API операции (Feature-by-Folder + SRP)
    - `base-operation.ts` — базовый класс
    - `user/` — работа с пользователями
    - `issue/` — batch-операции с задачами
  - `facade/` — YandexTrackerFacade для удобного API

- **`mcp/`** — Application layer (MCP сервер)
  - `tools/` — MCP инструменты
    - `base-tool.ts` — базовый класс
    - `*.tool.ts` — конкретные инструменты (ping, get-issues, etc.)
  - `utils/` — MCP утилиты
    - `response-field-filter.ts` — фильтрация полей ответа (экономия токенов)
  - `tool-registry.ts` — регистрация и маршрутизация tools

**Тесты:** `tests/unit/` зеркалирует структуру `src/`

---

## 🔄 Поток данных

**Цепочка вызовов:**

1. **MCP Client** (Claude Desktop App) → JSON-RPC через stdio
2. **MCP Server** (`index.ts`) → обработчики `tools/list`, `tools/call`
3. **ToolRegistry** (`tool-registry.ts`) → маппинг имён на Tool классы
4. **Concrete Tool** (например, `ping.tool.ts`) → валидация параметров
5. **YandexTrackerFacade** → делегирование операциям
6. **Operation** (например, `ping.operation.ts`) → бизнес-логика
7. **RetryHandler** → обёртка для retry логики
8. **HttpClient** → HTTPS запрос к API Яндекс.Трекер v3

**Разделение ответственности по слоям:**

- **Tools** — валидация входных данных, форматирование результата для Claude
- **Facade** — удобный высокоуровневый API для tools
- **Operations** — бизнес-логика конкретных API операций
- **HTTP/Retry/Cache** — инфраструктурные компоненты (переиспользуемые)

**Независимость компонентов:**
- `HttpClient` не знает про retry
- `RetryHandler` не знает про HTTP
- `CacheManager` не знает про API
- Композируется в `Operation` через DI

---

## 📦 Entities и DTO: Forward Compatibility Pattern

### Проблема

При эволюции API Яндекс.Трекер добавляет новые поля. Без специальной обработки они теряются при передаче через TypeScript слои.

### Решение: Разделение типов по направлению потока данных

**Структура:**
```
src/tracker_api/
├── entities/              # Чтение (с unknown полями)
│   ├── types.ts          # WithUnknownFields<T>
│   ├── issue.entity.ts   # Issue + IssueWithUnknownFields
│   └── queue.entity.ts   # Queue + QueueWithUnknownFields
├── dto/                  # Запись (только known поля)
│   └── issue/
│       ├── create-issue.dto.ts
│       └── update-issue.dto.ts
```

### Входящие данные (от API): *WithUnknownFields

**Определение:** `src/tracker_api/entities/types.ts`

**Использование в entities:**
```typescript
// issue.entity.ts
export interface Issue { /* known fields */ }
export type IssueWithUnknownFields = WithUnknownFields<Issue>;
```

**Использование в operations:**
```typescript
async execute(keys: string[]): Promise<IssueWithUnknownFields[]> {
  return this.httpClient.get<IssueWithUnknownFields>(`/v3/issues`);
}
```

### Исходящие данные (в API): строгие DTO

**Определение:** `src/tracker_api/dto/issue/update-issue.dto.ts`

**Особенности:**
- Только known поля
- Для input DTO можно добавить `[key: string]: unknown` для кастомных полей Трекера
- NO index signature для output (type-safe)

**Использование в operations:**
```typescript
async execute(key: string, data: UpdateIssueDto): Promise<IssueWithUnknownFields> {
  // TypeScript не даст передать лишние поля в data
  return this.httpClient.patch<IssueWithUnknownFields>(`/v3/issues/${key}`, data);
}
```

### Ограничения

- Unknown поля сохраняются только на **верхнем уровне** объекта
- Для вложенных объектов (`queue.newField`) unknown поля **НЕ** типизированы, но сохраняются при JSON.stringify
- При необходимости deep support — использовать `DeepPartial<T>` (пока не требуется)

**Детали:** см. `src/tracker_api/entities/types.ts`, CLAUDE.md (чек-листы Entity/DTO)

---

## 🏗️ Dependency Injection (DI)

### Архитектура DI модуля

**Файлы:**
- `src/composition-root/types.ts` — Symbol-based токены для всех зависимостей
- `src/composition-root/container.ts` — конфигурация InversifyJS контейнера
- `src/composition-root/index.ts` — публичный API (TYPES, createContainer)

### Symbol-based tokens (TYPES)

**Решение:** Используем Symbol-based подход вместо class-based binding.

**Преимущества:**
1. Работает с интерфейсами (не только с классами)
2. Лучше для тестов (легко подменять через `container.rebind()`)
3. Явный контракт (все зависимости в `types.ts`)
4. Поддержка multiple bindings

**Файл:** `src/composition-root/types.ts`

### Конфигурация контейнера

**Ключевые особенности:**
- `defaultScope: 'Singleton'` — все зависимости по умолчанию Singleton
- `toDynamicValue()` — гибкое создание зависимостей с доступом к контейнеру
- Модульная структура bind функций (по слоям: HTTP, Cache, Operations, Tools)

**Файл:** `src/composition-root/container.ts`

### Использование в коде

**До DI (ручное создание):**
```typescript
const retryStrategy = new ExponentialBackoffStrategy(3, 1000, 10000);
const httpClient = new HttpClient(config, logger, retryStrategy);
const retryHandler = new RetryHandler(retryStrategy, logger);
const cacheManager = new NoOpCache();
const facade = new YandexTrackerFacade(httpClient, retryHandler, cacheManager, logger, config);
const toolRegistry = new ToolRegistry(facade, logger);
```

**После DI (контейнер):**
```typescript
import 'reflect-metadata';
import { createContainer, TYPES } from './infrastructure/di/index.js';

const container = createContainer(config, logger);
const toolRegistry = container.get<ToolRegistry>(TYPES.ToolRegistry);
```

### Использование в тестах

**Подмена зависимости для теста:**
```typescript
const container = createContainer(config, logger);
const mockHttpClient = createMockHttpClient();
container.rebind(TYPES.HttpClient).toConstantValue(mockHttpClient);
const toolRegistry = container.get<ToolRegistry>(TYPES.ToolRegistry);
```

**Преимущества:**
- Легко подменять зависимости через `rebind()`
- Изолированное тестирование компонентов
- Разные конфигурации для разных тестовых сценариев

**Подробнее:** `docs/di-usage-example.md`

---

## 🚀 Batch-операции с задачами

**Паттерн:** Все операции с коллекциями объектов используют batch-подход (массивы параметров).

### Правило

Для операций с задачами используем ТОЛЬКО batch-версии методов:
- `getIssues(keys[])` — получение
- `createIssues(requests[])` — создание
- `updateIssues(items[])` — обновление
- `deleteIssues(keys[])` — удаление

**Почему:**
1. Универсальность — один метод для одной/нескольких задач
2. Параллельные запросы — автоматический throttling
3. Упрощение архитектуры — нет дублирования кода
4. Единообразие — все операции с коллекциями одинаковы

**Подробнее:** см. CLAUDE.md (секция "Batch-операции")

### Параллельное выполнение

**Механизм:** `Promise.allSettled` + `ParallelExecutor` для throttling.

**Два независимых лимита:**
1. **MAX_BATCH_SIZE** (бизнес-лимит): 200 элементов в batch-запросе
2. **MAX_CONCURRENT_REQUESTS** (технический лимит): 5 одновременных HTTP-запросов

**Реализация:** `src/infrastructure/async/parallel-executor.ts`

### Обработка результатов

**Типобезопасность:** Все batch-операции возвращают типизированные результаты с `status: 'fulfilled' | 'rejected'`.

**Пример:**
```typescript
const results = await facade.getIssues(['QUEUE-123', 'INVALID-KEY']);

results.forEach((result) => {
  if (result.status === 'fulfilled') {
    console.log(`Задача ${result.issueKey}:`, result.value);
  } else {
    console.error(`Ошибка ${result.issueKey}:`, result.reason);
  }
});
```

**Преимущества:**
- Частичные ошибки не блокируют выполнение
- Сохранение порядка результатов
- Полная типобезопасность (TypeScript)

---

## 🏗️ Детальное описание компонентов

### 1. HTTP Слой

#### HttpClient
**Файл:** `src/infrastructure/http/client/http-client.ts`

**Ответственность:**
- Конфигурация Axios instance
- Базовые HTTP методы (get, post, patch, delete)
- Добавление заголовков (Authorization, X-Org-ID)
- Логирование запросов/ответов через interceptors

**НЕ отвечает за:** Retry логику, кеширование, бизнес-логику API

#### Retry Strategies
**Паттерн:** Strategy Pattern

**Интерфейс:** `src/infrastructure/http/retry/retry-strategy.interface.ts`
**Реализация:** `src/infrastructure/http/retry/exponential-backoff.strategy.ts`
**Оркестратор:** `src/infrastructure/http/retry/retry-handler.ts`

**Формула задержки:** `delay = baseDelay * 2^attempt` (ограничение: maxDelay)

---

### 2. Кеширование

**Паттерн:** Strategy Pattern + Null Object Pattern

**Интерфейс:** `src/infrastructure/cache/cache-manager.interface.ts`
**Реализации:**
- `no-op-cache.ts` — Null Object (заглушка)

**Генератор ключей:** `src/infrastructure/cache/entity-cache-key.ts`
- Создание ключей вида `<EntityType>:<ID>`
- Извлечение entity key из API пути
- Специфичен для доменных сущностей (Issue, User)

---

### 3. Yandex Tracker API

#### Operations

**Базовый класс:** `src/tracker_api/operations/base-operation.ts`
- Методы `withCache()`, `withRetry()` для композиции инфраструктуры

**Конкретные операции:** см. `src/tracker_api/operations/`
- `user/ping.operation.ts` — проверка подключения
- `issue/get-issues.operation.ts` — batch-получение задач
- `issue/create-issues.operation.ts` — batch-создание задач
- `issue/update-issues.operation.ts` — batch-обновление задач
- `issue/delete-issues.operation.ts` — batch-удаление задач

#### YandexTrackerFacade

**Паттерн:** Facade Pattern
**Файл:** `src/tracker_api/facade/yandex-tracker.facade.ts`

**Ответственность:**
- Инициализация всех операций
- Предоставление удобного API для tools
- Делегирование вызовов конкретным операциям

**НЕ отвечает за:** Бизнес-логику, HTTP запросы

---

### 4. MCP Tools

**Файлы:** `src/mcp/tools/`

**Ответственность:**
- Определение MCP инструмента (name, description, inputSchema)
- Валидация параметров от Claude
- Вызов YandexTrackerFacade
- Форматирование результата для Claude
- Фильтрация полей через `ResponseFieldFilter`

**Базовый класс:** `src/mcp/tools/base-tool.ts`
- Методы валидации: `validateRequired()`, `validateIssueKey()`, etc.

**Конкретные tools:** `ping.tool.ts`, `get-issues.tool.ts`, etc.

**Tool Registry:** `src/mcp/tool-registry.ts`
- Регистрация всех tools
- Маршрутизация вызовов к нужному tool

---

## 🎓 Применяемые паттерны проектирования

- **Strategy Pattern** — RetryStrategy, CacheManager
- **Facade Pattern** — YandexTrackerFacade
- **Registry Pattern** — ToolRegistry
- **Template Method** — BaseTool, BaseOperation
- **Null Object Pattern** — NoOpCache
- **Dependency Injection** — InversifyJS v7 (везде)

---

## 🧪 Тестирование

### Принципы

1. **Изоляция:** Каждый класс тестируется отдельно с моками зависимостей
2. **Покрытие:** Минимум 80% code coverage
3. **Структура:** Тесты зеркалируют структуру `src/`
4. **AAA паттерн:** Arrange → Act → Assert

### Примеры тестов

**Retry стратегия:** `tests/unit/infrastructure/http/retry/exponential-backoff.strategy.test.ts`
**HTTP клиент:** `tests/unit/infrastructure/http/client/http-client.test.ts`
**Операции:** `tests/unit/tracker_api/operations/**/*.test.ts`
**Tools:** `tests/unit/mcp/tools/*.test.ts`

---

## 🚀 Добавление новой функциональности

### Добавление новой операции API

1. Создать файл `src/tracker_api/operations/{feature}/{name}.operation.ts`
2. Наследоваться от `BaseOperation`
3. Реализовать метод `execute(...)`
4. Экспортировать в `operations/{feature}/index.ts`
5. Добавить метод в `YandexTrackerFacade` (`src/tracker_api/facade/`)
6. Зарегистрировать в `src/composition-root/container.ts` (bindOperations)
7. Добавить токен в `src/composition-root/types.ts`
8. Написать тесты в `tests/unit/tracker_api/operations/{feature}/{name}.operation.test.ts`

**Чек-лист:** см. CLAUDE.md (секция "Добавление Operation")

### Добавление нового MCP инструмента

1. Создать файл `src/mcp/tools/{name}.tool.ts`
2. Наследоваться от `BaseTool`
3. Реализовать `getDefinition()` + `execute()`
4. Использовать `ResponseFieldFilter.filter()` перед возвратом
5. Экспортировать в `src/mcp/tools/index.ts`
6. Зарегистрировать в `src/composition-root/container.ts` (bindTools)
7. Добавить токен в `src/composition-root/types.ts`
8. Написать тесты в `tests/unit/mcp/tools/{name}.tool.test.ts`

**Чек-лист:** см. CLAUDE.md (секция "Добавление Tool")

---

## 🔒 Архитектурные правила (dependency-cruiser)

Проект использует `dependency-cruiser` для автоматической валидации архитектурных правил.

### Конфигурация

**Файл:** `.dependency-cruiser.cjs`

### Правила

1. **Layered Architecture**
   - `tracker_api` не импортирует `mcp`
   - `infrastructure` не импортирует бизнес-слои (`tracker_api`, `mcp`, `composition-root`)

2. **MCP Isolation**
   - MCP tools используют только `Facade`, не `Operations` напрямую
   - Разрешены импорты `entities` и `dto` для типов

3. **Operations Isolation**
   - Operations импортируются только:
     - Через `YandexTrackerFacade`
     - В `composition-root/container.ts` (DI регистрация)
     - Внутри `operations/` (между собой)

4. **Composition Root Top-Level**
   - `composition-root` импортируется только в `src/index.ts`
   - Файлы внутри `composition-root` могут импортировать друг друга

5. **Циклические зависимости**
   - Запрещены (severity: warn)

### Использование

```bash
# Проверка правил
npm run depcruise

# Генерация графа зависимостей (SVG)
npm run depcruise:graph

# Генерация графа зависимостей (HTML)
npm run depcruise:graph:html
```

**Интеграция в CI:** правила проверяются в `npm run validate`

---

## 📚 Дополнительные ресурсы

- **[CLAUDE.md](./CLAUDE.md)** — Критические правила и чек-листы для ИИ агентов
- **[README.md](./README.md)** — Общая документация проекта
- **[docs/di-usage-example.md](./docs/di-usage-example.md)** — Примеры использования DI в тестах
