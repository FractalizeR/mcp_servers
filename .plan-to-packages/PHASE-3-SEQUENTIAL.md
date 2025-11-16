# 📕 Фаза 3: Интеграция + Тесты + Публикация (ПОСЛЕДОВАТЕЛЬНО)

**Время:** ~8 часов
**Статус:** Критический путь (финализация)
**Зависимости:** Требует завершения Фаз 1 и 2

---

## 🎯 Цель фазы

Свести всё вместе и подготовить к публикации:
1. Собрать и протестировать yandex-tracker с новыми пакетами
2. Настроить общую сборку и CI/CD
3. Обновить документацию
4. Подготовить к публикации в npm

---

## 📋 Шаг 3.1: Сборка yandex-tracker и интеграция

**Время:** 3 часа
**Цель:** Собрать yandex-tracker с зависимостями от framework пакетов

### Команды

```bash
# 1. Обновить workspace links
npm install

# 2. Собрать все пакеты по порядку (respecting dependencies)
npm run build --workspace=@mcp-framework/infrastructure
npm run build --workspace=@mcp-framework/core
npm run build --workspace=@mcp-framework/search
npm run build --workspace=@mcp-framework/cli
npm run build --workspace=mcp-server-yandex-tracker

# Или через корневой скрипт (должен работать topological sort)
npm run build

# 3. Проверить что yandex-tracker собрался
ls packages/yandex-tracker/dist/index.js  # Должен существовать

# 4. Проверить imports в скомпилированных файлах
# Не должно быть ошибок вроде "Cannot find module"
node packages/yandex-tracker/dist/index.js --help || echo "Ожидается ошибка (нет env vars)"
```

### Устранение проблем сборки

Если есть ошибки компиляции:

```bash
# Проверить все импорты
grep -r "from '@" packages/yandex-tracker/src/ | grep -v "@mcp-framework" | grep -v "@tracker_api" | grep -v "@tools" | grep -v "@composition-root"

# Если найдены старые импорты — исправить вручную

# Проверить что BaseTool используется правильно
grep -r "extends BaseTool" packages/yandex-tracker/src/tools/
# Все должны быть: extends BaseTool<YandexTrackerFacade>
```

### ✅ Критерий готовности

- [ ] Все 5 пакетов собираются без ошибок
- [ ] `packages/yandex-tracker/dist/` содержит скомпилированные файлы
- [ ] НЕТ import ошибок при запуске

---

## 📋 Шаг 3.2: Настройка тестов

**Время:** 2 часа
**Цель:** Запустить все тесты и обеспечить coverage ≥80%

### Команды

```bash
# 1. Переместить тесты в правильные пакеты (если ещё не сделано)

# infrastructure tests
cp -r tests/unit/infrastructure/* packages/infrastructure/tests/ 2>/dev/null || true

# core tests
cp -r tests/unit/mcp/tools/base/* packages/core/tests/tools/base/ 2>/dev/null || true
cp -r tests/unit/mcp/tools/common/* packages/core/tests/tools/common/ 2>/dev/null || true
cp -r tests/unit/mcp/utils/* packages/core/tests/utils/ 2>/dev/null || true

# search tests
cp -r tests/unit/mcp/search/* packages/search/tests/ 2>/dev/null || true

# cli tests
cp -r tests/unit/cli/* packages/cli/tests/ 2>/dev/null || true

# yandex-tracker tests
cp -r tests/unit/tracker_api/* packages/yandex-tracker/tests/tracker_api/ 2>/dev/null || true
cp -r tests/unit/mcp/tools/api/* packages/yandex-tracker/tests/tools/api/ 2>/dev/null || true
cp -r tests/unit/composition-root/* packages/yandex-tracker/tests/composition-root/ 2>/dev/null || true

# 2. Обновить импорты в тестах
# В каждом тесте заменить старые пути на новые
find packages/*/tests -name "*.test.ts" -type f -exec sed -i \
  "s|from '@infrastructure/|from '@mcp-framework/infrastructure/|g" {} \;
find packages/*/tests -name "*.test.ts" -type f -exec sed -i \
  "s|from '@mcp/tools/base|from '@mcp-framework/core|g" {} \;
# ... и т.д.

# 3. Создать vitest.config.ts для каждого пакета
for pkg in infrastructure core search cli yandex-tracker; do
  cat > packages/$pkg/vitest.config.ts << 'EOF'
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/**',
        'dist/**',
        '**/*.test.ts',
        '**/*.spec.ts',
        '**/index.ts',
      ],
    },
  },
});
EOF
done

# 4. Запустить тесты по пакетам
npm run test --workspace=@mcp-framework/infrastructure
npm run test --workspace=@mcp-framework/core
npm run test --workspace=@mcp-framework/search
npm run test --workspace=@mcp-framework/cli
npm run test --workspace=mcp-server-yandex-tracker

# Или все сразу
npm run test

# 5. Проверить coverage
npm run test:coverage --workspaces
```

