# Промпт: Аудит потерянной функциональности при миграции на монорепозиторий

## 🎯 Цель

Провести полный аудит истории Git для выявления функциональности, случайно удалённой при миграции на монорепозиторий (особенно в коммитах 88bf8aa и окружающих).

---

## 📋 Задача для ИИ агента

Выполни comprehensive аудит репозитория для поиска потерянной функциональности:

### 1. Идентификация ключевых коммитов миграции

```bash
# Найти все коммиты миграции на монорепу
git log --all --oneline --grep="monorepo\|migration\|migrate\|refactor" --since="2024-11-01" -i

# Найти коммиты с массовыми удалениями
git log --all --oneline --diff-filter=D --since="2024-11-01" | head -30

# Идентифицировать коммит ПЕРЕД началом миграции
# Это будет baseline для сравнения
```

**Критические коммиты для проверки:**
- `88bf8aa` - refactor: завершить миграцию структуры тестов на монорепозиторий
- Все коммиты между началом миграции и текущим состоянием

### 2. Сравнение структуры файлов

**A. Получить снимок ДО миграции:**

```bash
# Найти последний коммит перед миграцией
BEFORE_MIGRATION=$(git log --all --oneline --grep="monorepo" --since="2024-11-01" | tail -1 | cut -d' ' -f1)
BEFORE_MIGRATION="${BEFORE_MIGRATION}^"

# Список всех файлов до миграции
git ls-tree -r $BEFORE_MIGRATION --name-only > /tmp/files-before.txt

# Список всех файлов сейчас
git ls-tree -r HEAD --name-only > /tmp/files-after.txt

# Файлы, которые были удалены
comm -23 <(sort /tmp/files-before.txt) <(sort /tmp/files-after.txt) > /tmp/deleted-files.txt

# Показать удалённые файлы
cat /tmp/deleted-files.txt
```

**B. Категоризировать удалённые файлы:**

```bash
# Source files
grep -E '\.(ts|js|tsx|jsx)$' /tmp/deleted-files.txt | grep -v test

# Test files
grep -E '\.test\.(ts|js)$' /tmp/deleted-files.txt

# Config files
grep -E '\.(json|yaml|yml|toml|ini)$' /tmp/deleted-files.txt

# Documentation
grep -E '\.(md|txt)$' /tmp/deleted-files.txt

# Scripts
grep -E '^(scripts|bin)/' /tmp/deleted-files.txt

# GitHub workflows
grep -E '\.github/' /tmp/deleted-files.txt
```

### 3. Проверка функциональных директорий

**Проверить следующие директории на предмет удалённых файлов:**

```bash
# CLI инструменты (уже найдены и восстановлены)
git show $BEFORE_MIGRATION:src/cli --name-only 2>/dev/null

# Scripts
git show $BEFORE_MIGRATION:scripts --name-only 2>/dev/null

# Bin utilities
git show $BEFORE_MIGRATION:bin --name-only 2>/dev/null

# GitHub Actions / CI
git show $BEFORE_MIGRATION:.github --name-only 2>/dev/null

# Root config files
git ls-tree $BEFORE_MIGRATION | grep -E '\.(json|yaml|yml|toml|config\.)'

# Documentation
git show $BEFORE_MIGRATION:docs --name-only 2>/dev/null
```

### 4. Сравнение package.json

**A. Извлечь и сравнить scripts:**

```bash
# Scripts ДО миграции
git show $BEFORE_MIGRATION:package.json | jq -r '.scripts | keys[]' | sort > /tmp/scripts-before.txt

# Scripts ПОСЛЕ (в yandex-tracker)
cat packages/yandex-tracker/package.json | jq -r '.scripts | keys[]' | sort > /tmp/scripts-after.txt

# Потерянные scripts
comm -23 /tmp/scripts-before.txt /tmp/scripts-after.txt

# Детально показать удалённые scripts
for script in $(comm -23 /tmp/scripts-before.txt /tmp/scripts-after.txt); do
  echo "=== $script ==="
  git show $BEFORE_MIGRATION:package.json | jq -r ".scripts[\"$script\"]"
done
```

**B. Сравнить dependencies:**

```bash
# Dependencies ДО
git show $BEFORE_MIGRATION:package.json | jq -r '.dependencies // {} | keys[]' | sort > /tmp/deps-before.txt

# Dependencies ПОСЛЕ (суммарно по всем пакетам)
cat packages/*/package.json | jq -r '.dependencies // {} | keys[]' | sort -u > /tmp/deps-after.txt

# Потерянные зависимости
comm -23 /tmp/deps-before.txt /tmp/deps-after.txt
```

**C. Сравнить bin entries:**

```bash
# Bin entries ДО
git show $BEFORE_MIGRATION:package.json | jq -r '.bin // {} | keys[]'

# Bin entries ПОСЛЕ
cat packages/yandex-tracker/package.json | jq -r '.bin // {} | keys[]'
```

### 5. Проверка конфигурационных файлов

```bash
# Список config файлов ДО миграции
git ls-tree $BEFORE_MIGRATION | grep -E '\.(config|rc)\.(js|json|ts|yaml|yml|toml)$'

# Проверить каждый найденный конфиг:
# - Существует ли в новой структуре?
# - Перенесён ли в packages/*/
# - Или был намеренно удалён?

# Важные конфиги для проверки:
git show $BEFORE_MIGRATION:.eslintrc.json 2>/dev/null
git show $BEFORE_MIGRATION:.prettierrc 2>/dev/null
git show $BEFORE_MIGRATION:tsconfig.json 2>/dev/null
git show $BEFORE_MIGRATION:.gitignore 2>/dev/null
git show $BEFORE_MIGRATION:.npmrc 2>/dev/null
```

