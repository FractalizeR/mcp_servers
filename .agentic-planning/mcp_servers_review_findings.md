# Ревью MCP серверов - Список находок

**Дата:** 2025-12-09 (обновлено)
**Эталон:** yandex-tracker (наиболее зрелый сервер, версия 0.1.0)

---

## ⚠️ КРИТИЧЕСКИЕ МЕТРИКИ ПОКРЫТИЯ

| Сервер | Lines | Functions | Branches | Statements | Статус |
|--------|-------|-----------|----------|------------|--------|
| yandex-tracker | 85.97% | 83.53% | 83.37% | 86.29% | ❌ НЕ ДОСТИГАЕТ порогов! |
| yandex-wiki | 51.09% | 56.2% | 16.6% | 51.44% | ❌ КРИТИЧНО |
| ticktick | 37.15% | 43.5% | 9.4% | 35.91% | ❌ КРИТИЧНО |

**Требуемые пороги:** Lines 90%, Functions 90%, Branches 85%, Statements 90%

**Главный вывод:** Даже эталонный сервер yandex-tracker не достигает заявленных порогов покрытия!

---

## Сводная таблица сравнения

| Критерий | Yandex Tracker | Yandex Wiki | TickTick |
|----------|----------------|-------------|----------|
| **Версия** | 0.1.0 | 0.1.0 | 0.1.0 |
| **Кол-во тестов** | 152 файла | 11 файлов | 6 файлов |
| **Smoke тесты** | 5 тестов | 1 тест | 2 теста |
| **DI validation.ts** | Есть | Есть | Есть |
| **Facade Services** | Есть (14 сервисов) | Есть (3 сервиса) | НЕТ |
| **ResponseFieldFilter** | Частичное | Есть (базовое) | Есть |
| **Batch операции** | Есть | Есть (конфиг) | Есть |
| **eslint.config.js** | Есть | Есть | Есть |
| **cpd скрипт** | Есть | Есть | Есть |
| **depcruise скрипт** | Есть | Есть | Есть |
| **validate:docs** | Есть | Есть | Есть |
| **CLI папка** | src/cli/ | src/cli/ | src/cli/ |
| **build:bundle** | tsup | tsup | tsup |
| **ServerConfig** | Плоская структура | Плоская структура | Вложенная структура |

---

## Детальный анализ Smoke тестов

| Smoke тест | yandex-tracker | yandex-wiki | ticktick |
|------------|----------------|-------------|----------|
| mcp-server-lifecycle.smoke.test.ts | ✅ | ✅ | ✅ |
| di-container.smoke.test.ts | ✅ | ❌ | ✅ |
| definition-generation.smoke.test.ts | ✅ | ❌ | ❌ |
| e2e-tool-execution.smoke.test.ts | ✅ | ❌ | ❌ |
| tool-search.smoke.test.ts | ✅ | ❌ | ❌ |
| smoke-test-server.ts (script) | ✅ | ✅ | ✅ |

**Вывод:** yandex-wiki и ticktick отсутствуют 3-4 критических smoke теста.

---

## Отсутствующие скрипты/утилиты

| Файл | yandex-tracker | yandex-wiki | ticktick | Назначение |
|------|----------------|-------------|----------|------------|
| scripts/generate-tool-index.ts | ✅ | ❌ | ❌ | Автогенерация индекса tools |
| scripts/validate-tool-registration.ts | ✅ | ❌ | ❌ | Проверка регистрации tools |
| tests/helpers/schema-definition-matcher.ts | ✅ | ❌ | ❌ | Валидация схем в тестах |

---

## 1. Yandex Tracker (ЭТАЛОН)

### Структура
- [x] 57 directories, 72 files в src/
- [x] Полная структура: cli/, common/, composition-root/, config/, tools/, tracker_api/
- [x] README.md в каждом модуле
- [x] generated-index.ts для автоматической регистрации tools
- [x] facade/services/ - 14 доменных сервисов