### Устранение проблем с тестами

```bash
# Если тесты падают из-за импортов
# Проверить каждый файл теста и обновить пути

# Если низкий coverage
# Добавить недостающие тесты или исключить файлы из coverage
```

### ✅ Критерий готовности

- [ ] Все тесты проходят
- [ ] Coverage ≥80% (или близко)
- [ ] Нет warnings о неправильных импортах

---

## 📋 Шаг 3.3: Адаптация скриптов валидации

**Время:** 1.5 часа
**Цель:** Адаптировать существующие скрипты для monorepo

### Команды

```bash
# 1. Переместить скрипты в yandex-tracker
mkdir -p packages/yandex-tracker/scripts
cp scripts/validate-tool-registration.ts packages/yandex-tracker/scripts/
cp scripts/smoke-test-server.ts packages/yandex-tracker/scripts/
cp scripts/generate-tool-index.ts packages/yandex-tracker/scripts/

# 2. Обновить пути в скриптах
sed -i "s|'../src/|'../src/|g" packages/yandex-tracker/scripts/*.ts
sed -i "s|'src/tools|'../src/tools|g" packages/yandex-tracker/scripts/validate-tool-registration.ts
sed -i "s|'src/tracker_api|'../src/tracker_api|g" packages/yandex-tracker/scripts/validate-tool-registration.ts

# 3. Обновить validate-docs-size.ts (остаётся в корне)
# Добавить проверку README.md пакетов
```

### ✅ Критерий готовности

- [ ] Скрипты валидации работают
- [ ] `npm run validate:tools` успешен

---

## 📋 Шаг 3.4: Валидация архитектуры

**Время:** 1 час
**Цель:** Проверить архитектурные правила

### Команды

```bash
# 1. dependency-cruiser уже в корне

# 2. Обновить правила для monorepo структуры
# В .dependency-cruiser.cjs добавить правила для packages/*

# 3. Запустить dependency-cruiser
npm run depcruise

# Если есть нарушения — исправить их

# 4. Smoke test сервера
cd packages/yandex-tracker

# Создать .env для теста
cat > .env.test << 'EOF'
YANDEX_TRACKER_TOKEN=test-token
YANDEX_ORG_ID=test-org
LOG_LEVEL=silent
EOF

# Запустить smoke test (если есть скрипт)
npm run test:smoke || echo "Создать scripts/smoke-test-server.ts если нет"

cd ../..
```

### ✅ Критерий готовности

- [ ] `npm run depcruise` проходит без ошибок
- [ ] Smoke test работает (или создан)

---

## 📋 Шаг 3.5: Обновление документации

**Время:** 2.5 часа
**Цель:** Обновить всю документацию для monorepo (включая CLAUDE.md стратегию)

### ⚠️ ВАЖНО: Стратегия для CLAUDE.md

**Проблема:** Корневой CLAUDE.md имеет лимит 400 строк, сейчас ~360.
В monorepo нужно описать структуру пакетов, но места нет.

**Решение:**
- **Корневой CLAUDE.md** (~200 строк) — общие правила monorepo, граф зависимостей
- **packages/yandex-tracker/CLAUDE.md** (~350 строк) — специфика Yandex Tracker

### Задачи