### 6. Проверка GitHub Actions / CI

```bash
# Workflows ДО миграции
git show $BEFORE_MIGRATION:.github/workflows --name-only 2>/dev/null

# Workflows ПОСЛЕ
ls -la .github/workflows/

# Сравнить конфигурацию
for workflow in $(git show $BEFORE_MIGRATION:.github/workflows --name-only 2>/dev/null); do
  echo "=== $workflow ==="
  git show $BEFORE_MIGRATION:.github/workflows/$workflow | head -20
done
```

### 7. Поиск утилитных функций

```bash
# Найти все утилитные директории ДО миграции
git show $BEFORE_MIGRATION --name-only | grep -E '(utils|helpers|common|shared)/'

# Проверить, перенесены ли они в packages/
# Если нет - это потенциальная потеря функциональности
```

### 8. Проверка документации

```bash
# Документация ДО
git ls-tree -r $BEFORE_MIGRATION --name-only | grep -E '\.(md|txt)$' | sort > /tmp/docs-before.txt

# Документация ПОСЛЕ
git ls-tree -r HEAD --name-only | grep -E '\.(md|txt)$' | sort > /tmp/docs-after.txt

# Удалённая документация
comm -23 /tmp/docs-before.txt /tmp/docs-after.txt

# ВАЖНО: Проверить, была ли это полезная документация
# или просто перемещена в packages/*/
```

### 9. Анализ коммита с массовыми удалениями

```bash
# Детальный анализ коммита 88bf8aa
git show --stat 88bf8aa | head -100

# Все удалённые файлы в этом коммите
git diff --name-status 88bf8aa^ 88bf8aa | grep '^D'

# Категоризация удалений
git diff --name-status 88bf8aa^ 88bf8aa | grep '^D' | awk '{print $2}' | \
  while read file; do
    if echo "$file" | grep -q 'src/cli'; then
      echo "CLI: $file"
    elif echo "$file" | grep -q 'scripts'; then
      echo "SCRIPTS: $file"
    elif echo "$file" | grep -q 'test'; then
      echo "TESTS: $file"
    else
      echo "OTHER: $file"
    fi
  done | sort
```

### 10. Специфичные проверки функциональности

**A. CLI команды:**
```bash
# Все CLI-связанные файлы ДО миграции
git ls-tree -r $BEFORE_MIGRATION --name-only | grep -i cli

# Проверить, все ли восстановлены
```

**B. Build/development scripts:**
```bash
# Scripts директория ДО
git show $BEFORE_MIGRATION:scripts --name-only 2>/dev/null

# Scripts директория ПОСЛЕ
find packages/*/scripts -type f 2>/dev/null
```

**C. Database migrations (если были):**
```bash
git ls-tree -r $BEFORE_MIGRATION --name-only | grep -i 'migration\|schema'
```

**D. Fixtures/seeds (если были):**
```bash
git ls-tree -r $BEFORE_MIGRATION --name-only | grep -i 'fixture\|seed'
```

---

## 🔍 Критерии оценки

Для каждого найденного удалённого файла/функциональности определи:

1. **Статус:**
   - ✅ Перенесён в packages/* - OK
   - ✅ Намеренно удалён (устаревший) - OK
   - ⚠️ Заменён аналогом - Проверить качество замены
   - ❌ Потерян случайно - **ТРЕБУЕТ ВОССТАНОВЛЕНИЯ**

2. **Критичность:**
   - 🔴 Критическая (CLI tools, core functionality)
   - 🟡 Важная (scripts, utilities)
   - 🟢 Некритичная (документация, примеры)

3. **Действие:**
   - Восстановить из истории
   - Воссоздать с нуля
   - Игнорировать (если устарело)

---

## 📊 Отчёт

Создай markdown отчёт с разделами:

### 1. Executive Summary
- Сколько файлов проверено
- Сколько удалений найдено
- Сколько требует внимания

### 2. Критические находки
Список функциональности, которая требует немедленного восстановления

### 3. Некритические находки
Список для дальнейшего анализа

### 4. Подтверждённые OK
Список удалений, которые были намеренными

### 5. Рекомендации
Что делать дальше

---

## 🎯 Финальная валидация

После всех проверок выполни:

```bash
# Сравнить общее количество строк кода
git show $BEFORE_MIGRATION --shortstat
git show HEAD --shortstat

# Большая разница в минусе может указывать на потери

# Проверить все точки входа
git show $BEFORE_MIGRATION:package.json | jq -r '.main, .bin'
cat packages/yandex-tracker/package.json | jq -r '.main, .bin'

# Проверить экспорты
git show $BEFORE_MIGRATION:src/index.ts 2>/dev/null
cat packages/yandex-tracker/src/index.ts 2>/dev/null
```

---

## 💡 Примеры найденных проблем

**Уже найдено и исправлено:**
- ✅ CLI инструменты (src/cli/) - восстановлены в коммите 35752e7
- ✅ PROJECT_BASE_NAME не был экспортирован - исправлено

**Требует проверки:**
- ⏳ Scripts директория
- ⏳ Bin utilities
- ⏳ GitHub Actions конфигурация
- ⏳ Root-level утилиты
- ⏳ Дополнительные npm scripts

---

## 🚀 Начать аудит

Используй команды выше последовательно и создай полный отчёт о состоянии проекта после миграции.
