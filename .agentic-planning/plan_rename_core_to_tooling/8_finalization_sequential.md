# Этап 8: Финализация (SEQUENTIAL)

**Execution Type:** Sequential
**Зависимости:** Этап 7 завершен успешно
**Можно начинать:** После успешного завершения этапа 7
**Ожидаемое время:** 20 минут

---

## 🎯 Цель этапа

Финализировать переименование: обновить версии, создать CHANGELOG entries, создать коммит, push в репозиторий.

---

## ✅ Чек-лист выполнения

### 8.1 Обновление версий пакетов

**Правило:** Переименование пакета = breaking change = major version bump.

- [ ] Обновить версию tooling пакета: `0.1.0` → `1.0.0`
- [ ] Обновить версии зависимых пакетов (minor bump)

**Файлы для обновления:**

1. **packages/framework/tooling/package.json:**
   ```json
   {
     "version": "1.0.0"  // было: 0.1.0
   }
   ```

2. **packages/framework/search/package.json:**
   ```json
   {
     "version": "0.2.0"  // было: 0.1.0 (minor bump из-за обновления dependency)
   }
   ```

3. **packages/servers/yandex-tracker/package.json:**
   ```json
   {
     "version": "0.2.0"  // было: 0.1.0 (minor bump из-за обновления dependency)
   }
   ```

**Команды для обновления:**
```bash
cd packages/framework/tooling && npm version 1.0.0 --no-git-tag-version
cd ../search && npm version 0.2.0 --no-git-tag-version
cd ../../servers/yandex-tracker && npm version 0.2.0 --no-git-tag-version
```

### 8.2 Обновление CHANGELOG в tooling пакете

**Файл:** `packages/framework/tooling/CHANGELOG.md`

- [ ] Добавить запись о версии 1.0.0
- [ ] Описать breaking change
- [ ] Указать migration guide

**Добавить в начало файла:**
```markdown
# Changelog

## [1.0.0] - 2025-11-23

### BREAKING CHANGES

- **Package renamed:** `@mcp-framework/core` → `@mcp-framework/tooling`
  - The new name better reflects the package purpose (tools framework)
  - All imports must be updated from `@mcp-framework/core` to `@mcp-framework/tooling`

### Migration Guide

Update all imports in your code:

**Before:**
\`\`\`typescript
import { BaseTool, ToolRegistry } from '@mcp-framework/core';
\`\`\`

**After:**
\`\`\`typescript
import { BaseTool, ToolRegistry } from '@mcp-framework/tooling';
\`\`\`

Update package.json dependencies:

**Before:**
\`\`\`json
{
  "dependencies": {
    "@mcp-framework/core": "*"
  }
}
\`\`\`

**After:**
\`\`\`json
{
  "dependencies": {
    "@mcp-framework/tooling": "*"
  }
}
\`\`\`

### Internal Changes

- Directory renamed: `packages/framework/core` → `packages/framework/tooling`
- All documentation updated
- Dependency graph rules updated

---

## [0.1.0] - (previous date)

... (existing changelog entries)
```

### 8.3 Обновление CHANGELOG в search пакете

**Файл:** `packages/framework/search/CHANGELOG.md`

- [ ] Добавить запись о версии 0.2.0

**Добавить:**
```markdown
## [0.2.0] - 2025-11-23

### Changed

- Updated dependency: `@mcp-framework/core` → `@mcp-framework/tooling@1.0.0`
- Updated all imports to use new package name

---

## [0.1.0] - (previous date)

... (existing entries)
```

### 8.4 Обновление CHANGELOG в yandex-tracker пакете

**Файл:** `packages/servers/yandex-tracker/CHANGELOG.md`

- [ ] Добавить запись о версии 0.2.0

**Добавить:**
```markdown
## [0.2.0] - 2025-11-23

### Changed

- Updated dependency: `@mcp-framework/core` → `@mcp-framework/tooling@1.0.0`
- Updated all imports to use new package name

---

## [0.1.0] - (previous date)

... (existing entries)
```

### 8.5 Финальная валидация

- [ ] Запустить полную валидацию еще раз для уверенности

**Команды:**
```bash
npm run validate:quiet
```

**Ожидаемый результат:** Все проверки проходят.

### 8.6 Проверка git status

- [ ] Проверить список измененных файлов
- [ ] Убедиться что все ожидаемые файлы изменены

**Команды:**
```bash
git status
```

**Ожидаемые изменения:**
- Renamed: `packages/framework/core/` → `packages/framework/tooling/`
- Modified: множество package.json файлов
- Modified: множество .ts файлов (imports)
- Modified: множество .md файлов (documentation)
- Modified: конфигурационные файлы (.dependency-cruiser.cjs, tsconfig.json, etc)
- Modified: CHANGELOG.md файлы

### 8.7 Создание коммита

- [ ] Stage все изменения
- [ ] Создать descriptive commit message

**Commit message format:**
```
refactor(framework)!: переименовать @mcp-framework/core в @mcp-framework/tooling

BREAKING CHANGE: Пакет переименован для более точного отражения назначения

Изменения:
- Переименована директория: packages/framework/core → packages/framework/tooling
- Обновлены все импорты в зависимых пакетах (search, yandex-tracker)
- Обновлены package.json dependencies
- Обновлены конфигурационные файлы (depcruise, tsconfig, turbo)
- Обновлена вся документация (README, ARCHITECTURE, CLAUDE.md)

Версии:
- @mcp-framework/tooling: 0.1.0 → 1.0.0 (breaking change)
- @mcp-framework/search: 0.1.0 → 0.2.0 (dependency update)
- mcp-server-yandex-tracker: 0.1.0 → 0.2.0 (dependency update)

Migration guide: см. packages/framework/tooling/CHANGELOG.md

🤖 Generated with Claude Code
Co-Authored-By: Claude <noreply@anthropic.com>
```