### Архитектура
- [x] Service-based Facade architecture
- [x] Операции инжектятся в Services через @inject()
- [x] Facade делегирует вызовы сервисам
- [x] Четкое разделение ответственности

### DI (Dependency Injection)
- [x] validateDIRegistrations() перед созданием контейнера
- [x] bindFacadeServices() - отдельный слой сервисов
- [x] Двойная регистрация операций (Symbol + Class based)
- [x] Логирование зарегистрированных символов

### Тесты
- [x] 152 тестовых файла (обновлено)
- [x] Папки: composition-root/, helpers/, integration/, mcp/, smoke/, tools/, tracker_api/, unit/, workflows/
- [x] 5 smoke тестов: definition-generation, di-container, e2e-tool-execution, mcp-server-lifecycle, tool-search
- [x] Mock factories и fixtures
- [x] tests/README.md документация
- [ ] ❌ **Покрытие НЕ достигает порогов!** (85.97% lines vs 90% required)

### Использование фреймворка
- [x] @mcp-framework/core: BaseTool, ToolRegistry, ResponseFieldFilter
- [x] @mcp-framework/infrastructure: Logger, HttpClient, CacheManager, RetryStrategy
- [x] @mcp-framework/search: ToolSearchEngine, SearchToolsTool, все стратегии
- [x] @mcp-framework/cli: CLI utilities

### Многопоточность / параллелизм
- [x] maxBatchSize, maxConcurrentRequests в конфигурации
- [x] BatchIssueResult, BatchChangelogResult в services
- [x] Promise.all в операциях для параллельных запросов
- [x] Batch операции для issues, changelog, attachments, checklists

### Фильтрация выходных данных
- [x] ResponseFieldFilter используется в tools
- [x] Не 100% покрытие (упомянуто в CLAUDE.md как правило)
- [x] fields параметр в схемах

### Прочее
- [x] CLAUDE.md ~400 строк (детальный)
- [x] eslint.config.js присутствует
- [x] cpd, depcruise, validate:docs скрипты
- [x] build:bundle через tsup
- [x] smoke-test-server.ts скрипт

---

## 2. Yandex Wiki

### Структура
- [x] 26 directories, 37 files в src/
- [x] Аналогичная структура к Yandex Tracker
- [x] README.md в cli/ и других модулях ✅ ДОБАВЛЕНО
- [ ] НЕТ generated-index.ts
- [x] server.ts - отдельный файл сервера

### Архитектура
- [x] Service-based Facade architecture (3 сервиса: PageService, GridService, ResourceService)
- [x] Операции инжектятся через @inject()
- [x] Facade делегирует вызовы сервисам

### DI (Dependency Injection)
- [x] validateDIRegistrations() есть
- [x] bindFacadeServices() есть
- [ ] Операции получают меньше параметров (нет configInstance в factory)
- [x] Логирование зарегистрированных символов

### Тесты
- [ ] КРИТИЧНО: Только 11 тестовых файлов (14x меньше чем у эталона!)
- [ ] Покрытие: 51.09% lines (vs 90% required) - КРИТИЧНО!
- [ ] Только: helpers/, smoke/ (1 файл), unit/
- [ ] Только 1 smoke тест (mcp-server-lifecycle)
- [ ] НЕТ integration/, workflows/, mcp/, tools/ тестов
- [ ] НЕТ di-container, definition-generation, e2e-tool-execution, tool-search smoke тестов

### Использование фреймворка
- [x] @mcp-framework/core: BaseTool, ToolRegistry
- [x] ResponseFieldFilter - базовая инфраструктура добавлена ✅
- [x] @mcp-framework/infrastructure: Logger, HttpClient, CacheManager
- [x] @mcp-framework/search: ToolSearchEngine

### Многопоточность / параллелизм
- [x] maxBatchSize, maxConcurrentRequests в конфигурации ✅ ДОБАВЛЕНО
- [ ] НЕТ batch операций вообще!
- [ ] Нет Promise.all для параллельных запросов

