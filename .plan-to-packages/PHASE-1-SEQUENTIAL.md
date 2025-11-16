# 📘 Фаза 1: Подготовка + Infrastructure + Core (ПОСЛЕДОВАТЕЛЬНО)

**Время:** ~8 часов
**Статус:** Критический путь
**Зависимости:** Нет (начальная фаза)

---

## 🎯 Цель фазы

Создать фундамент monorepo и выделить базовые пакеты, от которых зависят все остальные:
1. Структура npm workspaces
2. `@mcp-framework/infrastructure` (база для всех)
3. `@mcp-framework/core` (база для search)

---

## 📋 Шаг 1.1: Подготовка monorepo структуры

**Время:** 1.5 часа
**Цель:** Создать рабочую структуру npm workspaces

### Команды

```bash
# 1. Создать директории пакетов
mkdir -p packages/{infrastructure,core,search,cli,yandex-tracker}

# 2. Создать корневой package.json
cat > package.json << 'EOF'
{
  "name": "mcp-framework-monorepo",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "workspaces": [
    "packages/*"
  ],
  "scripts": {
    "build": "npm run build --workspaces --if-present",
    "test": "npm run test --workspaces --if-present",
    "lint": "npm run lint --workspaces --if-present",
    "typecheck": "npm run typecheck --workspaces --if-present",
    "clean": "rimraf packages/*/dist packages/*/node_modules",
    "validate": "npm run lint && npm run typecheck && npm run test"
  },
  "devDependencies": {
    "@types/node": "^24.10.1",
    "@typescript-eslint/eslint-plugin": "^8.46.4",
    "@typescript-eslint/parser": "^8.46.4",
    "@vitest/coverage-v8": "^4.0.8",
    "dependency-cruiser": "^17.2.0",
    "esbuild": "^0.27.0",
    "eslint": "^9.39.1",
    "eslint-config-prettier": "^10.1.8",
    "prettier": "^3.6.2",
    "rimraf": "^6.1.0",
    "tsc-alias": "^1.8.16",
    "tsx": "^4.20.6",
    "typescript": "^5.9.3",
    "vitest": "^4.0.8"
  }
}
EOF

# 3. Создать tsconfig.base.json
cat > tsconfig.base.json << 'EOF'
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022"],
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "verbatimModuleSyntax": true,

    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "noPropertyAccessFromIndexSignature": true,
    "exactOptionalPropertyTypes": true,

    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "composite": true,

    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "forceConsistentCasingInFileNames": true,
    "isolatedModules": true,
    "noUncheckedSideEffectImports": true,
    "resolveJsonModule": true,
    "skipLibCheck": true,

    "types": ["node"]
  }
}
EOF

# 4. Создать корневой tsconfig.json
cat > tsconfig.json << 'EOF'
{
  "files": [],
  "references": [
    { "path": "./packages/infrastructure" },
    { "path": "./packages/core" },
    { "path": "./packages/search" },
    { "path": "./packages/cli" },
    { "path": "./packages/yandex-tracker" }
  ]
}
EOF

# 5. Установить зависимости
npm install
```

### Проверка

```bash
# Должны быть созданы:
ls -la packages/  # 5 директорий
ls -la tsconfig.base.json tsconfig.json package.json  # Файлы на месте

# npm workspaces работает
npm ls --workspaces  # Должен показать пустой список (пока пакеты не созданы)
```

### ✅ Критерий готовности

- [ ] Директории `packages/*` созданы
- [ ] Корневой `package.json` с workspaces
- [ ] `tsconfig.base.json` и `tsconfig.json` созданы
- [ ] `npm install` выполнен успешно

---

## 📋 Шаг 1.2: Разделение @mcp-framework/infrastructure

**Время:** 3 часа
**Цель:** Выделить переиспользуемую инфраструктуру

### Команды

