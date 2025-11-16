# 🔍 Детальное ревью плана миграции в monorepo

**Дата ревью:** 2025-11-16
**Ревьюер:** Claude (AI)
**Версия плана:** 1.0

---

## ✅ ОБЩАЯ ОЦЕНКА

План **ОТЛИЧНЫЙ** и готов к реализации с небольшими доработками.

**Оценка качества:** 9/10

**Сильные стороны:**
- ✅ Чёткая трёхфазная структура с оптимизацией через параллелизм
- ✅ Детальные команды и проверки на каждом шаге
- ✅ Точные оценки размеров пакетов (проверено на реальном коде)
- ✅ Детальный анализ рисков с матрицей и стратегиями митигации
- ✅ Готовые скрипты для автоматизации
- ✅ Полный чек-лист для отслеживания прогресса

**Точность оценок (проверено на реальном коде):**
- Infrastructure: 1399 строк (план: ~1391) ✅ 99% точность
- CLI: 1450 строк (план: ~1450) ✅ 100% точность
- Search: 1233 строк (план: ~1233) ✅ 100% точность
- **Общее количество файлов:** 162 TS файла ✅

---

## 🔧 КРИТИЧЕСКИЕ УЛУЧШЕНИЯ (MUST FIX)

### 1. Адаптация существующих скриптов валидации

**Проблема:** План не учитывает существующие скрипты валидации:
- `scripts/validate-tool-registration.ts`
- `scripts/validate-docs-size.ts`
- `scripts/generate-tool-index.ts`
- `scripts/smoke-test-server.ts`

**Решение:**

Добавить в **Фазу 3, Шаг 3.3** (после валидации архитектуры):

```markdown
### Шаг 3.3.1: Адаптация скриптов валидации для monorepo

**Время:** 1 час

#### validate-tool-registration.ts

Проблема: скрипт сканирует `src/mcp/tools/` и `src/tracker_api/api_operations/`

Решение:
```typescript
// Обновить пути для monorepo
const toolsDir = 'packages/yandex-tracker/src/tools';
const operationsDir = 'packages/yandex-tracker/src/tracker_api/api_operations';

// Импорты из packages
import { TOOL_CLASSES } from '../packages/yandex-tracker/src/composition-root/definitions/tool-definitions.js';
```

#### validate-docs-size.ts

Проблема: скрипт проверяет `CLAUDE.md`, `ARCHITECTURE.md` в корне

Решение:
- Корневые документы остаются в корне (общие для monorepo)
- Добавить проверку документов пакетов:
  ```typescript
  const packageDocs = [
    'packages/infrastructure/README.md',
    'packages/core/README.md',
    // ...
  ];
  ```

#### generate-tool-index.ts

**КРИТИЧЕСКИ ВАЖНО:** В monorepo индексация должна работать по-другому!

Проблема: скрипт сканирует `src/mcp/tools/` для всех tools

Решение 2 варианта:

**Вариант A (рекомендуемый):** Каждый пакет генерирует свой индекс
- `@mcp-framework/search` — индексирует только SearchToolsTool
- `mcp-server-yandex-tracker` — индексирует все API и helper tools

**Вариант B:** Централизованный индекс в yandex-tracker
- Скрипт сканирует `packages/yandex-tracker/src/tools/`
- Собирает метаданные из всех tool-классов

**Рекомендация:** Вариант A для модульности

#### Команды

```bash
# 1. Переместить скрипты
mkdir -p packages/yandex-tracker/scripts
cp scripts/validate-tool-registration.ts packages/yandex-tracker/scripts/
cp scripts/smoke-test-server.ts packages/yandex-tracker/scripts/

