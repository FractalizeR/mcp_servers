# Краткое описание всех этапов

Детальные файлы для каждого этапа будут созданы по мере необходимости.
Этот файл содержит краткий обзор всех этапов плана.

---

## Этап 1: Простые инструменты (Sequential, ~1 час)

### 1.1 Comments (4 tools, ~15 мин)
**Файл:** `1.1_migrate_comments_sequential.md` ✅ Создан
- add-comment
- delete-comment
- edit-comment
- get-comments

### 1.2 Checklists (4 tools, ~15 мин)
- add-checklist-item
- delete-checklist-item
- get-checklist
- update-checklist-item

### 1.3 Worklog (4 tools, ~15 мин)
- add-worklog
- delete-worklog
- get-worklogs
- update-worklog

### 1.4 Components (4 tools, ~15 мин)
- create-component
- delete-component
- get-components
- update-component

### 1.5 Helpers/Ping (3 tools, ~10 мин)
- ping.tool.ts
- demo.tool.ts (helper)
- issue-url.tool.ts (helper)

**Итого этап 1:** 19 tools, ~1 час

---

## Этап 2: Средние инструменты (Parallel, ~1.5-2 часа → 0.5-0.7 часа)

### 2.1 Issues (9 tools, ~40 мин) [PARALLEL]
**Ветка:** `feature/migrate-issues`

Уже мигрировано (2):
- ✅ get-issues
- ✅ transition-issue (transitions/execute)

Осталось мигрировать (9):
- create-issue
- update-issue
- find-issues
- get-issue-changelog
- get-issue-transitions (transitions/get)
- create-link (links/create)
- delete-link (links/delete)
- get-issue-links (links/get)
- delete-attachment (attachments/delete)
- download-attachment (attachments/download)
- get-attachments (attachments/get)
- get-thumbnail (attachments/thumbnail)
- upload-attachment (attachments/upload)

**Примечание:** Attachments могут быть сложнее (upload/download), проверить тщательно.

### 2.2 Queues (6 tools, ~30 мин) [PARALLEL]
**Ветка:** `feature/migrate-queues`

- create-queue
- update-queue
- get-queue
- get-queues
- get-queue-fields
- manage-queue-access

**Примечание:** Эти инструменты были затронуты в original bug (4 из них имели schema-definition mismatch).

### 2.3 Projects (5 tools, ~25 мин) [PARALLEL]
**Ветка:** `feature/migrate-projects`

- create-project
- update-project
- delete-project
- get-project
- get-projects

**Итого этап 2:** 20 tools (9+6+5), ~0.5-0.7 часа при параллельной работе

---

## Этап 3: Сложные инструменты (Sequential, ~1 час)

### 3.1 Bulk-change (4 tools, ~1 час)

- bulk-move-issues (bulk-change/move)
- bulk-transition-issues (bulk-change/transition)
- bulk-update-issues (bulk-change/update)
- get-bulk-change-status (bulk-change/status)

**Сложность:** Эти инструменты могут иметь сложные schemas с union types, nested objects.
**Подход:** Тщательное тестирование после каждого, возможен fallback на ручной definition.

**Итого этап 3:** 4 tools, ~1 час

---

## Этап 4: Cleanup и финализация (Sequential, ~30 мин)

### 4.1 Удаление .definition.ts файлов (~15 мин)

**Цель:** Удалить все 49 файлов `*.definition.ts`

**Действия:**
1. Найти все `.definition.ts` файлы:
   ```bash
   find packages/servers/yandex-tracker/src/tools -name "*.definition.ts"
   ```

2. Удалить их:
   ```bash
   find packages/servers/yandex-tracker/src/tools -name "*.definition.ts" -delete
   ```

3. Удалить импорты definition в tool файлах

4. Убрать поле `private readonly definition = new ...`

5. Удалить метод `buildDefinition()` (breaking change!)

6. Запустить тесты: `npm test`

7. Коммит:
   ```bash
   git commit -m "refactor: remove deprecated definition files (49 files)

   All tools now use autogeneration via getParamsSchema().
   Manual definition files are no longer needed.

   BREAKING CHANGE: buildDefinition() method removed from BaseTool."
   ```

### 4.2 Финальная валидация (~15 мин)

**Действия:**
1. Полная валидация:
   ```bash
   npm run validate
   ```

2. Проверить все тесты:
   ```bash
   npm test
   ```
   Ожидаем: 2165/2165 passed

3. Проверить, что все 49 tools используют автогенерацию:
   ```bash
   grep -r "getParamsSchema" packages/servers/yandex-tracker/src/tools/api --include="*.tool.ts" | wc -l
   ```
   Ожидаем: 49

4. Убедиться, что .definition.ts файлов нет:
   ```bash
   find packages/servers/yandex-tracker/src/tools -name "*.definition.ts" | wc -l
   ```
   Ожидаем: 0

5. Создать финальный отчет: `MIGRATION_REPORT.md`

6. Обновить статус плана в `README.md`

7. Финальный коммит:
   ```bash
   git commit -m "docs: complete full tool migration plan

   All 49 tools migrated to autogeneration.
   49 definition files removed.

   Migration summary:
   - Simple tools: 19 (comments, checklists, worklog, components, helpers)
   - Medium tools: 20 (issues, queues, projects)
   - Complex tools: 4 (bulk-change)
   - Cleanup: definition files removed

   Result: 100% tools use getParamsSchema() for definition autogeneration."
   ```

8. Пуш изменений

**Итого этап 4:** ~30 мин

---

## 📊 Итоговые метрики

**До миграции:**
- Инструментов с автогенерацией: 2/49 (4%)
- Файлов `.definition.ts`: 49

**После миграции:**
- Инструментов с автогенерацией: 49/49 (100%)
- Файлов `.definition.ts`: 0

**Выигрыш:**
- 49 файлов меньше
- Физически невозможен schema-definition mismatch
- Упрощение создания новых tools
- DRY principle соблюден

---

## 🎯 Общая стратегия

1. **Этап 1 (Sequential):** Простые инструменты, минимальный риск
2. **Этап 2 (Parallel):** Средние инструменты, ускорение через параллелизм
3. **Этап 3 (Sequential):** Сложные инструменты, требуют внимания
4. **Этап 4 (Sequential):** Cleanup, финальная проверка

**Общее время:** 3-3.5 часа (оптимальный подход)

**Риски:** Минимальные, т.к. infrastructure уже готова и протестирована на 2 tools.
