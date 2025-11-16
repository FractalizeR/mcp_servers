# 📗 Фаза 2: Search + CLI + Yandex-Tracker структура (ПАРАЛЛЕЛЬНО)

**Время:** ~3 часа (при параллельной работе)
**Статус:** Можно делать одновременно в 3 терминалах
**Зависимости:** Требует завершения Фазы 1

---

## 🎯 Цель фазы

Выделить 3 независимых компонента, которые можно разрабатывать параллельно:
1. `@mcp-framework/search` — зависит только от core
2. `@mcp-framework/cli` — полностью независимый
3. `mcp-server-yandex-tracker` — подготовка структуры

**Стратегия:** Открыть 3 терминала и работать над каждым пакетом одновременно

---

## 🔀 Параллельная работа

### Терминал 1: @mcp-framework/search
### Терминал 2: @mcp-framework/cli
### Терминал 3: mcp-server-yandex-tracker

---

## 📋 Задача 2A: @mcp-framework/search (Терминал 1)

**Время:** 2.5 часа
**Зависимости:** `@mcp-framework/core` (из Фазы 1)

### Команды

```bash
# === ТЕРМИНАЛ 1 ===

# 1. Создать структуру
mkdir -p packages/search/src/{engine,strategies,scoring,tools}
mkdir -p packages/search/scripts
mkdir -p packages/search/tests

# 2. Скопировать код
cp -r src/mcp/search/* packages/search/src/
cp -r src/mcp/tools/helpers/search/* packages/search/src/tools/
# ⚠️ НЕ копируем generate-tool-index.ts (будет в yandex-tracker!)

# 3. Создать package.json
cat > packages/search/package.json << 'EOF'
{
  "name": "@mcp-framework/search",
  "version": "0.1.0",
  "description": "Advanced tool search engine with compile-time indexing and 5 search strategies",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "default": "./dist/index.js"
    },
    "./engine": {
      "types": "./dist/engine/index.d.ts",
      "default": "./dist/engine/index.js"
    },
    "./strategies": {
      "types": "./dist/strategies/index.d.ts",
      "default": "./dist/strategies/index.js"
    }
  },
  "scripts": {
    "build": "tsc && tsc-alias",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest watch",
    "clean": "rimraf dist"
  },
  "keywords": [
    "mcp",
    "search",
    "tool-discovery",
    "fuzzy-search",
    "ai"
  ],
  "author": "Fractalizer",
  "license": "MIT",
  "dependencies": {
    "@mcp-framework/core": "workspace:*"
  },
  "devDependencies": {
    "@types/node": "^24.10.1",
    "typescript": "^5.9.3",
    "vitest": "^4.0.8",
    "tsc-alias": "^1.8.16",
    "tsx": "^4.20.6"
  },
  "publishConfig": {
    "access": "public"
  }
}
EOF

# 4. Создать tsconfig.json
cat > packages/search/tsconfig.json << 'EOF'
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "composite": true,
    "tsBuildInfoFile": "./dist/tsconfig.tsbuildinfo"
  },
  "references": [
    { "path": "../core" }
  ],
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "**/*.test.ts", "**/*.spec.ts", "scripts"]
}
EOF

# 5. Создать src/index.ts
cat > packages/search/src/index.ts << 'EOF'
// Search Engine
export * from './engine/tool-search-engine.js';

// Strategies
export * from './strategies/search-strategy.interface.js';
export * from './strategies/name-search.strategy.js';
export * from './strategies/description-search.strategy.js';
export * from './strategies/category-search.strategy.js';
export * from './strategies/fuzzy-search.strategy.js';
export * from './strategies/weighted-combined.strategy.js';

// Scoring
export * from './scoring/fuzzy-scorer.js';

// Types
export * from './types.js';
export * from './constants.js';

// Tools (SearchToolsTool)
export * from './tools/search-tools.tool.js';
export * from './tools/search-tools.definition.js';
export * from './tools/search-tools.schema.js';
EOF

# 6. Обновить импорты
find packages/search/src -name "*.ts" -type f -exec sed -i "s|from '@mcp/search/|from './|g" {} \;
find packages/search/src -name "*.ts" -type f -exec sed -i "s|from '@mcp/tools/base/|from '@mcp-framework/core'|g" {} \;
find packages/search/src -name "*.ts" -type f -exec sed -i "s|from '@mcp/tool-registry|from '@mcp-framework/core'|g" {} \;

# 7. ⚠️ ВАЖНО: Tool Index НЕ генерируется в search пакете!
# SearchToolsTool принимает индекс как параметр:
# new SearchToolsTool(TOOL_SEARCH_INDEX, registry, strategies)
# Индекс будет генерироваться в mcp-server-yandex-tracker

# 8. Скопировать тесты
cp -r tests/unit/mcp/search/* packages/search/tests/ 2>/dev/null || true

# 9. Установить и собрать
cd packages/search
npm install
npm run build  # Автоматически запустится prebuild (генерация индекса)
npm run test
cd ../..

echo "✅ Терминал 1: @mcp-framework/search готов!"
```

