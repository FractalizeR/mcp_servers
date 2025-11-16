# CLAUDE.md — Yandex Tracker MCP Server

**MCP сервер для интеграции с API Яндекс.Трекера v3**

---

## ⚡ ВАЖНО

**Перед работой с Yandex Tracker пакетом:**
1. 📖 **[Корневой CLAUDE.md](../../CLAUDE.md)** — общие правила monorepo
2. 📖 **Этот файл** — специфика Yandex Tracker
3. 📖 **[README.md](./README.md)** — описание пакета

---

## 📚 STACK

- **TypeScript** (strict mode, NO `any`/`unknown`/`null`/`undefined` где можно избежать)
- **InversifyJS v7** (DI, Symbol-based tokens, `defaultScope: 'Singleton'`)
- **Zod** (валидация параметров, type inference)
- **Axios** (HTTP client, через @mcp-framework/infrastructure)
- **Pino** + **rotating-file-stream** (production logging с автоматической ротацией)
- **Vitest** (тесты, покрытие ≥80%)
- **dependency-cruiser** (валидация архитектурных правил)
- **MCP SDK** (Model Context Protocol)
- **Tool Search System** (из @mcp-framework/search)
- **API:** Яндекс.Трекер v3 (ТОЛЬКО `/v3/*` endpoints)

---

## 🚨 КРИТИЧЕСКИЕ ПРАВИЛА

### 1. Импорты в monorepo

**✅ Используй npm package names для framework:**
```typescript
import { BaseTool } from '@mcp-framework/core';
import { HttpClient } from '@mcp-framework/infrastructure';
import { ToolSearchEngine } from '@mcp-framework/search';
```

**✅ Внутренние импорты (внутри yandex-tracker):**
```typescript
// Относительные пути для близких файлов
import { YandexTrackerFacade } from './facade/index.js';

// Или через пути в tsconfig (если настроены)
import { GetIssuesOperation } from '../../api_operations/issue/get/index.js';
```

**❌ НЕ импортируй framework через относительные пути:**
```typescript
import { BaseTool } from '../../../core/src/tools/base/base-tool.js'; // WRONG!
```

### 2. API Яндекс.Трекер

- ✅ ТОЛЬКО v3: `/v3/issues`, `/v3/myself`
- ✅ Batch-операции: `getIssues([keys])`, НЕ `getIssue(key)`
- ✅ Справка: `yandex_tracker_client/` (Python SDK)
- ✅ Batch-результаты: используй типы `BatchResult<T>`, `FulfilledResult<T>`, `RejectedResult`

### 3. Фильтрация полей (Response Field Filter)

- ВСЕГДА фильтруй перед возвратом: `ResponseFieldFilter.filter(data, fields)`
- Tool params: `fields?: string[]`, экономия 80-90% размера ответа
- **Детали:** [src/mcp/tools/common/README.md](src/mcp/tools/common/README.md)

### 4. Валидация параметров (Zod)

- ✅ ВСЕГДА используй Zod для валидации параметров tools, НЕ кастомные валидаторы
- ✅ Переиспользуй схемы из `src/mcp/tools/common/schemas/`
- ✅ Type inference: `type Params = z.infer<typeof ParamsSchema>`
- **Примеры:** любой `*.tool.ts` файл

### 5. Статические метаданные для Tool Search

- ✅ ОБЯЗАТЕЛЬНО добавляй `static readonly METADATA: StaticToolMetadata` во все tools
- ✅ Используется для compile-time индексирования (@mcp-framework/search)
- ✅ Позволяет SearchToolsTool находить tools без загрузки всего кода
- ⚠️ При добавлении нового tool — запусти `npm run build` (автоматически обновит индекс)

### 6. Логирование (Pino)

- ✅ Используй **Pino** с structured logging, НЕ `console.log`
- ✅ Dual output: error/warn → stderr + файл, info/debug → файл
- ✅ Автоматическая ротация логов (`.gz` архивы)
- ⚠️ MCP stdio: stdout для JSON-RPC, stderr для логов

### 7. Тестирование

- Unit тесты: `tests/` (зеркалируют `src/`), покрытие ≥80%
- Vitest с ESM и TypeScript, импорты с `.js` расширениями
- **Баг + тест:** При исправлении бага обязательно добавь тест
- **Детали:** [tests/README.md](tests/README.md)

### 8. Dependency Injection (InversifyJS)

- Symbol-based tokens (`TYPES.*`), НЕ bind по классу
- `toDynamicValue()`, НЕ декораторы `@injectable()`
- `defaultScope: 'Singleton'` (убирает `.inSingletonScope()`)
- **Детали:** [src/composition-root/README.md](src/composition-root/README.md)

### 9. Single Responsibility Principle (SRP)

- Один класс = один файл = одна ответственность
- Tool: `src/mcp/tools/{api|helpers}/{feature}/{action}/{name}.tool.ts`
- Operation: `src/api_operations/{feature}/{action}/{name}.operation.ts`
- ❌ НЕ объединяй логику разных операций в один файл

### 10. Автоматическая проверка регистрации

- `npm run validate:tools` проверяет регистрацию всех `*.tool.ts` и `*.operation.ts`
- Предотвращает забывчивость при добавлении компонентов
- Автоматически запускается в `npm run validate`

### 11. Инструменты качества кода

