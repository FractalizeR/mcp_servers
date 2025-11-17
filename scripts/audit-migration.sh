#!/bin/bash

# Скрипт для аудита потерянной функциональности при миграции на монорепозиторий
# Usage: ./scripts/audit-migration.sh

set -e

REPORT_DIR=".agentic-planning/migration-audit"
mkdir -p "$REPORT_DIR"

echo "🔍 Аудит миграции на монорепозиторий"
echo "====================================="
echo ""

# 1. Найти коммит перед миграцией
echo "1️⃣  Поиск базового коммита (перед миграцией)..."
MIGRATION_START=$(git log --all --oneline --grep="monorepo" --since="2024-11-01" -i | tail -1 | awk '{print $1}')
BEFORE_MIGRATION="${MIGRATION_START}^"
echo "   Базовый коммит: $BEFORE_MIGRATION"
echo "   Начало миграции: $MIGRATION_START"
echo ""

# 2. Сравнение структуры файлов
echo "2️⃣  Сравнение структуры файлов..."
git ls-tree -r $BEFORE_MIGRATION --name-only | sort > "$REPORT_DIR/files-before.txt"
git ls-tree -r HEAD --name-only | sort > "$REPORT_DIR/files-after.txt"
comm -23 "$REPORT_DIR/files-before.txt" "$REPORT_DIR/files-after.txt" > "$REPORT_DIR/deleted-files.txt"

DELETED_COUNT=$(wc -l < "$REPORT_DIR/deleted-files.txt")
echo "   Файлов до миграции: $(wc -l < $REPORT_DIR/files-before.txt)"
echo "   Файлов после миграции: $(wc -l < $REPORT_DIR/files-after.txt)"
echo "   Удалено файлов: $DELETED_COUNT"
echo ""

# 3. Категоризация удалённых файлов
echo "3️⃣  Категоризация удалённых файлов..."

# Source files (не тесты)
grep -E '\.(ts|js|tsx|jsx)$' "$REPORT_DIR/deleted-files.txt" | grep -v test | grep -v spec > "$REPORT_DIR/deleted-source.txt" || true
SRC_COUNT=$(wc -l < "$REPORT_DIR/deleted-source.txt")
echo "   Source files: $SRC_COUNT"

# Test files
grep -E '\.(test|spec)\.(ts|js)$' "$REPORT_DIR/deleted-files.txt" > "$REPORT_DIR/deleted-tests.txt" || true
TEST_COUNT=$(wc -l < "$REPORT_DIR/deleted-tests.txt")
echo "   Test files: $TEST_COUNT"

# Config files
grep -E '\.(json|yaml|yml|toml|ini|config)$' "$REPORT_DIR/deleted-files.txt" > "$REPORT_DIR/deleted-configs.txt" || true
CFG_COUNT=$(wc -l < "$REPORT_DIR/deleted-configs.txt")
echo "   Config files: $CFG_COUNT"

# Documentation
grep -E '\.(md|txt)$' "$REPORT_DIR/deleted-files.txt" > "$REPORT_DIR/deleted-docs.txt" || true
DOC_COUNT=$(wc -l < "$REPORT_DIR/deleted-docs.txt")
echo "   Documentation: $DOC_COUNT"

# Scripts
grep -E '^(scripts|bin)/' "$REPORT_DIR/deleted-files.txt" > "$REPORT_DIR/deleted-scripts.txt" || true
SCRIPT_COUNT=$(wc -l < "$REPORT_DIR/deleted-scripts.txt")
echo "   Scripts: $SCRIPT_COUNT"

echo ""

# 4. Проверка специфичных директорий
echo "4️⃣  Проверка критичных директорий..."

check_directory() {
  local dir=$1
  local label=$2

  if git show $BEFORE_MIGRATION:$dir --name-only >/dev/null 2>&1; then
    local count=$(git ls-tree -r $BEFORE_MIGRATION --name-only | grep "^$dir/" | wc -l)
    echo "   ✓ $label: $count файлов найдено"
    git ls-tree -r $BEFORE_MIGRATION --name-only | grep "^$dir/" > "$REPORT_DIR/audit-$dir.txt" || true
  else
    echo "   ✗ $label: не существовала"
  fi
}

check_directory "src/cli" "CLI tools"
check_directory "scripts" "Scripts"
check_directory "bin" "Bin utilities"
check_directory ".github/workflows" "GitHub Actions"
check_directory "docs" "Docs directory"