### ✅ Критерий готовности (Терминал 1)

- [ ] `packages/search/` создан
- [ ] Зависимость только от `@mcp-framework/core`
- [ ] `npm run build` успешен (с prebuild генерацией индекса)
- [ ] `npm run test` успешен

---

## 📋 Задача 2B: @mcp-framework/cli (Терминал 2)

**Время:** 2 часа
**Зависимости:** Нет (полностью независимый)

### Команды

```bash
# === ТЕРМИНАЛ 2 ===

# 1. Создать структуру
mkdir -p packages/cli/src/{connectors,commands,utils,bin}
mkdir -p packages/cli/tests

# 2. Скопировать код
cp -r src/cli/* packages/cli/src/

# 3. Создать package.json
cat > packages/cli/package.json << 'EOF'
{
  "name": "@mcp-framework/cli",
  "version": "0.1.0",
  "description": "CLI tool for connecting MCP servers to Claude Desktop, Claude Code, and Codex",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "bin": {
    "mcp-connect": "./dist/bin/mcp-connect.js"
  },
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "default": "./dist/index.js"
    }
  },
  "scripts": {
    "build": "tsc && tsc-alias && chmod +x dist/bin/mcp-connect.js",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest watch",
    "clean": "rimraf dist"
  },
  "keywords": [
    "mcp",
    "cli",
    "claude",
    "anthropic",
    "codex",
    "automation"
  ],
  "author": "Fractalizer",
  "license": "MIT",
  "dependencies": {
    "@iarna/toml": "^2.2.5",
    "chalk": "^5.6.2",
    "commander": "^14.0.2",
    "inquirer": "^9.3.8",
    "ora": "^8.2.0"
  },
  "devDependencies": {
    "@types/inquirer": "^9.0.9",
    "@types/node": "^24.10.1",
    "typescript": "^5.9.3",
    "vitest": "^4.0.8",
    "tsc-alias": "^1.8.16"
  },
  "publishConfig": {
    "access": "public"
  }
}
EOF

# 4. Создать tsconfig.json
cat > packages/cli/tsconfig.json << 'EOF'
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "composite": true,
    "tsBuildInfoFile": "./dist/tsconfig.tsbuildinfo"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "**/*.test.ts", "**/*.spec.ts"]
}
EOF

# 5. Создать src/index.ts
cat > packages/cli/src/index.ts << 'EOF'
// Connectors
export * from './connectors/base/connector.interface.js';
export * from './connectors/base/base-connector.js';
export * from './connectors/registry.js';
export * from './connectors/claude-desktop/claude-desktop.connector.js';
export * from './connectors/claude-code/claude-code.connector.js';
export * from './connectors/codex/codex.connector.js';

// Commands
export * from './commands/connect.command.js';
export * from './commands/disconnect.command.js';
export * from './commands/status.command.js';
export * from './commands/list.command.js';
export * from './commands/validate.command.js';

// Utils
export * from './utils/config-manager.js';
export * from './utils/file-manager.js';
export * from './utils/command-executor.js';
export * from './utils/interactive-prompter.js';
export * from './utils/logger.js';
EOF

# 6. Обновить импорты (если есть ссылки на src/)
find packages/cli/src -name "*.ts" -type f -exec sed -i "s|from '@cli/|from './|g" {} \;

# 7. ВАЖНО: Сделать constants configurable
# В packages/cli/src/connectors нужно убрать зависимость от src/constants.ts
# и сделать параметры configurable через конструктор

# 8. Скопировать тесты
cp -r tests/unit/cli/* packages/cli/tests/ 2>/dev/null || true

# 9. Установить и собрать
cd packages/cli
npm install
npm run build
npm run test
cd ../..

echo "✅ Терминал 2: @mcp-framework/cli готов!"
```