**Мёртвый код и зависимости (Knip):**
- `npm run knip` — поиск неиспользуемых файлов, exports, npm-пакетов
- Конфигурация: `knip.json`, автоматически запускается в `npm run validate`

**Безопасность зависимостей (Socket.dev):**
- `npm run audit:socket` — анализ supply-chain атак, вредоносных пакетов
- Автоматически в `npm run validate`, severity: high

**Поиск секретов (Gitleaks):**
- `npm run audit:secrets` — сканирование токенов, паролей в коде
- Конфигурация: `.gitleaks.toml`
- **Pre-commit hook:** автоматически проверяет staged файлы

**Lockfile синхронизация:**
- `npm run audit:lockfile` — проверка актуальности package-lock.json
- Автоматически в `npm run validate`

**Code complexity:**
- ESLint правила: `max-params` (≤4), `complexity` (≤10), `max-depth` (≤4)
- Режим `warn` — не блокирует build, но предупреждает

---

## 📖 КОНВЕНЦИИ ПО КОМПОНЕНТАМ

**ОБЯЗАТЕЛЬНО прочитай перед работой с компонентом:**

- **MCP Tools** — [src/mcp/README.md](src/mcp/README.md)
- **API Operations** — [src/api_operations/README.md](src/api_operations/README.md)
- **Entities** — [src/entities/README.md](src/entities/README.md)
- **DTO** — [src/dto/README.md](src/dto/README.md)
- **Dependency Injection** — [src/composition-root/README.md](src/composition-root/README.md)
- **Тестирование** — [tests/README.md](tests/README.md)

---

## 📋 КРАТКИЕ ЧЕК-ЛИСТЫ

**⚠️ Подробные чек-листы — в README.md файлах модулей выше**

### Добавление MCP Tool

- [ ] 📖 Прочитай [src/mcp/README.md](src/mcp/README.md)
- [ ] Создай структуру: `{feature}/{action}/{name}.schema.ts`, `.definition.ts`, `.tool.ts`, `index.ts`
- [ ] Добавь `static readonly METADATA`:
  - [ ] ⚠️ Если tool ИЗМЕНЯЕТ данные → `requiresExplicitUserConsent: true`
  - [ ] ✅ Если tool только ЧИТАЕТ → НЕ добавляй флаг (или `false`)
- [ ] В `Definition.build()`:
  - [ ] Реализуй `getStaticMetadata()` → возврат `ToolClass.METADATA`
  - [ ] Оберни description: `this.wrapWithSafetyWarning(this.buildDescription())`
- [ ] Используй утилиты: `validateParams()`, `BatchResultProcessor`, `ResultLogger`
- [ ] **АВТОМАТИЧЕСКАЯ РЕГИСТРАЦИЯ:** Добавь **1 строку** в `src/composition-root/definitions/tool-definitions.ts`
- [ ] Тесты + `npm run validate` (автоматически проверит флаг)

### Добавление Operation

- [ ] 📖 Прочитай [src/api_operations/README.md](src/api_operations/README.md)
- [ ] Наследуй `BaseOperation`
- [ ] Для batch: используй `ParallelExecutor`, возвращай `BatchResult<T>`
- [ ] **АВТОМАТИЧЕСКАЯ РЕГИСТРАЦИЯ:** Добавь **1 строку** в `src/composition-root/definitions/operation-definitions.ts`
- [ ] Facade метод + тесты
- [ ] `npm run validate`

### Добавление Entity

- [ ] 📖 Прочитай [src/entities/README.md](src/entities/README.md)
- [ ] Создай интерфейс (только known поля)
- [ ] Создай `{Name}WithUnknownFields = WithUnknownFields<{Name}>`
- [ ] Экспорт в `index.ts`

### Добавление DTO

- [ ] 📖 Прочитай [src/dto/README.md](src/dto/README.md)
- [ ] Создай Input DTO (с `[key: string]: unknown` если нужно)
- [ ] Для update — все поля опциональны
- [ ] Экспорт в `index.ts`

### Перед коммитом

- [ ] `npm run validate` — без ошибок (если только документация, можно не запускать)
- [ ] Все TODO в коде закрыты
- [ ] CLAUDE.md и ARCHITECTURE.md актуальны (если изменили)
- [ ] ⚠️ НЕ форматируй код вручную — pre-commit hook сделает автоматически

---

## 📁 СТРУКТУРА ПАКЕТА

```
packages/yandex-tracker/
├── src/
│   ├── composition-root/    # DI контейнер (см. README.md)
│   ├── api_operations/      # Operations, Facade
│   ├── entities/            # Domain entities
│   ├── dto/                 # Data Transfer Objects
│   ├── mcp/                 # Tools, Utils
│   ├── constants.ts         # App constants
│   └── index.ts             # Entry point
├── tests/                   # Зеркалирует src/
├── scripts/                 # Валидация, smoke test
├── CLAUDE.md                # Этот файл
└── README.md                # Описание пакета
```

**Подробно:** корневой [ARCHITECTURE.md](../../ARCHITECTURE.md)

---

## 🔗 ДОПОЛНИТЕЛЬНО

- **Архитектура monorepo:** [../../ARCHITECTURE.md](../../ARCHITECTURE.md)
- **Migration guide v1 → v2:** [../../MIGRATION.md](../../MIGRATION.md)
- **Корневой CLAUDE.md:** [../../CLAUDE.md](../../CLAUDE.md)
- **API справка:** `../../yandex_tracker_client/` (Python SDK)
