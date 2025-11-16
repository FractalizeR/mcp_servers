# 🔧 Готовые скрипты и команды

Копируй и вставляй эти скрипты для ускорения миграции.

---

## 📦 Массовая замена импортов

### Заменить @infrastructure/* → @mcp-framework/infrastructure

```bash
find packages/yandex-tracker/src -name "*.ts" -type f -exec sed -i \
  "s|from '@infrastructure/\([^']*\)'|from '@mcp-framework/infrastructure/\1'|g" {} \;

find packages/yandex-tracker/tests -name "*.ts" -type f -exec sed -i \
  "s|from '@infrastructure/\([^']*\)'|from '@mcp-framework/infrastructure/\1'|g" {} \; 2>/dev/null || true
```

### Заменить @mcp/* → @mcp-framework/core

```bash
# tools/base
find packages/yandex-tracker/src -name "*.ts" -type f -exec sed -i \
  "s|from '@mcp/tools/base\([^']*\)'|from '@mcp-framework/core\1'|g" {} \;

# tools/common
find packages/yandex-tracker/src -name "*.ts" -type f -exec sed -i \
  "s|from '@mcp/tools/common\([^']*\)'|from '@mcp-framework/core\1'|g" {} \;

# utils
find packages/yandex-tracker/src -name "*.ts" -type f -exec sed -i \
  "s|from '@mcp/utils\([^']*\)'|from '@mcp-framework/core\1'|g" {} \;

# types
find packages/yandex-tracker/src -name "*.ts" -type f -exec sed -i \
  "s|from '@types'|from '@mcp-framework/core/types'|g" {} \;
```

### Заменить @mcp/search → @mcp-framework/search

```bash
find packages/yandex-tracker/src -name "*.ts" -type f -exec sed -i \
  "s|from '@mcp/search\([^']*\)'|from '@mcp-framework/search\1'|g" {} \;
```

### Заменить @mcp/tool-registry → @mcp-framework/core

```bash
find packages/yandex-tracker/src -name "*.ts" -type f -exec sed -i \
  "s|from '@mcp/tool-registry'|from '@mcp-framework/core'|g" {} \;
```

---

## 🧹 Очистка и пересборка

### Полная очистка

```bash
#!/bin/bash
# clean-all.sh

echo "🧹 Очистка всех пакетов..."

# Удалить dist директории
find packages -name "dist" -type d -exec rm -rf {} + 2>/dev/null || true

# Удалить node_modules
rm -rf node_modules
find packages -name "node_modules" -type d -exec rm -rf {} + 2>/dev/null || true

# Удалить lockfile
rm -f package-lock.json

echo "✅ Очистка завершена"
```

### Свежая установка и сборка

```bash
#!/bin/bash
# rebuild-all.sh

set -e  # Exit on error

echo "🔄 Пересборка всех пакетов..."

# Очистка
./clean-all.sh

# Установка
echo "📦 Установка зависимостей..."
npm install

# Сборка (topological order)
echo "🏗️  Сборка пакетов..."
npm run build --workspace=@mcp-framework/infrastructure
npm run build --workspace=@mcp-framework/core
npm run build --workspace=@mcp-framework/search
npm run build --workspace=@mcp-framework/cli
npm run build --workspace=mcp-server-yandex-tracker

echo "✅ Пересборка завершена"
```

---

## 🔍 Проверка и валидация

### Проверить все импорты

```bash
#!/bin/bash
# check-imports.sh

echo "🔍 Проверка импортов..."

echo "Проверка старых @infrastructure импортов..."
if grep -r "@infrastructure" packages/*/src 2>/dev/null | grep -v "yandex-tracker"; then
  echo "❌ Найдены старые @infrastructure импорты!"
  exit 1
fi

echo "Проверка старых @mcp/tools импортов..."
if grep -r "@mcp/tools" packages/*/src 2>/dev/null | grep -v "yandex-tracker"; then
  echo "❌ Найдены старые @mcp/tools импорты!"
  exit 1
fi

echo "Проверка старых @types импортов..."
if grep -r "from '@types'" packages/*/src 2>/dev/null; then
  echo "❌ Найдены старые @types импорты!"
  exit 1
fi

echo "✅ Все импорты обновлены"
```

### Подсчёт файлов

```bash
#!/bin/bash
# count-files.sh

echo "📊 Статистика файлов:"
echo ""

echo "До миграции (src/):"
find src -name "*.ts" -type f | wc -l

echo "После миграции (packages/):"
find packages -name "*.ts" -type f | grep -v node_modules | grep -v dist | wc -l

echo ""
echo "По пакетам:"
for pkg in infrastructure core search cli yandex-tracker; do
  count=$(find packages/$pkg/src -name "*.ts" -type f 2>/dev/null | wc -l)
  echo "  $pkg: $count файлов"
done
```

### Проверить размеры пакетов