**Команды:**
```bash
git add -A
git status  # финальная проверка перед коммитом

git commit -F - << 'EOF'
refactor(framework)!: переименовать @mcp-framework/core в @mcp-framework/tooling

BREAKING CHANGE: Пакет переименован для более точного отражения назначения

Изменения:
- Переименована директория: packages/framework/core → packages/framework/tooling
- Обновлены все импорты в зависимых пакетах (search, yandex-tracker)
- Обновлены package.json dependencies
- Обновлены конфигурационные файлы (depcruise, tsconfig, turbo)
- Обновлена вся документация (README, ARCHITECTURE, CLAUDE.md)

Версии:
- @mcp-framework/tooling: 0.1.0 → 1.0.0 (breaking change)
- @mcp-framework/search: 0.1.0 → 0.2.0 (dependency update)
- mcp-server-yandex-tracker: 0.1.0 → 0.2.0 (dependency update)

Migration guide: см. packages/framework/tooling/CHANGELOG.md

🤖 Generated with Claude Code
Co-Authored-By: Claude <noreply@anthropic.com>
EOF
```

### 8.8 Push в репозиторий

- [ ] Push коммита в текущую ветку
- [ ] Проверить что push успешен

**Команды:**
```bash
# Текущая ветка должна быть claude/analyze-framework-core-*
git branch --show-current

# Push с -u для установки upstream
git push -u origin $(git branch --show-current)
```

**Retry logic (согласно git development rules):**
- Если push не удался — retry до 4 раз с exponential backoff (2s, 4s, 8s, 16s)

**Пример с retry:**
```bash
for i in 1 2 3 4; do
  if git push -u origin $(git branch --show-current); then
    echo "✓ Push successful"
    break
  else
    if [ $i -lt 4 ]; then
      sleep $((2 ** i))
      echo "Retrying push (attempt $((i + 1))/4)..."
    else
      echo "✗ Push failed after 4 attempts"
      exit 1
    fi
  fi
done
```

### 8.9 Удаление backup тега

- [ ] Удалить backup тег (созданный в этапе 1)
- [ ] Backup больше не нужен после успешного коммита

**Команды:**
```bash
git tag -d backup-before-rename
```

### 8.10 Удаление плана

- [ ] Удалить директорию плана (успешно выполнен)

**Команды:**
```bash
rm -rf .agentic-planning/plan_rename_core_to_tooling
```

### 8.11 Финальная проверка

- [ ] Проверить что коммит создан
- [ ] Проверить что push успешен
- [ ] Проверить что план удален

**Команды:**
```bash
git log -1 --oneline
git status
ls .agentic-planning/ | grep plan_rename_core_to_tooling
```

**Ожидаемый результат:**
- Последний коммит содержит "refactor(framework)!: переименовать @mcp-framework/core"
- Working directory clean
- План удален (no output от ls)

---

## 📊 Критерии завершения этапа

- ✅ Версии обновлены (tooling: 1.0.0, search: 0.2.0, yandex-tracker: 0.2.0)
- ✅ CHANGELOG обновлены во всех пакетах
- ✅ Коммит создан с правильным форматом
- ✅ Push в репозиторий успешен
- ✅ Backup тег удален
- ✅ План удален
- ✅ Финальная валидация проходит

---

## 📋 Сводка по плану

### Выполнено:

1. ✅ **Подготовка** — валидация, backup
2. ✅ **Переименование структуры** — директория и package.json
3. ✅ **Обновление зависимостей** — package.json в других пакетах
4. ✅ **Обновление импортов** — search и yandex-tracker
5. ✅ **Обновление конфигурации** — depcruise, turbo, tsconfig
6. ✅ **Обновление документации** — все README и markdown файлы
7. ✅ **Валидация** — build, tests, lint, dependency graph
8. ✅ **Финализация** — версии, CHANGELOG, коммит, push

### Результат:

- **Переименован пакет:** `@mcp-framework/core` → `@mcp-framework/tooling`
- **Обновлено файлов:** ~350+ (imports, docs, configs)
- **Пройдена валидация:** build ✓, tests ✓, lint ✓, depcruise ✓
- **Создан коммит** с breaking change notation
- **Push в репозиторий** успешен

---

## 🎉 Следующие шаги для пользователя

1. **Создать Pull Request** (если требуется review)
2. **Или merge в main** (если есть права)
3. **Опубликовать в npm:** `npm publish` для всех обновленных пакетов

---

## 🚨 Важные замечания

1. Этот этап **ОБЯЗАТЕЛЬНО последний**
2. **НЕ выполнять** если этап 7 (валидация) не прошел успешно
3. После push в репозиторий **откат сложнее** — тщательно проверить перед финализацией
4. План должен быть удален только после успешного завершения всех этапов

---

## 🏁 План завершен!

Поздравляем! Переименование `@mcp-framework/core` → `@mcp-framework/tooling` успешно завершено.