echo ""

# 5. Сравнение package.json scripts
echo "5️⃣  Сравнение npm scripts..."
git show $BEFORE_MIGRATION:package.json 2>/dev/null | jq -r '.scripts // {} | keys[]' | sort > "$REPORT_DIR/scripts-before.txt" || true
cat packages/yandex-tracker/package.json | jq -r '.scripts // {} | keys[]' | sort > "$REPORT_DIR/scripts-after.txt" 2>/dev/null || true

if [ -f "$REPORT_DIR/scripts-before.txt" ]; then
  comm -23 "$REPORT_DIR/scripts-before.txt" "$REPORT_DIR/scripts-after.txt" > "$REPORT_DIR/scripts-lost.txt"
  LOST_SCRIPTS=$(wc -l < "$REPORT_DIR/scripts-lost.txt")
  echo "   Потеряно npm scripts: $LOST_SCRIPTS"

  if [ $LOST_SCRIPTS -gt 0 ]; then
    echo "   Список потерянных scripts:"
    while IFS= read -r script; do
      echo "     - $script"
    done < "$REPORT_DIR/scripts-lost.txt"
  fi
else
  echo "   ⚠️  Не удалось прочитать package.json до миграции"
fi

echo ""

# 6. Сравнение dependencies
echo "6️⃣  Сравнение dependencies..."
git show $BEFORE_MIGRATION:package.json 2>/dev/null | jq -r '.dependencies // {} | keys[]' | sort > "$REPORT_DIR/deps-before.txt" || true
find packages -name "package.json" -exec jq -r '.dependencies // {} | keys[]' {} \; 2>/dev/null | sort -u > "$REPORT_DIR/deps-after.txt" || true

if [ -f "$REPORT_DIR/deps-before.txt" ]; then
  comm -23 "$REPORT_DIR/deps-before.txt" "$REPORT_DIR/deps-after.txt" > "$REPORT_DIR/deps-lost.txt"
  LOST_DEPS=$(wc -l < "$REPORT_DIR/deps-lost.txt")
  echo "   Потеряно dependencies: $LOST_DEPS"

  if [ $LOST_DEPS -gt 0 ]; then
    echo "   Список потерянных dependencies:"
    while IFS= read -r dep; do
      echo "     - $dep"
    done < "$REPORT_DIR/deps-lost.txt"
  fi
else
  echo "   ⚠️  Не удалось прочитать package.json до миграции"
fi

echo ""

# 7. Анализ коммита с массовым удалением (88bf8aa)
echo "7️⃣  Анализ коммита миграции (88bf8aa)..."
git diff --name-status 88bf8aa^ 88bf8aa | grep '^D' > "$REPORT_DIR/commit-88bf8aa-deletions.txt" || true
DEL_88bf8aa=$(wc -l < "$REPORT_DIR/commit-88bf8aa-deletions.txt")
echo "   Удалений в коммите 88bf8aa: $DEL_88bf8aa"

# Категоризация
cat "$REPORT_DIR/commit-88bf8aa-deletions.txt" | awk '{print $2}' | while read file; do
  if echo "$file" | grep -q 'src/cli'; then
    echo "CLI: $file"
  elif echo "$file" | grep -q 'scripts'; then
    echo "SCRIPTS: $file"
  elif echo "$file" | grep -q 'test'; then
    echo "TESTS: $file"
  elif echo "$file" | grep -q 'src/'; then
    echo "SOURCE: $file"
  else
    echo "OTHER: $file"
  fi
done | sort | uniq -c > "$REPORT_DIR/commit-88bf8aa-categories.txt"

echo "   Категории удалений:"
cat "$REPORT_DIR/commit-88bf8aa-categories.txt"

echo ""

# 8. Создание итогового отчёта
echo "8️⃣  Создание итогового отчёта..."

cat > "$REPORT_DIR/AUDIT-REPORT.md" << EOF
# Отчёт по аудиту миграции на монорепозиторий

**Дата:** $(date +"%Y-%m-%d %H:%M:%S")
**Базовый коммит:** $BEFORE_MIGRATION
**Коммит миграции:** $MIGRATION_START

---

## 📊 Executive Summary