```bash
#!/bin/bash
# check-sizes.sh

echo "📦 Размеры пакетов для публикации:"
echo ""

for pkg in infrastructure core search cli yandex-tracker; do
  cd packages/$pkg
  size=$(npm pack --dry-run 2>&1 | grep "tarball size" | awk '{print $3}')
  files=$(npm pack --dry-run 2>&1 | grep "total files" | awk '{print $3}')
  echo "$pkg: $size ($files files)"
  cd ../..
done
```

---

## 🧪 Тестирование

### Запустить тесты по пакетам

```bash
#!/bin/bash
# test-all.sh

set -e

echo "🧪 Запуск тестов..."

for pkg in infrastructure core search cli yandex-tracker; do
  echo ""
  echo "Testing @mcp-framework/$pkg..."
  npm run test --workspace=@mcp-framework/$pkg 2>/dev/null || \
  npm run test --workspace=mcp-server-$pkg
done

echo ""
echo "✅ Все тесты пройдены"
```

### Проверить coverage

```bash
#!/bin/bash
# coverage-report.sh

echo "📊 Coverage report:"
echo ""

for pkg in infrastructure core search cli yandex-tracker; do
  echo "=== $pkg ==="
  cd packages/$pkg
  npm run test:coverage 2>&1 | grep -E "All files|TOTAL" || echo "No coverage data"
  cd ../..
  echo ""
done
```

---

## 📝 Git операции

### Создать чистые commits для каждой фазы

```bash
#!/bin/bash
# commit-phase.sh

PHASE=$1

if [ -z "$PHASE" ]; then
  echo "Usage: ./commit-phase.sh <phase-number>"
  exit 1
fi

case $PHASE in
  1)
    git add packages/infrastructure packages/core package.json tsconfig.* .gitignore
    git commit -m "phase-1: setup monorepo + infrastructure + core packages

- Настроена структура npm workspaces
- Выделен @mcp-framework/infrastructure (HTTP, cache, logging)
- Выделен @mcp-framework/core (BaseTool, registry, utils)
- BaseTool теперь generic для переиспользования
- Все пакеты собираются и тестируются"
    ;;
  2)
    git add packages/search packages/cli packages/yandex-tracker
    git commit -m "phase-2: add search, cli, and yandex-tracker structure

Параллельная работа над 3 пакетами:
- @mcp-framework/search: Tool Search Engine с 5 стратегиями
- @mcp-framework/cli: CLI для подключения к MCP клиентам
- mcp-server-yandex-tracker: структура и обновлённые импорты

Все импорты обновлены на @mcp-framework/* пакеты.
BaseTool теперь generic и используется с YandexTrackerFacade."
    ;;
  3)
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

Breaking changes: см. MIGRATION.md"
    ;;
  *)
    echo "Unknown phase: $PHASE"
    exit 1
    ;;
esac

echo "✅ Committed phase $PHASE"
```

---

## 🔄 Миграция тестов

### Копировать тесты в правильные места

```bash
#!/bin/bash
# migrate-tests.sh

echo "📦 Миграция тестов..."

# infrastructure
mkdir -p packages/infrastructure/tests
cp -r tests/unit/infrastructure/* packages/infrastructure/tests/ 2>/dev/null || true

# core
mkdir -p packages/core/tests/{tools,utils}
cp -r tests/unit/mcp/tools/base/* packages/core/tests/tools/ 2>/dev/null || true
cp -r tests/unit/mcp/tools/common/* packages/core/tests/tools/ 2>/dev/null || true
cp -r tests/unit/mcp/utils/* packages/core/tests/utils/ 2>/dev/null || true

# search
mkdir -p packages/search/tests
cp -r tests/unit/mcp/search/* packages/search/tests/ 2>/dev/null || true

# cli
mkdir -p packages/cli/tests
cp -r tests/unit/cli/* packages/cli/tests/ 2>/dev/null || true

# yandex-tracker
mkdir -p packages/yandex-tracker/tests/{tracker_api,tools,composition-root}
cp -r tests/unit/tracker_api/* packages/yandex-tracker/tests/tracker_api/ 2>/dev/null || true
cp -r tests/unit/mcp/tools/api/* packages/yandex-tracker/tests/tools/ 2>/dev/null || true
cp -r tests/unit/composition-root/* packages/yandex-tracker/tests/composition-root/ 2>/dev/null || true

echo "✅ Тесты скопированы"
```

---

## 📚 Создание README для пакетов

### Генератор README