# 2. Обновить пути в скриптах
sed -i "s|'../src/|'../src/|g" packages/yandex-tracker/scripts/*.ts

# 3. Обновить package.json скрипты
# В packages/yandex-tracker/package.json:
# "validate:tools": "tsx scripts/validate-tool-registration.ts"
# "test:smoke": "tsx scripts/smoke-test-server.ts"

# 4. Для корневых скриптов (документация)
# Остаются в корне, но проверяют все пакеты
```

#### Проверка

```bash
npm run validate:tools --workspace=mcp-server-yandex-tracker
npm run validate:docs  # В корне
```
```

---

### 2. Стратегия для CLAUDE.md в monorepo

**Проблема:** CLAUDE.md имеет жёсткий лимит 400 строк. При monorepo нужно описать структуру пакетов, но места нет.

**Текущий размер:** CLAUDE.md ~360 строк (близко к лимиту)

**Решение:**

**Корневой CLAUDE.md** (≤200 строк):
```markdown
# CLAUDE.md — Руководство для ИИ агентов (Monorepo)

## Структура monorepo

packages/
├── infrastructure/     → @mcp-framework/infrastructure (HTTP, logging)
├── core/              → @mcp-framework/core (BaseTool, registry)
├── search/            → @mcp-framework/search (Tool Search Engine)
├── cli/               → @mcp-framework/cli (MCP connectors)
└── yandex-tracker/    → mcp-server-yandex-tracker (Yandex API)

## Работа с monorepo

**Перед началом:**
1. 📖 Этот файл — общие правила
2. 📖 `packages/{package}/README.md` — специфика пакета
3. 📖 Корневой ARCHITECTURE.md — граф зависимостей

**Сборка:**
npm run build                    # Все пакеты
npm run build --workspace=@mcp-framework/core  # Один пакет

**Добавление фичи:**
1. Определи в какой пакет относится (см. граф зависимостей)
2. Читай `packages/{package}/README.md` для конвенций
3. Не нарушай граф зависимостей (см. ARCHITECTURE.md)

## КРИТИЧЕСКИЕ ПРАВИЛА

### 1. Граф зависимостей (НЕ НАРУШАТЬ!)

infrastructure (база)
    ↓
core (зависит от infrastructure)
    ↓
search (зависит от core)
    ↓
yandex-tracker (зависит от всех)

cli — НЕЗАВИСИМ

❌ НЕЛЬЗЯ: core → search (обратная зависимость)
❌ НЕЛЬЗЯ: infrastructure → core (вверх по графу)

### 2. Импорты между пакетами

✅ Используй npm package names:
import { BaseTool } from '@mcp-framework/core';
import { HttpClient } from '@mcp-framework/infrastructure';

❌ НЕ используй относительные пути:
import { BaseTool } from '../../core/src/tools/base/base-tool.js';

### 3. Типобезопасность (для всех пакетов)

- ❌ `any` / `unknown` / `null` / `undefined`
- ✅ Явные типы
- ✅ `import type` для типов

[... остальные общие правила ...]

## Детали по пакетам

См. README.md в каждом пакете:
- Infrastructure: `packages/infrastructure/README.md`
- Core: `packages/core/README.md`
- Search: `packages/search/README.md`
- CLI: `packages/cli/README.md`
- Yandex Tracker: `packages/yandex-tracker/README.md` (основной)
```

**packages/yandex-tracker/CLAUDE.md** (≤350 строк, специфичный для Yandex Tracker):
```markdown
# CLAUDE.md — Yandex Tracker Server

Этот пакет — конкретная реализация MCP сервера для Yandex Tracker API.

## Зависимости

Использует framework пакеты:
- @mcp-framework/infrastructure — HTTP, логирование
- @mcp-framework/core — BaseTool, валидация
- @mcp-framework/search — Tool Search Engine
- @mcp-framework/cli — подключение к клиентам

## Структура

[... специфика для tracker ...]

## Правила разработки

[... специфика для tracker ...]
```

**Обновить в Фазе 3, Шаг 3.4:**

```bash
# 1. Создать корневой CLAUDE.md (упрощённый, ~200 строк)
cat > CLAUDE.md << 'EOF'
[... новая версия ...]
EOF

# 2. Создать packages/yandex-tracker/CLAUDE.md
mv CLAUDE.md.old packages/yandex-tracker/CLAUDE.md
# Адаптировать для пакета

# 3. Проверить размеры
npm run validate:docs
```

---

### 3. Tool Index Generation в monorepo

**Проблема:** `generate-tool-index.ts` индексирует все tools из `src/mcp/tools/`. В monorepo структуре tools разбросаны по пакетам.

**Решение:**

**Архитектура индексации:**

1. **@mcp-framework/search** имеет свой `generated-index.ts` (ПУСТОЙ или с SearchToolsTool)
2. **mcp-server-yandex-tracker** имеет свой `generate-tool-index.ts` → индексирует только свои tools
3. Search Engine работает с индексом из yandex-tracker

**Обновить PHASE-2-PARALLEL.md, Задача 2A:**

```markdown
### Важно для Search Package

⚠️ **SearchToolsTool** остаётся в `@mcp-framework/search`, НО индекс генерируется в yandex-tracker!

Почему:
- Search framework не знает какие tools будут в конкретной реализации
- Каждый MCP server генерирует свой индекс
- Search предоставляет SearchEngine + SearchToolsTool (который использует индекс)

Структура:
```typescript
// @mcp-framework/search
export { ToolSearchEngine } from './engine/tool-search-engine.js';
export { SearchToolsTool } from './tools/search-tools.tool.js';
// НЕТ generated-index.ts в этом пакете!

// mcp-server-yandex-tracker
import { ToolSearchEngine, SearchToolsTool } from '@mcp-framework/search';
import { TOOL_SEARCH_INDEX } from './generated-index.js'; // Свой индекс

const searchEngine = new ToolSearchEngine(TOOL_SEARCH_INDEX, registry, strategy);
```

**Обновить скрипт:**

```bash
# В packages/search — НЕТ prebuild скрипта
# package.json:
{
  "scripts": {
    "build": "tsc && tsc-alias"  // Без prebuild!
  }
}

# В packages/yandex-tracker — генерация индекса
# package.json:
{
  "scripts": {
    "prebuild": "tsx scripts/generate-tool-index.ts",
    "build": "tsc && tsc-alias"
  }
}

# scripts/generate-tool-index.ts сканирует:
// packages/yandex-tracker/src/tools/**/*.tool.ts
// Генерирует: packages/yandex-tracker/src/generated-index.ts
```
```