### Фильтрация выходных данных
- [x] ResponseFieldFilter - базовая инфраструктура (filter-fields.ts, schemas) ✅ ДОБАВЛЕНО
- [x] fields параметр в ResponseFieldsSchema

### Прочее
- [ ] CLAUDE.md ~114 строк (базовый, намного меньше эталона)
- [x] eslint.config.js ✅ ДОБАВЛЕНО
- [x] cpd, depcruise скрипты ✅ ДОБАВЛЕНО
- [x] validate:docs скрипт ✅ ДОБАВЛЕНО
- [x] build:bundle через tsup
- [x] smoke-test-server.ts скрипт

---

## 3. TickTick

### Структура
- [x] 34 directories, 41 files в src/
- [x] src/cli/ структура с types.ts, prompts.ts, bin/mcp-connect.ts ✅ ДОБАВЛЕНО
- [ ] НЕТ facade/services/ (facade напрямую вызывает операции)
- [x] ticktick_api/auth/ - OAuth авторизация
- [x] ticktick_api/http/ - AuthenticatedHttpClient
- [x] tools/shared/ - общие утилиты (filter-fields.ts)
- [x] tools/tasks/ - отдельная папка для task tools

### Архитектура
- [ ] ОТЛИЧАЕТСЯ: Facade напрямую вызывает операции (без Services)
- [ ] ОТЛИЧАЕТСЯ: Инъекция операций через TYPES.* символы вместо классов
- [x] Много convenience методов в Facade (getTasksDueToday, getOverdueTasks, etc.)
- [x] batchCreateTasks - batch создание задач (последовательное, не параллельное)

### DI (Dependency Injection)
- [x] validation.ts с validateDIRegistrations() ✅ ДОБАВЛЕНО
- [ ] НЕТ bindFacadeServices() (нет сервисов)
- [ ] ОТЛИЧАЕТСЯ: OPERATION_DEFINITIONS вместо OPERATION_CLASSES
- [x] bindOAuthLayer() - дополнительный слой для OAuth
- [x] reflect-metadata импортируется напрямую в container.ts

### Тесты
- [ ] КРИТИЧНО: 6 тестовых файлов (vs 152 у эталона)
- [ ] Покрытие: 37.15% lines (vs 90% required) - КРИТИЧНО!
- [x] smoke/, unit/auth, unit/ticktick_api/api_operations/tasks
- [x] 2 smoke теста: di-container, mcp-server-lifecycle
- [x] helpers/ с mock factories ✅ ДОБАВЛЕНО
- [ ] НЕТ integration/, workflows/, tools/ тестов
- [ ] НЕТ definition-generation, e2e-tool-execution, tool-search smoke тестов

### Использование фреймворка
- [x] @mcp-framework/core: BaseTool, ToolRegistry, ResponseFieldFilter, BatchResultProcessor
- [x] @mcp-framework/infrastructure: Logger, RetryStrategy, CacheManager
- [x] @mcp-framework/search: ToolSearchEngine
- [ ] НЕ использует AxiosHttpClient из infrastructure (свой AuthenticatedHttpClient)

### Многопоточность / параллелизм
- [x] maxBatchSize, maxConcurrentRequests в BatchConfig
- [x] GetTasksOperation с batch поддержкой
- [ ] batchCreateTasks - ПОСЛЕДОВАТЕЛЬНЫЙ, не параллельный!
- [ ] Нет настоящего параллелизма через Promise.all

### Фильтрация выходных данных
- [x] filterFields.ts утилита с ResponseFieldFilter
- [x] filterFieldsArray для массивов
- [x] Используется в tools