```bash
# 1. Создать упрощённый корневой CLAUDE.md
cat > CLAUDE.md << 'EOF'
# CLAUDE.md — Руководство для ИИ агентов (Monorepo)

## 📦 Структура monorepo

packages/
├── infrastructure/     → @mcp-framework/infrastructure (HTTP, logging)
├── core/              → @mcp-framework/core (BaseTool, registry)
├── search/            → @mcp-framework/search (Tool Search Engine)
├── cli/               → @mcp-framework/cli (MCP connectors)
└── yandex-tracker/    → mcp-server-yandex-tracker (Yandex API)

## КРИТИЧЕСКИЕ ПРАВИЛА

### Граф зависимостей (НЕ НАРУШАТЬ!)

infrastructure (база для всех)
    ↓
core (зависит от infrastructure)
    ↓
search (зависит от core)
    ↓
yandex-tracker (зависит от всех)

cli — НЕЗАВИСИМ от других пакетов

❌ НЕЛЬЗЯ обратные зависимости
❌ НЕЛЬЗЯ импорты вверх по графу

### Импорты между пакетами

✅ Используй npm package names:
import { BaseTool } from '@mcp-framework/core';
import { HttpClient } from '@mcp-framework/infrastructure';

❌ НЕ используй относительные пути между пакетами

## Детали по пакетам

См. README.md в каждом пакете для конвенций и правил.

[... остальные общие правила ...]
EOF

# 2. Переместить детали в packages/yandex-tracker/CLAUDE.md
cat > packages/yandex-tracker/CLAUDE.md << 'EOF'
# CLAUDE.md — Yandex Tracker MCP Server

[... специфика для Tracker: структура, API правила, конвенции ...]
EOF

# 3. Обновить корневой README.md
cat > README.md << 'EOF'
# MCP Framework & Yandex Tracker Server

[... monorepo описание ...]
EOF

# 4. Создать README.md для каждого пакета
# infrastructure
cat > packages/infrastructure/README.md << 'EOF'
# @mcp-framework/infrastructure

Переиспользуемый инфраструктурный слой: HTTP клиент, кеш, логирование, async утилиты.

## Installation

\`\`\`bash
npm install @mcp-framework/infrastructure
\`\`\`

## Usage

[... примеры ...]
EOF

# core
cat > packages/core/README.md << 'EOF'
# @mcp-framework/core

Базовые классы и утилиты для создания MCP tools.

[... API reference и примеры ...]
EOF

# search
cat > packages/search/README.md << 'EOF'
# @mcp-framework/search

Advanced Tool Search Engine с compile-time индексированием.

[... описание стратегий и примеры ...]
EOF

# cli
cat > packages/cli/README.md << 'EOF'
# @mcp-framework/cli

CLI инструмент для автоматического подключения MCP серверов.

## Commands

\`\`\`bash
mcp-connect connect
mcp-connect disconnect
mcp-connect status
\`\`\`

[... детали команд ...]
EOF

# yandex-tracker
# Обновить существующий README.md с новой структурой

# 3. Обновить CLAUDE.md
# Изменить все пути на packages/* и @mcp-framework/*

# 4. Обновить ARCHITECTURE.md
# Добавить схему monorepo и граф зависимостей

# 5. Создать MIGRATION.md
cat > MIGRATION.md << 'EOF'
# Migration Guide v1 → v2

## Breaking Changes

1. Импорты изменились:
   - `@infrastructure/*` → `@mcp-framework/infrastructure`
   - `@mcp/tools/base/*` → `@mcp-framework/core`
   - И т.д.

2. `BaseTool` теперь generic:
   - Было: `extends BaseTool`
   - Стало: `extends BaseTool<YourFacade>`

[... детальный гайд миграции ...]
EOF

# 6. Создать CHANGELOG.md для каждого пакета
for pkg in infrastructure core search cli yandex-tracker; do
  cat > packages/$pkg/CHANGELOG.md << 'EOF'
# Changelog

## [0.1.0] - 2025-11-16

### Added
- Initial release
EOF
done
```

### ✅ Критерий готовности

- [ ] Корневой README.md обновлён
- [ ] Каждый пакет имеет README.md
- [ ] CLAUDE.md и ARCHITECTURE.md обновлены
- [ ] MIGRATION.md создан
- [ ] CHANGELOG.md для всех пакетов

---

## 📋 Шаг 3.6: Подготовка к публикации

**Время:** 2 часа
**Цель:** Настроить publishConfig и CI/CD

### Команды

```bash
# 1. Добавить .npmignore в каждый пакет
for pkg in infrastructure core search cli yandex-tracker; do
  cat > packages/$pkg/.npmignore << 'EOF'
src/
tests/
tsconfig.json
vitest.config.ts
*.test.ts
*.spec.ts
.eslintrc
.prettierrc
node_modules/
coverage/
EOF
done

# 2. Проверить что publishConfig есть во всех package.json
grep -r "publishConfig" packages/*/package.json

# 3. Создать GitHub Actions workflow
mkdir -p .github/workflows
cat > .github/workflows/ci.yml << 'EOF'
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
      - run: npm ci
      - run: npm run build
      - run: npm run test
      - run: npm run lint
      - run: npm run depcruise
EOF