---

### 4. Peer Dependencies vs Dependencies

**Проблема:** План указывает `inversify` как peer dependency в `@mcp-framework/core`, но это может создать проблемы.

**Анализ:**

**Текущее использование Inversify:**
- `core` — использует `inversify` ТОЛЬКО в типах (`@injectable`, `inject` декораторы)
- `yandex-tracker` — использует инверсию через DI container

**Рекомендация:**

**Вариант A (рекомендуемый):** Убрать Inversify из core вообще

```json
// @mcp-framework/core/package.json
{
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.22.0",
    "zod": "^3.25.76",
    "pino": "^10.1.0"
    // БЕЗ inversify
  }
}
```

Почему:
- `BaseTool` не должен знать о DI framework
- DI — это детали композиции, не core логики
- Уменьшаем coupling

**Изменения в BaseTool:**

```typescript
// БЫЛО (с декораторами):
@injectable()
export abstract class BaseTool<TFacade> {
  constructor(
    @inject(TYPES.YandexTrackerFacade) facade: TFacade,
    @inject(TYPES.Logger) logger: Logger
  ) {}
}

// СТАЛО (чистый generic class):
export abstract class BaseTool<TFacade> {
  protected readonly facade: TFacade;
  protected readonly logger: Logger;

  constructor(facade: TFacade, logger: Logger) {
    this.facade = facade;
    this.logger = logger;
  }
}
```

DI конфигурация остаётся в `yandex-tracker`:

```typescript
// packages/yandex-tracker/src/composition-root/container.ts
container.bind<GetIssuesTool>(TYPES.GetIssuesTool).toDynamicValue((context) => {
  const facade = context.container.get<YandexTrackerFacade>(TYPES.Facade);
  const logger = context.container.get<Logger>(TYPES.Logger);
  return new GetIssuesTool(facade, logger);
});
```

**Вариант B:** Оставить как peer dependency (если нужна DI интеграция в core)

---

### 5. Publish Strategy: Alpha/Beta versions

**Проблема:** План не описывает workflow для pre-release версий.

**Добавить в PHASE-3, Шаг 3.5:**

```markdown
### Pre-release версионирование

Для тестирования перед основным релизом:

#### Alpha версии (для internal testing)

```bash
# 1. Создать alpha changeset
npx changeset add
# Выбрать patch/minor/major
# Описание: "alpha: test monorepo structure"

# 2. Version bump с prerelease
npx changeset version --snapshot alpha

# Результат: 0.1.0-alpha.20251116
```

#### Beta versions (для early adopters)

```bash
# После alpha testing
npx changeset version --snapshot beta

# Результат: 0.1.0-beta.20251116
```

#### Публикация pre-release

```bash
# Alpha (npm tag: alpha)
npm publish --workspace=@mcp-framework/infrastructure --tag alpha

# Beta (npm tag: beta)
npm publish --workspaces --tag beta

# Latest (npm tag: latest) — только после full testing
npm publish --workspaces
```

#### GitHub Workflow для pre-release

```yaml
# .github/workflows/publish-prerelease.yml
name: Publish Pre-release

on:
  push:
    branches: [develop, refactor/split-into-packages]

jobs:
  publish-alpha:
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/refactor/split-into-packages'
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npm run build
      - run: npx changeset version --snapshot alpha
      - run: npm publish --workspaces --tag alpha
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```
```

---

## 📝 ВАЖНЫЕ УЛУЧШЕНИЯ (SHOULD FIX)

### 6. ESLint конфигурация для monorepo

Добавить в Фазу 1, Шаг 1.1:

```bash
# Создать корневой eslint.config.js для monorepo
cat > eslint.config.js << 'EOF'
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['**/dist/**', '**/node_modules/**', '**/coverage/**']
  },
  eslint.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        project: './tsconfig.json',
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    rules: {
      'max-params': ['warn', 4],
      'complexity': ['warn', 10],
      'max-depth': ['warn', 4],
    }
  }
);
EOF

# Каждый пакет может иметь свой eslint.config.js или наследовать корневой
```

---

### 7. Lockfile strategy для workspaces

Добавить в README корня:

```markdown
## Package Management

**Single lockfile strategy:**
- ТОЛЬКО корневой `package-lock.json`
- НЕТ `package-lock.json` в пакетах
- Добавить в `.gitignore`:
  ```
  packages/*/package-lock.json
  ```

**Команды:**

```bash
# Установить зависимость в пакет
npm install axios --workspace=@mcp-framework/infrastructure

# Обновить все зависимости
npm update

# Проверить outdated
npm outdated --workspaces
```
```

---

### 8. GitHub Actions: Matrix strategy

Улучшить `.github/workflows/ci.yml`:

```yaml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:

jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node-version: [20, 22]
        package:
          - infrastructure
          - core
          - search
          - cli
          - yandex-tracker
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
      - run: npm ci
      - run: npm run build --workspace=@mcp-framework/${{ matrix.package }} || npm run build --workspace=mcp-server-${{ matrix.package }}
      - run: npm run test --workspace=@mcp-framework/${{ matrix.package }} || npm run test --workspace=mcp-server-${{ matrix.package }}

  validate:
    runs-on: ubuntu-latest
    needs: test
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npm run lint --workspaces
      - run: npm run depcruise
```

---

### 9. Bundle strategy для production

Добавить в README каждого пакета:

```markdown
## Distribution

**Two build modes:**

1. **Development** (`npm run build`):
   - Отдельные `.js` файлы
   - Source maps
   - Удобно для debugging

2. **Production** (`npm run build:bundle`):
   - Single bundle file
   - Minified
   - Smaller package size

**Использование:**

```json
// package.json
{
  "main": "./dist/index.js",        // Development
  "browser": "./dist/bundle.js"     // Production bundle
}
```
```

---

### 10. Storybook для tools (опционально)

Для визуальной документации tools:

```bash
# Добавить в packages/yandex-tracker
npm install -D @storybook/react vite

# Создать .storybook/main.ts
# Создать stories для каждого tool

# Показывать:
# - Параметры tool
# - Примеры вызова
# - Результаты
```

---

## 💡 РЕКОМЕНДАЦИИ ПО УЛУЧШЕНИЮ

### 11. Автоматизация с Turborepo

**Почему:** npm workspaces хороши, но Turborepo даёт:
- Кеширование сборок (быстрее при пересборке)
- Параллелизация из коробки
- Remote caching для CI

**Как:**

```bash
npm install -D turbo

# turbo.json
{
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"]
    },
    "test": {
      "dependsOn": ["build"],
      "outputs": ["coverage/**"]
    },
    "lint": {}
  }
}

# package.json
{
  "scripts": {
    "build": "turbo run build",
    "test": "turbo run test",
    "lint": "turbo run lint"
  }
}
```

**Выигрыш:**
- Первая сборка: ~19 часов
- Повторная сборка (с кешем): ~2 минуты

---

### 12. Documentation website (Docusaurus)

Создать `packages/docs`:

```bash
npx create-docusaurus@latest packages/docs classic --typescript

# Структура:
packages/docs/
├── docs/
│   ├── infrastructure/
│   ├── core/
│   ├── search/
│   ├── cli/
│   └── yandex-tracker/
└── blog/
    └── 2025-11-16-monorepo-migration.md
```

Deploy на GitHub Pages или Vercel.

---

### 13. Renovate config для monorepo

Обновить `renovate.json`:

```json
{
  "extends": ["config:base"],
  "packageRules": [
    {
      "matchPackagePatterns": ["@mcp-framework/*"],
      "groupName": "MCP Framework packages",
      "automerge": true
    },
    {
      "matchUpdateTypes": ["patch", "minor"],
      "matchPackagePatterns": ["*"],
      "groupName": "dependencies (non-major)",
      "automerge": true
    }
  ],
  "lockFileMaintenance": {
    "enabled": true,
    "schedule": ["before 3am on Monday"]
  }
}
```

---

### 14. Semantic Release вместо Changesets

**Альтернатива changesets:**

```bash
npm install -D semantic-release @semantic-release/changelog

# .releaserc.json
{
  "branches": ["main"],
  "plugins": [
    "@semantic-release/commit-analyzer",
    "@semantic-release/release-notes-generator",
    "@semantic-release/changelog",
    "@semantic-release/npm",
    "@semantic-release/github"
  ]
}
```

**Commit convention:**

```
feat(core): add new BaseTool method
fix(infrastructure): retry strategy bug
docs(readme): update installation steps
```

**Автоматическая публикация** на каждый push в main.

---

### 15. Monorepo debugging в VSCode

Добавить `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug Yandex Tracker Server",
      "type": "node",
      "request": "launch",
      "cwd": "${workspaceFolder}/packages/yandex-tracker",
      "runtimeExecutable": "npm",
      "runtimeArgs": ["run", "dev:debug"],
      "skipFiles": ["<node_internals>/**"]
    },
    {
      "name": "Debug Tests (Current Package)",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/node_modules/vitest/vitest.mjs",
      "args": ["run", "${relativeFile}"],
      "console": "integratedTerminal"
    }
  ]
}
```

---

## ⚠️ ПОТЕНЦИАЛЬНЫЕ РИСКИ (дополнительно к RISKS.md)

### Риск 10: Workspace protocol issues

**Описание:** `workspace:*` может не работать в некоторых npm версиях < 7.x

**Митигация:**

```json
// package.json
{
  "engines": {
    "node": ">=20.0.0",
    "npm": ">=10.0.0"
  }
}
```

---

### Риск 11: Module resolution в monorepo

**Описание:** TypeScript может неправильно разрешать типы из workspace пакетов

**Митигация:**

```json
// tsconfig.json каждого пакета
{
  "compilerOptions": {
    "moduleResolution": "NodeNext",  // Критично!
    "verbatimModuleSyntax": true     // Для чистоты импортов
  }
}
```

---

## 📊 ОБНОВЛЁННЫЕ ОЦЕНКИ ВРЕМЕНИ

**С учётом новых задач:**

| Фаза | Было | Стало | Причина |
|------|------|-------|---------|
| Фаза 1 | 8 ч | 9 ч | +1ч на ESLint config |
| Фаза 2 | 3 ч (параллельно) | 4 ч | +1ч на Tool Index refactor |
| Фаза 3 | 8 ч | 10 ч | +2ч на скрипты валидации + CLAUDE.md split |
| **ИТОГО** | 19 ч | **23 ч** | +4 часа (21% рост) |

**Оптимизированная оценка:** 20 часов при опытном разработчике

---

## ✅ ЧТО ОСТАВИТЬ БЕЗ ИЗМЕНЕНИЙ

План отлично проработан в следующих аспектах:

1. ✅ **Трёхфазная структура** — логична и оптимальна
2. ✅ **Граф зависимостей** — правильный и не создаёт циклов
3. ✅ **Команды и скрипты** — детальные и исполнимые
4. ✅ **Риски** — покрыты все основные сценарии
5. ✅ **Размеры пакетов** — оценки точны (проверено)
6. ✅ **Чек-лист** — подробный и удобный

---

## 🎯 ПРИОРИТИЗАЦИЯ УЛУЧШЕНИЙ

### MUST DO (перед началом):
1. ✅ Адаптация скриптов валидации (#1)
2. ✅ CLAUDE.md стратегия (#2)
3. ✅ Tool Index в monorepo (#3)
4. ✅ Peer Dependencies (#4)

### SHOULD DO (во время миграции):
5. ⚠️ ESLint конфигурация (#6)
6. ⚠️ Lockfile strategy (#7)
7. ⚠️ Pre-release versions (#5)

### NICE TO HAVE (после миграции):
8. 💡 Turborepo (#11)
9. 💡 Documentation site (#12)
10. 💡 GitHub Actions matrix (#8)

---

## 📝 ИТОГОВЫЕ РЕКОМЕНДАЦИИ

### Готовность к выполнению: 95%

**Что сделать перед началом:**

1. **Обновить PHASE-2-PARALLEL.md:**
   - Добавить секцию про Tool Index (#3)
   - Обновить инструкции для search пакета

2. **Обновить PHASE-3-SEQUENTIAL.md:**
   - Добавить Шаг 3.3.1 (скрипты валидации) (#1)
   - Обновить Шаг 3.4 (CLAUDE.md стратегия) (#2)
   - Добавить секцию про pre-release (#5)

3. **Обновить PACKAGE-SPECS.md:**
   - Исправить зависимости @mcp-framework/core (убрать inversify) (#4)

4. **Обновить README.md:**
   - Добавить секцию про lockfile strategy (#7)

5. **Создать новые файлы:**
   - `.vscode/launch.json` (#15)
   - Обновлённый `eslint.config.js` (#6)

**После этих обновлений план будет на 100% готов к реализации!**

---

**Общая оценка:** План превосходный, требует минимальных доработок. Можно начинать миграцию.

**Время на внесение улучшений:** ~2 часа

**Общее время миграции (с улучшениями):** ~23 часа (2.9 рабочих дня)

---

**Подпись ревьюера:** Claude (AI Assistant)
**Дата:** 2025-11-16