### Прочее
- [ ] CLAUDE.md ~200 строк (средний)
- [x] eslint.config.js ✅ ДОБАВЛЕНО
- [x] cpd, depcruise скрипты есть
- [x] validate:docs скрипт ✅ ДОБАВЛЕНО
- [x] build:bundle через tsup ✅ ДОБАВЛЕНО
- [ ] ОТЛИЧАЕТСЯ: test:smoke через vitest (не через scripts/)
- [ ] ОТЛИЧАЕТСЯ: Вложенная структура ServerConfig (oauth, api, batch, retry, cache, tools, logging)

---

## Критические проблемы (по приоритету)

### P0 - Критические (блокирующие)

1. **Тестовое покрытие ВО ВСЕХ СЕРВЕРАХ** ❌
   - Yandex Tracker: 85.97% lines (vs 90% required) - НЕ ДОСТИГАЕТ!
   - Yandex Wiki: 51.09% lines (vs 90% required) - КРИТИЧНО!
   - TickTick: 37.15% lines (vs 90% required) - КРИТИЧНО!
   - **Требуется:** Либо снизить пороги, либо добавить тесты

2. **Отсутствие обязательных smoke тестов (Wiki, TickTick)**
   - di-container.smoke.test.ts (нет в Wiki)
   - definition-generation.smoke.test.ts (нет в Wiki, TickTick)
   - e2e-tool-execution.smoke.test.ts (нет в Wiki, TickTick)
   - tool-search.smoke.test.ts (нет в Wiki, TickTick)
   - **Требуется:** Скопировать и адаптировать из yandex-tracker

3. **~~Отсутствие eslint.config.js в Wiki и TickTick~~** ✅ ВЫПОЛНЕНО

### P1 - Высокий приоритет

4. **Отсутствие служебных скриптов (Wiki, TickTick)**
   - generate-tool-index.ts - автогенерация индекса tools
   - validate-tool-registration.ts - проверка регистрации
   - schema-definition-matcher.ts - валидация схем в тестах

5. **~~Отсутствие ResponseFieldFilter в Yandex Wiki~~** ✅ ВЫПОЛНЕНО

6. **~~Отсутствие validation.ts в TickTick~~** ✅ ВЫПОЛНЕНО

7. **Отсутствие batch операций в Yandex Wiki**
   - Нет maxBatchSize, maxConcurrentRequests
   - Нет параллельных запросов
   - Требуется: добавить batch конфигурацию и операции

### P2 - Средний приоритет

8. **Архитектурное расхождение TickTick**
   - Facade напрямую вызывает операции (без Services)
   - Инъекция через TYPES.* вместо классов
   - Рекомендация: добавить Services слой для консистентности

9. **~~Отсутствие CLI папки в TickTick~~** ✅ ИСПРАВЛЕНО

10. **~~Отсутствие build:bundle в TickTick~~** ✅ ИСПРАВЛЕНО

### P3 - Низкий приоритет

11. **Разная структура ServerConfig в TickTick**
    - Вложенная структура vs плоская
    - Рекомендация: унифицировать с остальными серверами

12. **~~Отсутствие README.md в модулях Wiki~~** ✅ ИСПРАВЛЕНО

13. **Разный подход к smoke тестам**
    - Yandex Tracker/Wiki: через scripts/smoke-test-server.ts
    - TickTick: через vitest в tests/smoke/
    - Рекомендация: унифицировать подход

---

## План исправлений

### Фаза 1: Критические исправления (P0)

1. **Исправить тестовое покрытие** ⏳ ТРЕБУЕТСЯ
   - [ ] Yandex Tracker: добавить тесты для facade/services (project, attachment, worklog)
   - [ ] Yandex Wiki: добавить unit тесты для всех tools и operations
   - [ ] TickTick: добавить unit тесты для всех tools и operations
   - [ ] Альтернатива: снизить пороги до реалистичных значений

2. **Добавить smoke тесты** ⏳ ТРЕБУЕТСЯ
   - [ ] Wiki: добавить di-container, definition-generation, e2e-tool-execution, tool-search
   - [ ] TickTick: добавить definition-generation, e2e-tool-execution, tool-search

3. **~~Добавить eslint.config.js в Yandex Wiki и TickTick~~** ✅ ВЫПОЛНЕНО