```bash
# 1. Создать структуру пакета
mkdir -p packages/infrastructure/src
mkdir -p packages/infrastructure/tests

# 2. Скопировать код
cp -r src/infrastructure/* packages/infrastructure/src/

# 3. Создать package.json
cat > packages/infrastructure/package.json << 'EOF'
{
  "name": "@mcp-framework/infrastructure",
  "version": "0.1.0",
  "description": "Reusable infrastructure layer: HTTP, cache, logging, async utilities",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "default": "./dist/index.js"
    },
    "./http": {
      "types": "./dist/http/index.d.ts",
      "default": "./dist/http/index.js"
    },
    "./cache": {
      "types": "./dist/cache/index.d.ts",
      "default": "./dist/cache/index.js"
    },
    "./logging": {
      "types": "./dist/logging/index.d.ts",
      "default": "./dist/logging/index.js"
    },
    "./config": {
      "types": "./dist/config.d.ts",
      "default": "./dist/config.js"
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
    "infrastructure",
    "http",
    "logging",
    "cache"
  ],
  "author": "Fractalizer",
  "license": "MIT",
  "dependencies": {
    "axios": "^1.13.2",
    "p-limit": "^7.2.0",
    "pino": "^10.1.0",
    "pino-pretty": "^13.1.2",
    "rotating-file-stream": "^3.2.7"
  },
  "devDependencies": {
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
cat > packages/infrastructure/tsconfig.json << 'EOF'
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

# 5. Создать src/index.ts с экспортами
cat > packages/infrastructure/src/index.ts << 'EOF'
// HTTP Layer
export * from './http/client/http-client.js';
export * from './http/retry/retry-strategy.interface.js';
export * from './http/retry/retry-handler.js';
export * from './http/retry/exponential-backoff.strategy.js';
export * from './http/error/error-mapper.js';

// Cache Layer
export * from './cache/cache-manager.interface.js';
export * from './cache/no-op-cache.js';

// Async utilities
export * from './async/parallel-executor.js';

// Logging
export * from './logging/index.js';

// Config
export { loadConfig } from './config.js';
export type { ServerConfig } from './config.js';
EOF

# 6. Обновить импорты внутри infrastructure (убрать @ алиасы)
# Это нужно сделать вручную или через find/sed
find packages/infrastructure/src -name "*.ts" -type f -exec sed -i "s|from '@infrastructure/|from './|g" {} \;

# 7. Скопировать тесты
cp -r tests/unit/infrastructure/* packages/infrastructure/tests/ 2>/dev/null || true

# 8. Установить зависимости и собрать
cd packages/infrastructure
npm install
npm run build
npm run test
cd ../..
```

### Проверка

```bash
cd packages/infrastructure

# Сборка успешна
npm run build
ls dist/  # Должны быть .js и .d.ts файлы

# Тесты проходят
npm run test

# Typecheck успешен
npm run typecheck
```

### ✅ Критерий готовности

- [ ] `packages/infrastructure/` содержит весь код из `src/infrastructure/`
- [ ] `package.json` создан с правильными зависимостями
- [ ] `npm run build` успешен
- [ ] `npm run test` успешен (или пропускаем если тестов нет)
- [ ] `dist/` содержит скомпилированные файлы

---

## 📋 Шаг 1.3: Разделение @mcp-framework/core

**Время:** 3.5 часа
**Цель:** Выделить базовые классы MCP tools

### Команды

```bash
# 1. Создать структуру
mkdir -p packages/core/src/{tools,utils}
mkdir -p packages/core/tests

# 2. Скопировать код
cp -r src/mcp/tools/base packages/core/src/tools/
cp -r src/mcp/tools/common packages/core/src/tools/
cp -r src/mcp/utils packages/core/src/
cp src/mcp/tool-registry.ts packages/core/src/
cp src/types.ts packages/core/src/

# 3. Создать package.json
cat > packages/core/package.json << 'EOF'
{
  "name": "@mcp-framework/core",
  "version": "0.1.0",
  "description": "Core framework for building MCP tools: base classes, utilities, registry",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "default": "./dist/index.js"
    },
    "./tools": {
      "types": "./dist/tools/index.d.ts",
      "default": "./dist/tools/index.js"
    },
    "./utils": {
      "types": "./dist/utils/index.d.ts",
      "default": "./dist/utils/index.js"
    },
    "./types": {
      "types": "./dist/types.d.ts",
      "default": "./dist/types.js"
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
    "model-context-protocol",
    "framework",
    "tools",
    "ai"
  ],
  "author": "Fractalizer",
  "license": "MIT",
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.22.0",
    "zod": "^3.25.76",
    "pino": "^10.1.0"
  },
  "peerDependencies": {
    "inversify": "^7.x"
  },
  "devDependencies": {
    "@types/node": "^24.10.1",
    "inversify": "^7.10.4",
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
cat > packages/core/tsconfig.json << 'EOF'
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
cat > packages/core/src/index.ts << 'EOF'
// Base classes
export * from './tools/base/index.js';
export * from './tools/common/index.js';

// Utils
export * from './utils/index.js';

// Registry
export * from './tool-registry.js';

// Types
export * from './types.js';
EOF

# 6. ВАЖНО: Сделать BaseTool generic (убрать зависимость от YandexTrackerFacade)
# Это нужно сделать вручную в packages/core/src/tools/base/base-tool.ts
```

