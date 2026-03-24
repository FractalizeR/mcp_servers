# CLAUDE.md — Руководство для ИИ агентов (Monorepo)

**MCP Framework & Yandex Tracker Server**

---

## 🎯 МЕТА: Правила ведения документации

**Cohesion/Coupling:** Документация рядом с кодом, который она описывает.

### Лимиты размера

**Жёсткие лимиты (MUST):**
- `CLAUDE.md` ≤ 400 строк
- `ARCHITECTURE.md` ≤ 700 строк
- Module `README.md` ≤ 600 строк
- Package `README.md` ≤ 600 строк
- `tests/README.md` ≤ 500 строк

**Целевые значения (SHOULD):**
- `CLAUDE.md` ~350 строк
- `ARCHITECTURE.md` ~600 строк
- Module `README.md` ~500 строк
- Package `README.md` ~500 строк
- `tests/README.md` ~400 строк

**Исключение:** Превышение на 10% допустимо с `<!-- LIMIT_EXCEPTION: причина -->`
**Проверка:** `npm run validate:docs`

### Правила сокращения (по приоритету)

**Приоритет 1 (удаляем первым):**
- Примеры кода >10 строк → заменить ссылкой на файл
- Дублирование информации → оставить в одном месте
- Декоративные элементы (ASCII art, таблицы сравнений)

**Приоритет 2 (сокращаем):**
- Объяснения "почему" → кратко или ссылка на ARCHITECTURE.md
- Пошаговые инструкции → заменить чек-листом
- Множественные примеры → оставить 1-2 лучших

**НЕ удаляем:**
- Критические правила и требования
- Чек-листы (компактны и полезны)
- Ссылки на файлы и документацию
- Краткие примеры ≤5 строк для ясности

### Проверка лимитов

**Перед коммитом документации:**
```bash
npm run validate:docs
```

**Если превышен лимит:**
1. Применить правила сокращения (см. выше)
2. Повторить проверку
3. Коммитить только после успешной валидации

**Интеграция в workflow:**
- `npm run validate` — включает `validate:docs` автоматически
- `npm run validate:quiet` — включает `validate:docs` (для ИИ агентов)

### Контекстное размещение

- `{module}/README.md` — документация модуля (НЕ `CONVENTIONS.md`)
- ❌ НЕ создавать централизованную `docs/` для модульной документации

### Когда обновлять

**Обновляй `README.md` после:**
- Добавления модуля/компонента, изменения архитектуры/API
- Добавления правил/ограничений

**НЕ обновляй при:**
- Рефакторинге без изменения API, исправлении багов, обновлении комментариев

---

## ⚡ ОБЯЗАТЕЛЬНО ПРОЧИТАЙ

**Перед началом работы:**
1. 📖 **Этот файл** (CLAUDE.md) — правила monorepo
2. 📖 **[ARCHITECTURE.md](./ARCHITECTURE.md)** — понимание архитектуры monorepo
3. 📖 **@DOCS.md** — навигация по всей документации проекта

---

## 📦 Структура monorepo

```
packages/
├── framework/
│   ├── infrastructure/     → @fractalizer/mcp-infrastructure
│   │   └── HTTP, cache, logging, async utilities
│   ├── cli/               → @fractalizer/mcp-cli
│   │   └── Generic CLI для MCP подключений
│   ├── core/              → @fractalizer/mcp-core
│   │   └── BaseTool, registry, type system
│   └── search/            → @fractalizer/mcp-search
│       └── Tool Search Engine (compile-time indexing)
└── servers/
    └── yandex-tracker/    → mcp-server-yandex-tracker
        └── Yandex API, tools, operations, DI
```

**Детали:**
- **Infrastructure** — [packages/framework/infrastructure/README.md](packages/framework/infrastructure/README.md)
- **CLI** — [packages/framework/cli/README.md](packages/framework/cli/README.md)
- **Core** — [packages/framework/core/README.md](packages/framework/core/README.md)
- **Search** — [packages/framework/search/README.md](packages/framework/search/README.md)
- **Yandex Tracker** — [packages/servers/yandex-tracker/README.md](packages/servers/yandex-tracker/README.md)

