# ✅ Чек-лист миграции в monorepo

Используйте этот файл для отслеживания прогресса. Отмечайте задачи по мере выполнения.

---

## 📘 Фаза 1: Подготовка + Infrastructure + Core

### Шаг 1.1: Подготовка monorepo
- [ ] Созданы директории `packages/{infrastructure,core,search,cli,yandex-tracker}`
- [ ] Создан корневой `package.json` с workspaces
- [ ] Создан `tsconfig.base.json`
- [ ] Создан корневой `tsconfig.json` с references
- [ ] Выполнен `npm install`

### Шаг 1.2: @mcp-framework/infrastructure
- [ ] Скопирован код из `src/infrastructure/`
- [ ] Создан `packages/infrastructure/package.json`
- [ ] Создан `packages/infrastructure/tsconfig.json`
- [ ] Создан `src/index.ts` с экспортами
- [ ] Обновлены внутренние импорты (убраны @ алиасы)
- [ ] Выполнен `npm install` в пакете
- [ ] ✅ `npm run build` успешен
- [ ] ✅ `npm run test` успешен (или нет тестов)
- [ ] Есть скомпилированные файлы в `dist/`

### Шаг 1.3: @mcp-framework/core
- [ ] Скопирован код (`tools/base`, `tools/common`, `utils`, `tool-registry.ts`, `types.ts`)
- [ ] Создан `packages/core/package.json`
- [ ] Создан `packages/core/tsconfig.json` с reference на infrastructure
- [ ] Создан `src/index.ts` с экспортами
- [ ] ⚠️ **КРИТИЧЕСКОЕ:** `BaseTool` сделан generic (`BaseTool<TFacade>`)
- [ ] Удалены все импорты `@tracker_api`
- [ ] Обновлены внутренние импорты
- [ ] Выполнен `npm install`
- [ ] ✅ `npm run build` успешен
- [ ] ✅ `npm run test` успешен
- [ ] Нет ошибок типизации

### Проверка Фазы 1
- [ ] `npm run build --workspaces` успешен (для infrastructure и core)
- [ ] `npm run test --workspaces` успешен
- [ ] Commit: "phase-1: setup monorepo + infrastructure + core"

---

## 📗 Фаза 2: Search + CLI + Yandex-Tracker (ПАРАЛЛЕЛЬНО)

### Задача 2A: @mcp-framework/search (Терминал 1)
- [ ] Скопирован код (`src/mcp/search/`, `tools/helpers/search/`)
- [ ] Скопирован `scripts/generate-tool-index.ts`
- [ ] Создан `packages/search/package.json` с зависимостью от `@mcp-framework/core`
- [ ] Создан `packages/search/tsconfig.json` с reference на core
- [ ] Создан `src/index.ts`
- [ ] Обновлены импорты (core, tool-registry)
- [ ] Обновлен скрипт генерации индекса (пути к TOOL_CLASSES)
- [ ] Добавлен `prebuild` скрипт для генерации индекса
- [ ] Выполнен `npm install`
- [ ] ✅ `npm run build` успешен (с prebuild)
- [ ] ✅ `npm run test` успешен
- [ ] Индекс генерируется автоматически

### Задача 2B: @mcp-framework/cli (Терминал 2)
- [ ] Скопирован код из `src/cli/`
- [ ] Создан `packages/cli/package.json` (без framework зависимостей)
- [ ] Создан `packages/cli/tsconfig.json`
- [ ] Создан `src/index.ts`
- [ ] ⚠️ **КРИТИЧЕСКОЕ:** Constants вынесены в параметры (configurable)
- [ ] Удалены зависимости от `src/constants.ts`
- [ ] Shebang добавлен в `bin/mcp-connect.ts`
- [ ] Выполнен `npm install`
- [ ] ✅ `npm run build` успешен
- [ ] Shebang в `dist/bin/mcp-connect.js` (executable)
- [ ] ✅ `npm run test` успешен

### Задача 2C: mcp-server-yandex-tracker (Терминал 3)
- [ ] Скопирован код (`tracker_api/`, `tools/api/`, `tools/helpers/`, `composition-root/`, `index.ts`, `constants.ts`)
- [ ] Удалена `tools/helpers/search` (теперь в @mcp-framework/search)
- [ ] Создан `packages/yandex-tracker/package.json` с зависимостями от framework пакетов
- [ ] Создан `packages/yandex-tracker/tsconfig.json` с references
- [ ] Обновлены ВСЕ импорты:
  - [ ] `@infrastructure/*` → `@mcp-framework/infrastructure`
  - [ ] `@mcp/tools/base/*` → `@mcp-framework/core`
  - [ ] `@mcp/tools/common/*` → `@mcp-framework/core`
  - [ ] `@mcp/utils/*` → `@mcp-framework/core`
  - [ ] `@types` → `@mcp-framework/core/types`
  - [ ] `@mcp/search/*` → `@mcp-framework/search`
  - [ ] `@mcp/tool-registry` → `@mcp-framework/core`
- [ ] В tools: `extends BaseTool` → `extends BaseTool<YandexTrackerFacade>`
- [ ] Выполнен `npm install`
- [ ] ⚠️ Сборка НЕ требуется (будет в Фазе 3)

### Синхронизация после Фазы 2
- [ ] Выполнен `npm install` в корне (обновить workspaces)
- [ ] `npm run build --workspace=@mcp-framework/search` успешен
- [ ] `npm run build --workspace=@mcp-framework/cli` успешен
- [ ] Commit: "phase-2: add search, cli, and yandex-tracker structure"

---