### Фаза 2: Высокий приоритет (P1)

4. **Добавить служебные скрипты** ⏳ ТРЕБУЕТСЯ
   - [ ] Wiki: generate-tool-index.ts, validate-tool-registration.ts
   - [ ] TickTick: generate-tool-index.ts, validate-tool-registration.ts
   - [ ] Оба: schema-definition-matcher.ts в tests/helpers/

5. **~~Добавить ResponseFieldFilter в Yandex Wiki~~** ✅ ВЫПОЛНЕНО

6. **~~Добавить validation.ts в TickTick~~** ✅ ВЫПОЛНЕНО

7. **Добавить batch конфигурацию в Yandex Wiki** ✅ ЧАСТИЧНО ВЫПОЛНЕНО
   - [x] Добавить maxBatchSize, maxConcurrentRequests в config
   - [ ] Реализовать batch операции для pages и grids (требует отдельной задачи)

### Фаза 3: Средний приоритет (P2)

8. **Рефакторинг архитектуры TickTick** ⏳ ОТЛОЖЕНО (значительный рефакторинг)
   - [ ] Добавить Services слой между Facade и Operations
   - [ ] Изменить инъекцию на class-based

9. **~~Структурные изменения TickTick~~** ✅ ВЫПОЛНЕНО

### Фаза 4: Низкий приоритет (P3)

10. **Унификация конфигурации и документации** ✅ ЧАСТИЧНО ВЫПОЛНЕНО
    - [ ] Унифицировать ServerConfig структуру (отложено)
    - [x] Добавить README.md в модули Wiki
    - [ ] Унифицировать подход к smoke тестам (отложено)

---

## Прогресс выполнения

| Задача | Статус |
|--------|--------|
| eslint.config.js (Wiki) | ✅ |
| eslint.config.js (TickTick) | ✅ |
| validation.ts (TickTick) | ✅ |
| ResponseFieldFilter (Wiki) | ✅ (базовая инфраструктура) |
| Batch конфигурация (Wiki) | ✅ |
| CLI структура (TickTick) | ✅ |
| build:bundle (TickTick) | ✅ |
| cpd/depcruise скрипты (Wiki) | ✅ |
| validate:docs (Wiki, TickTick) | ✅ |
| README.md в модулях (Wiki) | ✅ |
| Unit тесты для operations | ✅ (базовые) |
| **Достижение порогов покрытия** | ❌ ВО ВСЕХ СЕРВЕРАХ |
| **Полный набор smoke тестов** | ❌ (Wiki, TickTick) |
| **Служебные скрипты** | ❌ (Wiki, TickTick) |
| Services слой (TickTick) | ⏳ ОТЛОЖЕНО (P2) |
| ServerConfig унификация | ⏳ ОТЛОЖЕНО (P3) |

---

## Выводы

**Yandex Tracker** является эталоном, но требует улучшения:
- ❌ Тестовое покрытие не достигает порогов (85.97% vs 90%)
- ✅ Полная структура, smoke тесты, служебные скрипты

**Yandex Wiki** (0.1.0) — после ревью значительно улучшен:
- ✅ eslint, cpd, depcruise, validate:docs
- ✅ ResponseFieldFilter инфраструктура
- ✅ Batch конфигурация
- ✅ README.md во всех модулях
- ❌ Критически низкое покрытие (51.09%)
- ❌ Отсутствуют 4 smoke теста
- ❌ Отсутствуют служебные скрипты

**TickTick** (0.1.0) — после ревью унифицирован:
- ✅ eslint, validation.ts, CLI структура, build:bundle
- ✅ Базовые unit тесты и helpers
- ❌ Критически низкое покрытие (37.15%)
- ❌ Отсутствуют 3 smoke теста
- ❌ Отсутствуют служебные скрипты
- ⏳ Требуется: Services слой (P2)

**Дата обновления ревью:** 2025-12-09