### ⚠️ ВАЖНОЕ ИЗМЕНЕНИЕ: Configurable constants

В CLI коннекторах убрать hardcoded константы из `src/constants.ts` и сделать их параметрами:

```typescript
// БЫЛО в connectors:
import { MCP_SERVER_NAME, SERVER_ENTRY_POINT } from '../../../constants.js';

// СТАЛО:
export interface MCPServerConfig {
  serverName: string;
  entryPoint: string;
  displayName: string;
  // ... остальные поля
}

// Коннекторы принимают config в методе connect()
```

### ✅ Критерий готовности (Терминал 2)

- [ ] `packages/cli/` создан
- [ ] НЕТ зависимостей от других framework пакетов
- [ ] Constants вынесены в параметры
- [ ] `npm run build` успешен
- [ ] Shebang в bin/mcp-connect.js работает

---

## 📋 Задача 2C: mcp-server-yandex-tracker структура (Терминал 3)

**Время:** 3 часа
**Зависимости:** Косвенно от всех пакетов (будем использовать)

### Команды

```bash
# === ТЕРМИНАЛ 3 ===

# 1. Создать структуру
mkdir -p packages/yandex-tracker/src/{tracker_api,tools,composition-root}
mkdir -p packages/yandex-tracker/tests

# 2. Скопировать код
cp -r src/tracker_api packages/yandex-tracker/src/
cp -r src/mcp/tools/api packages/yandex-tracker/src/tools/
cp -r src/mcp/tools/helpers packages/yandex-tracker/src/tools/
# НЕ копируем tools/helpers/search (он теперь в @mcp-framework/search)
rm -rf packages/yandex-tracker/src/tools/helpers/search
cp -r src/composition-root packages/yandex-tracker/src/
cp src/index.ts packages/yandex-tracker/src/
cp src/constants.ts packages/yandex-tracker/src/

# 3. Создать package.json
cat > packages/yandex-tracker/package.json << 'EOF'
{
  "name": "mcp-server-yandex-tracker",
  "version": "0.1.0",
  "description": "MCP Server for Yandex Tracker API integration",
  "type": "module",
  "main": "./dist/index.js",
  "bin": {
    "mcp-server-yandex-tracker": "./dist/index.js"
  },
  "scripts": {
    "build": "tsc && tsc-alias",
    "build:bundle": "esbuild src/index.ts --bundle --platform=node --format=esm --outfile=dist/bundle.js --external:@modelcontextprotocol/sdk --external:axios --external:inversify --external:p-limit --sourcemap",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest watch",
    "test:smoke": "tsx scripts/smoke-test-server.ts",
    "dev": "npm run build && node dist/index.js",
    "clean": "rimraf dist"
  },
  "keywords": [
    "mcp",
    "yandex-tracker",
    "project-management",
    "api",
    "claude"
  ],
  "author": "Fractalizer",
  "license": "MIT",
  "dependencies": {
    "@mcp-framework/core": "workspace:*",
    "@mcp-framework/search": "workspace:*",
    "@mcp-framework/infrastructure": "workspace:*",
    "@mcp-framework/cli": "workspace:*",
    "inversify": "^7.10.4"
  },
  "devDependencies": {
    "@types/node": "^24.10.1",
    "typescript": "^5.9.3",
    "vitest": "^4.0.8",
    "tsc-alias": "^1.8.16",
    "tsx": "^4.20.6",
    "esbuild": "^0.27.0"
  }
}
EOF

# 4. Создать tsconfig.json
cat > packages/yandex-tracker/tsconfig.json << 'EOF'
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "composite": true,
    "tsBuildInfoFile": "./dist/tsconfig.tsbuildinfo",
    "baseUrl": ".",
    "paths": {
      "@tracker_api/*": ["./src/tracker_api/*"],
      "@tools/*": ["./src/tools/*"],
      "@composition-root/*": ["./src/composition-root/*"]
    }
  },
  "references": [
    { "path": "../core" },
    { "path": "../search" },
    { "path": "../infrastructure" },
    { "path": "../cli" }
  ],
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "**/*.test.ts", "**/*.spec.ts"]
}
EOF

# 5. Обновить импорты (это займёт время!)
# Заменить старые @ алиасы на новые package imports

# infrastructure
find packages/yandex-tracker/src -name "*.ts" -type f -exec sed -i \
  "s|from '@infrastructure/\([^']*\)'|from '@mcp-framework/infrastructure/\1'|g" {} \;

# core (tools/base, tools/common, utils, types)
find packages/yandex-tracker/src -name "*.ts" -type f -exec sed -i \
  "s|from '@mcp/tools/base|from '@mcp-framework/core|g" {} \;
find packages/yandex-tracker/src -name "*.ts" -type f -exec sed -i \
  "s|from '@mcp/tools/common|from '@mcp-framework/core|g" {} \;
find packages/yandex-tracker/src -name "*.ts" -type f -exec sed -i \
  "s|from '@mcp/utils|from '@mcp-framework/core|g" {} \;
find packages/yandex-tracker/src -name "*.ts" -type f -exec sed -i \
  "s|from '@types'|from '@mcp-framework/core/types'|g" {} \;

# search
find packages/yandex-tracker/src -name "*.ts" -type f -exec sed -i \
  "s|from '@mcp/search|from '@mcp-framework/search|g" {} \;

# tool-registry
find packages/yandex-tracker/src -name "*.ts" -type f -exec sed -i \
  "s|from '@mcp/tool-registry|from '@mcp-framework/core'|g" {} \;

# 6. Обновить BaseTool usage (добавить generic)
# В tools/*.tool.ts изменить:
# extends BaseTool → extends BaseTool<YandexTrackerFacade>

# 7. Скопировать тесты
cp -r tests/unit/tracker_api/* packages/yandex-tracker/tests/ 2>/dev/null || true
cp -r tests/unit/mcp/tools/api/* packages/yandex-tracker/tests/ 2>/dev/null || true

# 8. Установить (НЕ собирать пока, т.к. зависит от других пакетов)
cd packages/yandex-tracker
npm install
cd ../..

echo "✅ Терминал 3: mcp-server-yandex-tracker структура готова!"
echo "⚠️  Сборка будет в Фазе 3 (после того как все пакеты готовы)"
```