### ⚠️ КРИТИЧЕСКОЕ ИЗМЕНЕНИЕ: Genericify BaseTool

Откройте `packages/core/src/tools/base/base-tool.ts` и измените:

```typescript
// БЫЛО:
import type { YandexTrackerFacade } from '@tracker_api/facade/yandex-tracker.facade.js';

export abstract class BaseTool {
  protected readonly trackerFacade: YandexTrackerFacade;

  constructor(trackerFacade: YandexTrackerFacade, logger: Logger) {
    this.trackerFacade = trackerFacade;
    // ...
  }
}

// СТАЛО:
export abstract class BaseTool<TFacade = unknown> {
  protected readonly facade: TFacade;
  protected readonly logger: Logger;

  constructor(facade: TFacade, logger: Logger) {
    this.facade = facade;
    this.logger = logger;
  }

  // Остальное без изменений
}
```

### Продолжение команд

```bash
# 7. Обновить импорты (убрать @ алиасы)
find packages/core/src -name "*.ts" -type f -exec sed -i "s|from '@mcp/tools/base/|from './|g" {} \;
find packages/core/src -name "*.ts" -type f -exec sed -i "s|from '@mcp/tools/common/|from './|g" {} \;
find packages/core/src -name "*.ts" -type f -exec sed -i "s|from '@mcp/utils/|from './utils/|g" {} \;
find packages/core/src -name "*.ts" -type f -exec sed -i "s|from '@types'|from './types.js'|g" {} \;

# 8. Скопировать тесты
cp -r tests/unit/mcp/tools/base/* packages/core/tests/ 2>/dev/null || true
cp -r tests/unit/mcp/tools/common/* packages/core/tests/ 2>/dev/null || true

# 9. Установить и собрать
cd packages/core
npm install
npm run build
npm run test
cd ../..
```

### Проверка

```bash
cd packages/core

# Сборка
npm run build
ls dist/  # .js и .d.ts файлы

# Нет зависимости от tracker_api
! grep -r "@tracker_api" src/  # Не должно найти

# Тесты
npm run test
```

### ✅ Критерий готовности

- [ ] `packages/core/` содержит базовые классы
- [ ] `BaseTool` стал generic (`BaseTool<TFacade>`)
- [ ] НЕТ импортов `@tracker_api`
- [ ] `npm run build` успешен
- [ ] `npm run test` успешен

---

## 🎯 Итог Фазы 1

После завершения этих шагов:

✅ **Monorepo структура готова**
✅ **@mcp-framework/infrastructure** — собирается и тестируется
✅ **@mcp-framework/core** — собирается и тестируется

### Команда для проверки всей фазы

```bash
# В корне проекта
npm run build --workspaces
npm run test --workspaces
npm run typecheck --workspaces

# Все должно пройти успешно
```

### Коммит

```bash
git add .
git commit -m "phase-1: setup monorepo + infrastructure + core packages

- Настроена структура npm workspaces
- Выделен @mcp-framework/infrastructure (HTTP, cache, logging)
- Выделен @mcp-framework/core (BaseTool, registry, utils)
- BaseTool теперь generic для переиспользования
- Все пакеты собираются и тестируются

Related: #<issue-number>
"
```

---

**Следующий шаг:** `PHASE-2-PARALLEL.md` (можно работать параллельно!)