# 4. Создать workflow для публикации
cat > .github/workflows/publish.yml << 'EOF'
name: Publish Packages

on:
  push:
    tags:
      - 'v*'

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
          registry-url: 'https://registry.npmjs.org'
      - run: npm ci
      - run: npm run build
      - run: npm run test
      - run: npm publish --workspaces
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
EOF

# 5. Установить changesets для версионирования
npm install -D @changesets/cli
npx changeset init

# 6. Dry-run публикации
cd packages/infrastructure && npm pack --dry-run && cd ../..
cd packages/core && npm pack --dry-run && cd ../..
cd packages/search && npm pack --dry-run && cd ../..
cd packages/cli && npm pack --dry-run && cd ../..
cd packages/yandex-tracker && npm pack --dry-run && cd ../..

# Проверить размеры пакетов (должны быть адекватными)
```

### ✅ Критерий готовности

- [ ] `.npmignore` во всех пакетах
- [ ] GitHub Actions workflows созданы
- [ ] Changesets настроен
- [ ] `npm pack --dry-run` успешен для всех пакетов

---

## 📋 Шаг 3.7: Финальная валидация

**Время:** 1 час
**Цель:** Убедиться что всё работает

### Полная проверка

```bash
# 1. Очистить всё и пересобрать с нуля
npm run clean
rm -rf node_modules packages/*/node_modules
npm install
npm run build

# 2. Запустить все проверки
npm run validate  # lint + typecheck + test + depcruise

# 3. Smoke test сервера
cd packages/yandex-tracker
# Установить env vars
export YANDEX_TRACKER_TOKEN=your-token
export YANDEX_ORG_ID=your-org
npm run dev  # Должен запуститься без ошибок
# Ctrl+C

# 4. Проверить что CLI работает
cd packages/cli
npm link
mcp-connect --help  # Должна показаться справка
npm unlink
cd ../..

# 5. Проверить размеры пакетов
du -sh packages/*/dist/

# 6. Проверить что нет duplicate dependencies
npm ls --all | grep -i "duplicate"

# 7. Финальный checklist
echo "✅ Все пакеты собираются"
echo "✅ Все тесты проходят"
echo "✅ Coverage ≥80%"
echo "✅ dependency-cruiser проходит"
echo "✅ Smoke test успешен"
echo "✅ Документация обновлена"
echo "✅ CI/CD настроен"
```

### ✅ Критерий готовности

- [ ] Полная пересборка с нуля успешна
- [ ] `npm run validate` проходит
- [ ] Smoke test работает
- [ ] CLI работает
- [ ] Нет duplicate dependencies

---

## 🎯 Итог Фазы 3

После завершения:

✅ **Все 5 пакетов собраны и протестированы**
✅ **Архитектурные правила соблюдены**
✅ **Документация обновлена**
✅ **CI/CD настроен**
✅ **Готово к публикации в npm**

### Финальный коммит

```bash
git add .
git commit -m "phase-3: complete monorepo migration

Интеграция и финализация:
- Все 5 пакетов собираются и работают вместе
- Тесты перемещены и обновлены (coverage ≥80%)
- Документация полностью обновлена
- CI/CD workflows настроены
- Готово к публикации в npm

Пакеты:
- @mcp-framework/infrastructure@0.1.0
- @mcp-framework/core@0.1.0
- @mcp-framework/search@0.1.0
- @mcp-framework/cli@0.1.0
- mcp-server-yandex-tracker@0.1.0

Breaking changes: см. MIGRATION.md

Related: #<issue-number>
"
```

### Push и создание PR

```bash
git push -u origin refactor/split-into-packages

# Создать PR через GitHub UI
# Title: "[BREAKING] Refactor: Split into 5 npm packages (monorepo)"
# Description: см. MIGRATION.md и ARCHITECTURE.md
```

---

## 🚀 Публикация (после мержа PR)

```bash
# После мержа в main
git checkout main
git pull

# Создать changeset
npx changeset add
# Выбрать все пакеты, major bump (0.1.0 → 1.0.0), описать изменения

# Создать version bump commit
npx changeset version
git add .
git commit -m "chore: bump versions to 1.0.0"
git push

# Создать git tag
git tag v1.0.0
git push --tags

# GitHub Actions автоматически опубликует в npm
# Или вручную:
# npm publish --workspaces
```

---

**Миграция завершена! 🎉**

**Следующие шаги:**
1. Мониторинг загрузок npm
2. Сбор feedback от community
3. Создание docs сайта
4. Примеры использования framework