## 📕 Фаза 3: Интеграция + Тесты + Публикация

### Шаг 3.1: Сборка yandex-tracker
- [ ] `npm install` в корне (обновить links)
- [ ] `npm run build` для всех пакетов (topological order)
- [ ] ✅ `packages/yandex-tracker/dist/index.js` существует
- [ ] Нет import ошибок при запуске
- [ ] Исправлены все ошибки компиляции

### Шаг 3.2: Настройка тестов
- [x] Тесты перемещены в правильные пакеты:
  - [x] infrastructure tests
  - [x] core tests
  - [x] search tests
  - [x] cli tests (нет тестов)
  - [x] yandex-tracker tests
- [x] Импорты в тестах обновлены на `@mcp-framework/*`
- [x] Создан `vitest.config.ts` для каждого пакета
- [x] ✅ `npm run test --workspaces` успешен (684 теста)
- [x] Coverage ≥80% (core: 98%, infra: 93%, search: 96%, tracker: 99%)

### Шаг 3.3: Адаптация скриптов валидации
- [x] Переместить `validate-tool-registration.ts` в `packages/yandex-tracker/scripts/`
- [x] Переместить `smoke-test-server.ts` в `packages/yandex-tracker/scripts/`
- [x] Обновить пути в скриптах для monorepo структуры
- [x] Добавить `validate:tools` скрипт в `packages/yandex-tracker/package.json`
- [x] ✅ `npm run validate:tools` работает (10 tools, 8 operations)
- [x] Удалить старые скрипты из корневой `scripts/`

### Шаг 3.4: Валидация архитектуры
- [x] `.dependency-cruiser.cjs` обновлён для monorepo
- [x] ✅ `npm run depcruise` проходит без ошибок (4 warnings, 0 errors)
- [x] Smoke test создан/обновлён
- [ ] ✅ Smoke test работает (будет протестирован после сборки в шаге 3.1)

### Шаг 3.5: Обновление документации
- [x] Корневой `README.md` обновлён (структура monorepo)
- [x] Создан `packages/infrastructure/README.md`
- [x] Создан `packages/core/README.md`
- [x] Создан `packages/search/README.md`
- [x] Обновлён `packages/yandex-tracker/README.md` (cli не было в monorepo)
- [x] Обновлён корневой `CLAUDE.md` (упрощён для monorepo, ~267 строк)
- [x] Создан `packages/yandex-tracker/CLAUDE.md` (~232 строки)
- [x] Обновлён `ARCHITECTURE.md` (схема monorepo, 564 строки)
- [x] Создан `MIGRATION.md` (гайд для пользователей v1)
- [x] Создан `CHANGELOG.md` для всех пакетов (infrastructure, core, search, yandex-tracker)

### Шаг 3.6: Подготовка к публикации
- [x] Создан `.npmignore` для всех пакетов
- [x] `publishConfig` проверен во всех `package.json` (добавлен в yandex-tracker)
- [x] `files` поле добавлено во все package.json
- [x] Обновлён `.github/workflows/ci.yml` для monorepo
- [x] Создан `.github/workflows/publish.yml`
- [x] Установлен `@changesets/cli`
- [x] Выполнен `npx changeset init`
- [x] ✅ `npm pack --dry-run` успешен для всех пакетов
- [x] Размеры пакетов адекватны (infrastructure: 47kB, core: 41kB, search: 47kB, yandex-tracker: 127kB)

### Шаг 3.7: Финальная валидация
- [ ] Полная очистка: `npm run clean && rm -rf node_modules packages/*/node_modules`
- [ ] Свежая установка: `npm install`
- [ ] Полная сборка: `npm run build`
- [ ] ✅ `npm run validate` проходит (lint + typecheck + test + depcruise)
- [ ] ✅ Smoke test работает
- [ ] ✅ CLI работает (`mcp-connect --help`)
- [ ] Нет duplicate dependencies
- [ ] Commit: "phase-3: complete monorepo migration"

---

## 🚀 Публикация (после мержа)

- [ ] PR создан и смержен в main
- [ ] `git checkout main && git pull`
- [ ] Создан changeset: `npx changeset add`
- [ ] Version bump: `npx changeset version`
- [ ] Commit + push
- [ ] Git tag: `git tag v1.0.0 && git push --tags`
- [ ] GitHub Actions опубликовал пакеты (или вручную `npm publish --workspaces`)
- [ ] Пакеты доступны на npmjs.com:
  - [ ] https://npmjs.com/package/@mcp-framework/infrastructure
  - [ ] https://npmjs.com/package/@mcp-framework/core
  - [ ] https://npmjs.com/package/@mcp-framework/search
  - [ ] https://npmjs.com/package/@mcp-framework/cli
  - [ ] https://npmjs.com/package/mcp-server-yandex-tracker

---

## 📊 Статистика прогресса

**Фаза 1:** ⬜⬜⬜⬜⬜⬜⬜⬜⬜⬜ 0/10 шагов

**Фаза 2:** ⬜⬜⬜⬜⬜⬜⬜⬜⬜⬜ 0/10 шагов

**Фаза 3:** ⬜⬜⬜⬜⬜⬜⬜⬜⬜⬜ 0/10 шагов

**Публикация:** ⬜⬜⬜⬜⬜ 0/5 шагов

**ИТОГО:** 0/35 шагов (0%)

---

## 📝 Заметки

Используйте это пространство для заметок в процессе миграции:

```
[Дата] [Заметка]

Пример:
2025-11-16 14:30 - Нашёл проблему с импортами в search, исправил через sed
2025-11-16 15:00 - Все тесты core проходят
```