- **Файлов до миграции:** $(wc -l < $REPORT_DIR/files-before.txt)
- **Файлов после миграции:** $(wc -l < $REPORT_DIR/files-after.txt)
- **Удалено файлов:** $DELETED_COUNT

### Категории удалений:

- Source files: $SRC_COUNT
- Test files: $TEST_COUNT
- Config files: $CFG_COUNT
- Documentation: $DOC_COUNT
- Scripts: $SCRIPT_COUNT

---

## 🔴 Критические находки

### Удалённые source files

\`\`\`
$(cat "$REPORT_DIR/deleted-source.txt" | head -20)
$([ $(wc -l < "$REPORT_DIR/deleted-source.txt") -gt 20 ] && echo "... и ещё $((SRC_COUNT - 20)) файлов")
\`\`\`

### Потерянные npm scripts

$(if [ $LOST_SCRIPTS -gt 0 ]; then
  cat "$REPORT_DIR/scripts-lost.txt" | while read script; do
    echo "- \`$script\`"
  done
else
  echo "✅ Все npm scripts сохранены"
fi)

### Потерянные dependencies

$(if [ $LOST_DEPS -gt 0 ]; then
  cat "$REPORT_DIR/deps-lost.txt" | while read dep; do
    echo "- \`$dep\`"
  done
else
  echo "✅ Все dependencies сохранены"
fi)

---

## 🟡 Некритические находки

### Удалённые тесты

Всего: $TEST_COUNT файлов

$([ $TEST_COUNT -gt 0 ] && echo "См. \`deleted-tests.txt\`")

### Удалённая документация

Всего: $DOC_COUNT файлов

$([ $DOC_COUNT -gt 0 ] && echo "См. \`deleted-docs.txt\`")

---

## ✅ Анализ коммита 88bf8aa

Категории удалений:

\`\`\`
$(cat "$REPORT_DIR/commit-88bf8aa-categories.txt")
\`\`\`

---

## 📋 Рекомендации

1. **Проверить восстановленные CLI tools:**
   - ✅ CLI tools восстановлены в коммите 35752e7
   - Убедиться, что все функции работают

2. **Проверить scripts директорию:**
   - Сравнить \`scripts/\` до и после миграции
   - Восстановить утилитные скрипты если нужно

3. **Проверить npm scripts:**
$(if [ $LOST_SCRIPTS -gt 0 ]; then
  echo "   - ⚠️ Восстановить потерянные scripts"
else
  echo "   - ✅ Все scripts в порядке"
fi)

4. **Проверить dependencies:**
$(if [ $LOST_DEPS -gt 0 ]; then
  echo "   - ⚠️ Проверить необходимость восстановления зависимостей"
else
  echo "   - ✅ Все dependencies в порядке"
fi)

---

## 🔍 Детальные файлы

Все детальные списки находятся в директории:
\`$REPORT_DIR/\`

- \`files-before.txt\` - Все файлы до миграции
- \`files-after.txt\` - Все файлы после миграции
- \`deleted-files.txt\` - Полный список удалённых файлов
- \`deleted-source.txt\` - Удалённые source files
- \`deleted-tests.txt\` - Удалённые тесты
- \`deleted-configs.txt\` - Удалённые конфиги
- \`deleted-docs.txt\` - Удалённая документация
- \`deleted-scripts.txt\` - Удалённые скрипты
- \`scripts-lost.txt\` - Потерянные npm scripts
- \`deps-lost.txt\` - Потерянные dependencies

EOF

echo "   ✅ Отчёт создан: $REPORT_DIR/AUDIT-REPORT.md"
echo ""

# 9. Финальная статистика
echo "✅ Аудит завершён!"
echo ""
echo "📊 Краткая статистика:"
echo "   Всего удалений: $DELETED_COUNT"
echo "   Критичных source files: $SRC_COUNT"
echo "   Потерянных npm scripts: ${LOST_SCRIPTS:-0}"
echo "   Потерянных dependencies: ${LOST_DEPS:-0}"
echo ""
echo "📄 Полный отчёт: $REPORT_DIR/AUDIT-REPORT.md"
echo ""

# Открыть отчёт если критичные находки
if [ $SRC_COUNT -gt 0 ] || [ ${LOST_SCRIPTS:-0} -gt 0 ]; then
  echo "⚠️  ВНИМАНИЕ: Обнаружены критичные удаления!"
  echo "   Откройте отчёт для детального анализа"
fi