---

## 🚨 КРИТИЧЕСКИЕ ПРАВИЛА MONOREPO

### 1. Граф зависимостей (НЕ НАРУШАТЬ!)

```
infrastructure (база для всех, 0 зависимостей)
    ↓
cli (зависит от infrastructure)
    ↓
core (зависит от infrastructure)
    ↓
search (зависит от core)
    ↓
yandex-tracker (зависит от всех framework пакетов)
```

**Правила:**
- ❌ **НЕЛЬЗЯ** обратные зависимости (core → infrastructure)
- ❌ **НЕЛЬЗЯ** импорты вверх по графу
- ❌ **НЕЛЬЗЯ** импорты из yandex-tracker в framework пакеты
- ✅ **МОЖНО** добавлять зависимости вниз по графу

**Проверка:** `npm run depcruise` (в корне) валидирует граф

### 2. Импорты между пакетами

**✅ Используй npm package names:**
```typescript
import { BaseTool } from '@fractalizer/mcp-core';
import { HttpClient } from '@fractalizer/mcp-infrastructure';
import { ToolSearchEngine } from '@fractalizer/mcp-search';
```

**❌ НЕ используй:**
```typescript
import { BaseTool } from '../../../core/src/tools/base/base-tool.js'; // WRONG!
import { BaseTool } from '@core/tools/base/base-tool.js';              // WRONG!
```

### 3. Внутрипакетные импорты (Node.js Subpath Imports)

**Короткие (≤2 уровня) - относительные:**
```typescript
import { validateInput } from './utils.js';
```

**Глубокие (≥3 уровня) - # префиксы:**
```typescript
import { MCP_TOOL_PREFIX } from '#constants';
import { YandexTrackerFacade } from '#tracker_api/facade/yandex-tracker.facade.js';
```

**Доступные # префиксы:** `#tracker_api/*`, `#tools/*`, `#composition-root/*`, `#cli/*`, `#constants`, `#common/*`, `#integration/*`, `#helpers/*`

**❌ НЕ используй @ алиасы:**
```typescript
import { Foo } from '@tracker_api/foo.js'; // WRONG! Use #tracker_api
```

**Подробности:** [ARCHITECTURE.md](./ARCHITECTURE.md) секция "Module System"

### 4. Типобезопасность

- ❌ `any` / `unknown` / `null` / `undefined` (где можно избежать)
- ✅ Явные типы для всех публичных функций и параметров
- ✅ `import type` для type-only импортов
- ✅ Strict mode во всех пакетах

### 5. Автогенерация MCP Definition из Schema