```bash
#!/bin/bash
# generate-readmes.sh

# infrastructure
cat > packages/infrastructure/README.md << 'EOF'
# @mcp-framework/infrastructure

Переиспользуемый инфраструктурный слой для MCP серверов.

## Features

- ✅ HTTP Client с retry и error handling
- ✅ Cache Manager (Strategy Pattern)
- ✅ Parallel Executor с throttling
- ✅ Production-ready logging (Pino)

## Installation

\`\`\`bash
npm install @mcp-framework/infrastructure
\`\`\`

## Usage

[См. примеры в документации]
EOF

# core
cat > packages/core/README.md << 'EOF'
# @mcp-framework/core

Базовые классы и утилиты для создания MCP tools.

## Features

- ✅ BaseTool с валидацией и форматированием
- ✅ ToolRegistry для управления tools
- ✅ BatchResultProcessor и ResultLogger
- ✅ ResponseFieldFilter (экономия токенов)

## Installation

\`\`\`bash
npm install @mcp-framework/core
\`\`\`

## Quick Start

[См. примеры в документации]
EOF

# search
cat > packages/search/README.md << 'EOF'
# @mcp-framework/search

Advanced Tool Search Engine с compile-time индексированием.

## Features

- ✅ 5 стратегий поиска (Name, Description, Category, Fuzzy, Combined)
- ✅ Compile-time индексирование
- ✅ LRU кеш
- ✅ Fuzzy matching

## Installation

\`\`\`bash
npm install @mcp-framework/search
\`\`\`

## Usage

[См. примеры в документации]
EOF

# cli
cat > packages/cli/README.md << 'EOF'
# @mcp-framework/cli

CLI инструмент для автоматического подключения MCP серверов.

## Features

- ✅ Поддержка Claude Desktop, Claude Code, Codex
- ✅ Интерактивный режим
- ✅ Автоопределение установленных клиентов
- ✅ Валидация конфигураций

## Installation

\`\`\`bash
npm install -g @mcp-framework/cli
\`\`\`

## Commands

\`\`\`bash
mcp-connect connect     # Подключить MCP сервер
mcp-connect disconnect  # Отключить MCP сервер
mcp-connect status      # Проверить статус
mcp-connect list        # Список клиентов
mcp-connect validate    # Валидация
\`\`\`
EOF

echo "✅ README созданы"
```

---

## 🚀 Pre-publish проверки

### Dry-run публикации

```bash
#!/bin/bash
# dry-run-publish.sh

echo "🚀 Dry-run публикации..."
echo ""

for pkg in infrastructure core search cli yandex-tracker; do
  echo "=== $pkg ==="
  cd packages/$pkg
  npm pack --dry-run
  echo ""
  cd ../..
done

echo "✅ Проверьте размеры и содержимое пакетов"
```

### Проверить что всё готово к публикации

```bash
#!/bin/bash
# pre-publish-check.sh

set -e

echo "📋 Pre-publish checklist:"
echo ""

# 1. Сборка
echo "✓ Проверка сборки..."
npm run build --workspaces > /dev/null 2>&1 && echo "  ✅ Сборка успешна" || echo "  ❌ Ошибка сборки"

# 2. Тесты
echo "✓ Проверка тестов..."
npm run test --workspaces > /dev/null 2>&1 && echo "  ✅ Тесты проходят" || echo "  ❌ Тесты падают"

# 3. Lint
echo "✓ Проверка lint..."
npm run lint --workspaces > /dev/null 2>&1 && echo "  ✅ Lint пройден" || echo "  ❌ Lint ошибки"

# 4. README в пакетах
echo "✓ Проверка README..."
for pkg in infrastructure core search cli yandex-tracker; do
  if [ -f "packages/$pkg/README.md" ]; then
    echo "  ✅ $pkg: README существует"
  else
    echo "  ❌ $pkg: README отсутствует"
  fi
done

# 5. CHANGELOG
echo "✓ Проверка CHANGELOG..."
for pkg in infrastructure core search cli yandex-tracker; do
  if [ -f "packages/$pkg/CHANGELOG.md" ]; then
    echo "  ✅ $pkg: CHANGELOG существует"
  else
    echo "  ❌ $pkg: CHANGELOG отсутствует"
  fi
done

# 6. .npmignore
echo "✓ Проверка .npmignore..."
for pkg in infrastructure core search cli yandex-tracker; do
  if [ -f "packages/$pkg/.npmignore" ]; then
    echo "  ✅ $pkg: .npmignore существует"
  else
    echo "  ❌ $pkg: .npmignore отсутствует"
  fi
done

# 7. publishConfig
echo "✓ Проверка publishConfig..."
for pkg in infrastructure core search cli yandex-tracker; do
  if grep -q "publishConfig" "packages/$pkg/package.json"; then
    echo "  ✅ $pkg: publishConfig настроен"
  else
    echo "  ❌ $pkg: publishConfig отсутствует"
  fi
done

echo ""
echo "✅ Pre-publish проверка завершена"
```

---

## 💡 Полезные alias

Добавьте в `~/.bashrc` или `~/.zshrc`:

```bash
# Monorepo shortcuts
alias mcp-build='npm run build --workspaces'
alias mcp-test='npm run test --workspaces'
alias mcp-clean='find packages -name "dist" -type d -exec rm -rf {} + 2>/dev/null'
alias mcp-lint='npm run lint --workspaces'
alias mcp-validate='npm run validate'
```

---

Используйте эти скрипты для ускорения работы!