### ✅ Критерий готовности (Терминал 3)

- [ ] `packages/yandex-tracker/` создан
- [ ] Все импорты обновлены на `@mcp-framework/*`
- [ ] `BaseTool<YandexTrackerFacade>` используется
- [ ] `npm install` успешен
- [ ] ⚠️ Сборка НЕ требуется (будет в Фазе 3)

---

## 🔄 Синхронизация терминалов

После завершения ВСЕХ трёх задач (2A, 2B, 2C):

```bash
# В корне проекта
npm install  # Обновить workspaces links

# Проверить что search и cli собираются
cd packages/search && npm run build && cd ../..
cd packages/cli && npm run build && cd ../..

# yandex-tracker пока не собираем (будет в Фазе 3)
```

---

## 🎯 Итог Фазы 2

После параллельной работы:

✅ **@mcp-framework/search** — готов и собирается
✅ **@mcp-framework/cli** — готов и собирается
✅ **mcp-server-yandex-tracker** — структура создана, импорты обновлены

### Команда для проверки

```bash
# Проверить что search и cli работают
npm run build --workspace=@mcp-framework/search
npm run build --workspace=@mcp-framework/cli

# yandex-tracker будет в Фазе 3
```

### Коммит

```bash
git add packages/search packages/cli packages/yandex-tracker
git commit -m "phase-2: add search, cli, and yandex-tracker structure

Параллельная работа над 3 пакетами:
- @mcp-framework/search: Tool Search Engine с 5 стратегиями
- @mcp-framework/cli: CLI для подключения к MCP клиентам
- mcp-server-yandex-tracker: структура и обновлённые импорты

Все импорты обновлены на @mcp-framework/* пакеты.
BaseTool теперь generic и используется с YandexTrackerFacade.

Related: #<issue-number>
"
```

---

**Следующий шаг:** `PHASE-3-SEQUENTIAL.md` (финальная интеграция)