**Zod schema = единственный источник истины. Используй `generateDefinitionFromSchema(metadata, schema)` вместо отдельных `*.definition.ts` файлов (устарело).** Детали: [ARCHITECTURE.md](./ARCHITECTURE.md#schema-to-definition-generator)

### 6. Single Responsibility Principle (SRP)
- Один класс = один файл = одна ответственность
- Каждый пакет имеет чёткую границу ответственности (см. README.md пакетов)
- Не смешивай логику разных слоёв в одном файле

### 7. Консистентность npm скриптов

**Все workspaces ОБЯЗАНЫ иметь одинаковый набор базовых команд:**
- `build` — `tsc -b && tsc-alias` (НЕ `tsc` без `-b`!)
- `clean` — `rimraf dist` (только артефакты сборки)
- `lint` — `eslint src --ext .ts`
- `lint:fix` — `eslint src --ext .ts --fix`
- `lint:quiet` — `eslint src --ext .ts --quiet`
- `format` — `prettier --write "src/**/*.ts" "tests/**/*.ts"`
- `format:check` — `prettier --check "src/**/*.ts" "tests/**/*.ts"`
- `test` — `vitest run`
- `test:coverage` — `vitest run --coverage`
- `test:quiet` — `vitest run --reporter=dot --silent`
- `test:verbose` — `vitest run --reporter=verbose`
- `test:watch` — `vitest watch`
- `typecheck` — `tsc --noEmit`
- `validate` — `npm run lint && npm run typecheck && npm run test`
- `validate:quiet` — `npm run lint:quiet && npm run typecheck && npm run test:quiet`

**Корневой package.json:**
- Делегирует команды через `--workspaces --if-present`
- `clean` — только артефакты, `clean:all` — включая node_modules
- `validate` — lint + typecheck + test + test:smoke + cpd
- `validate:quiet` — lint:quiet + typecheck + test:quiet + cpd:quiet

**Примечание:** yandex-tracker добавляет `test:smoke` в свой `validate`

**Режимы вывода (для экономии токенов ИИ):**
- **Обычный** (`test`, `lint`) — для разработчиков, подробный вывод
- **Quiet** (`test:quiet`, `lint:quiet`) — для ИИ агентов, только ошибки
- **Verbose** (`test:verbose`) — для отладки, максимум деталей

**ВАЖНО для ИИ агентов:** Используй `npm run validate:quiet` вместо `validate`

### 8. Защищённые директории (НЕ ТРОГАТЬ!)

- **`yandex_tracker_client/`** — Git submodule, референсная имплементация API Яндекс.Трекера
  - ❌ **НЕЛЬЗЯ** удалять, модифицировать, перемещать
  - ❌ **НЕЛЬЗЯ** добавлять файлы внутрь
  - ✅ **МОЖНО** только читать для справки при разработке API
  - Если submodule не инициализирован: `git submodule update --init`

---

## 📋 Процесс работы с большими задачами

**Критерии "большой задачи":**
- Требует >3 отдельных этапов выполнения
- Или ожидаемое время >3 часов

**Обязательное планирование:**

1. **Согласуй общий план** с пользователем (краткий список этапов)
2. Если задача связана с API Яндекс Трекера, всегда проверяй валидность плана по официальному клиенту в папке yandex_tracker_client
3. **Создай детальный план** в папке `.agentic-planning/plan_{краткое_описание_большой задачи}/`
    - Структура файлов в этой папке: `1.1_{stage_title}{execution_type}.md`, где execution_type - либо sequential (надо
      выполнить последовательно) или parallel (можно выполнять несколькими разными ИИ агентами в разных ветках
      параллельно)
   - Формат: Markdown с чек-листами и подробным описанием шагов
   - Старайся планировать шаги так, чтобы их могли параллельно исполнять несколько разных ИИ агентов в разных ветках
   - Группируй действия, которые мешают такой параллельности в начале плана (sequential)
   - В плане не должно быть примеров кода. Только инструкции по архитектуре.
4. **Согласуй детальный план** с пользователем, внеси правки
5. **После каждого этапа ОБЯЗАТЕЛЬНО:**
   1. Провалидировать: `npm run validate`, исправить ошибки
   2. Отметить прогресс в файлах плана
   3. Если финальная валидация показывает, что весь план успешно выполнен, после завершения последнего шага план надо удалить.
   4. Коммит с описанием этапа на русском языке (если ветка `main` или `master` - спроси разрешение)
   5. Пуш в репозиторий
   6. Предложить пользователю продолжить в новой сессии для экономии токенов, дать короткий промпт с указанием названия плана и шага плана для этого. Коротко описать, какие шаги можно дальше выполнять параллельно или только последовательно.

---

## 🚀 Turborepo

Проект использует **Turborepo** — автоматический порядок задач, кэширование, параллелизация.

**Конфигурация:** `turbo.json`, кэш в `.turbo/`

**Полезные команды:**
- `turbo run build --filter=@fractalizer/mcp-server-yandex-tracker` — только пакет и зависимости
- `turbo run build --graph` — показать граф
- `turbo run build --force` — без кэша

---

## 🛠️ Команды (Workspace)

**Корень monorepo:**
```bash
# Установка всех зависимостей
npm install

# Сборка всех пакетов (Turborepo гарантирует порядок)
npm run build

# Тесты всех пакетов
npm run test

# Валидация всего monorepo
npm run validate

# Валидация (quiet для ИИ агентов - экономия токенов)
npm run validate:quiet

# Очистка всех пакетов
npm run clean
```

**Работа с отдельным пакетом:**
```bash
# Через Turborepo (рекомендуется)
turbo run build --filter=@fractalizer/mcp-core
turbo run test --filter=@fractalizer/mcp-server-yandex-tracker

# Из директории пакета (работает как раньше)
cd packages/servers/yandex-tracker
npm test
npm run test:quiet  # для ИИ агентов
```

**ВАЖНО:** Команды `npm run` теперь используют Turborepo автоматически!

---

## 📊 Инструменты качества кода

**Метрики сложности (ESLint, framework / server):**
- `complexity: 10 / 15` — цикломатическая сложность
- `sonarjs/cognitive-complexity: 15` — когнитивная сложность (важнее!)
- `max-depth: 4 / 5` — глубина вложенности
- `max-lines: 400` — строк в файле
- `max-lines-per-function: 50 / 75` — строк в функции
- `max-params: 4 / 5` — параметров функции

**Проверки:**
```bash
# Полная валидация (lint + typecheck + tests + cpd)
npm run validate

# Качество кода (cpd + depcruise + knip)
npm run quality

# Дублирование кода (jscpd, порог 5%)
npm run cpd

# HTML отчет по дублированию
npm run cpd:report
```

**Пороги тестового покрытия (vitest):**
- Lines: 80%, Functions: 80%, Branches: 75%, Statements: 80%

**Уровни правил:**
- `error` — блокирует коммит/CI
- `warn` — показывает предупреждение, но не блокирует

---

## 📖 Работа с конкретными компонентами

**Framework пакеты (infrastructure, core, search):**
- Универсальные, переиспользуемые компоненты
- НЕ должны зависеть от доменной логики (Yandex Tracker)
- См. README.md в каждом пакете для API и примеров

**Yandex Tracker (packages/servers/yandex-tracker):**
- Доменная логика Яндекс.Трекера
- MCP tools, API operations, entities, DTO
- **ОБЯЗАТЕЛЬНО прочитай:** [packages/servers/yandex-tracker/CLAUDE.md](packages/servers/yandex-tracker/CLAUDE.md)

---

## 📋 Автоматический коммит

**Коммить автоматически ТОЛЬКО если:**
1. ✅ Задача завершена (все TODO выполнены)
2. ✅ `npm run validate` успешна (если применимо)
3. ✅ Нет вопросов к пользователю

**Формат:**
```
<тип>: описание

Детали:
- Что/почему/преимущества

🤖 Generated with Claude Code
Co-Authored-By: Claude <noreply@anthropic.com>
```

**Лимиты:** body ≤100 символов на строку, заголовок ≤72 символа

---

## 🔗 ДОПОЛНИТЕЛЬНО

- **Чеклист разработки MCP сервера:** [MCP_SERVER_CHECKLIST.md](./MCP_SERVER_CHECKLIST.md)
- **Архитектура monorepo:** [ARCHITECTURE.md](./ARCHITECTURE.md)
- **Framework packages:**
  - [Infrastructure API](packages/framework/infrastructure/README.md)
  - [CLI Framework](packages/framework/cli/README.md)
  - [Core API](packages/framework/core/README.md)
  - [Search System](packages/framework/search/README.md)
- **Yandex Tracker:**
  - [Yandex Tracker CLAUDE.md](packages/servers/yandex-tracker/CLAUDE.md)
  - [Yandex Tracker README.md](packages/servers/yandex-tracker/README.md)
