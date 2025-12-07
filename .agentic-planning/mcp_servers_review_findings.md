# Ревью MCP серверов - Список находок

**Дата:** 2025-12-07
**Эталон:** yandex-tracker (наиболее зрелый сервер, версия 4.0.0)

---

## Сводная таблица сравнения

| Критерий | Yandex Tracker | Yandex Wiki | TickTick |
|----------|----------------|-------------|----------|
| **Версия** | 4.0.0 | 0.1.0 | 0.1.0 |
| **Кол-во тестов** | 149 файлов | 11 файлов | 6 файлов |
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
- [x] 149 тестовых файлов
- [x] Папки: composition-root/, helpers/, integration/, mcp/, smoke/, tools/, tracker_api/, unit/, workflows/
- [x] 5 smoke тестов: definition-generation, di-container, e2e-tool-execution, mcp-server-lifecycle, tool-search
- [x] Mock factories и fixtures
- [x] tests/README.md документация

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
- [ ] КРИТИЧНО: Только 7 тестовых файлов (21x меньше чем у эталона!)
- [ ] Только: helpers/, smoke/ (1 файл), unit/
- [ ] Только 1 smoke тест (mcp-server-lifecycle)
- [ ] НЕТ integration/, workflows/, mcp/, tools/ тестов

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
- [ ] КРИТИЧНО: 4 тестовых файла (vs 149 у эталона)
- [x] smoke/, unit/auth, unit/ticktick_api/api_operations/tasks
- [x] 2 smoke теста: di-container, mcp-server-lifecycle
- [x] helpers/ с mock factories ✅ ДОБАВЛЕНО
- [ ] НЕТ integration/, workflows/, tools/ тестов

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

1. **Тестовое покрытие Yandex Wiki и TickTick**
   - Yandex Wiki: 7 тестов vs 149 у эталона (21x разница)
   - TickTick: 3 теста vs 149 у эталона (50x разница)
   - Требуется: добавить unit, integration, workflow тесты

2. **Отсутствие eslint.config.js в Wiki и TickTick**
   - Нет линтинга = нет качества кода
   - Требуется: скопировать и адаптировать из yandex-tracker

### P1 - Высокий приоритет

3. **Отсутствие ResponseFieldFilter в Yandex Wiki**
   - Выходные данные API не фильтруются
   - Большой контекст при вызовах tools
   - Требуется: добавить fields схему и фильтрацию

4. **Отсутствие validation.ts в TickTick**
   - Нет валидации уникальности имён классов DI
   - Потенциальные runtime ошибки
   - Требуется: добавить validateDIRegistrations()

5. **Отсутствие batch операций в Yandex Wiki**
   - Нет maxBatchSize, maxConcurrentRequests
   - Нет параллельных запросов
   - Требуется: добавить batch конфигурацию и операции

### P2 - Средний приоритет

6. **Архитектурное расхождение TickTick**
   - Facade напрямую вызывает операции (без Services)
   - Инъекция через TYPES.* вместо классов
   - Рекомендация: добавить Services слой для консистентности

7. **~~Отсутствие CLI папки в TickTick~~** ✅ ИСПРАВЛЕНО
   - ~~cli.ts в корне src/ вместо src/cli/~~
   - Создана полная src/cli/ структура с types.ts, prompts.ts, bin/

8. **~~Отсутствие build:bundle в TickTick~~** ✅ ИСПРАВЛЕНО
   - Добавлена tsup конфигурация и build:bundle скрипт

### P3 - Низкий приоритет

9. **Разная структура ServerConfig в TickTick**
   - Вложенная структура vs плоская
   - Рекомендация: унифицировать с остальными серверами

10. **~~Отсутствие README.md в модулях Wiki~~** ✅ ИСПРАВЛЕНО
    - Добавлены README.md: cli/, tools/, composition-root/, wiki_api/facade/, api_operations/, dto/, entities/

11. **Разный подход к smoke тестам**
    - Yandex Tracker/Wiki: через scripts/smoke-test-server.ts
    - TickTick: через vitest в tests/smoke/
    - Рекомендация: унифицировать подход

---

## План исправлений

### Фаза 1: Критические исправления (P0)

1. **Добавить eslint.config.js в Yandex Wiki и TickTick** ✅ ВЫПОЛНЕНО
   - [x] Скопировать из yandex-tracker
   - [x] Адаптировать под специфику сервера
   - [x] Запустить lint:fix

2. **Увеличить тестовое покрытие** ⏳ ТРЕБУЕТСЯ
   - [ ] Yandex Wiki: добавить тесты для всех operations, tools, facade
   - [ ] TickTick: добавить тесты для всех operations, tools, facade
   - [ ] Добавить integration и workflow тесты

### Фаза 2: Высокий приоритет (P1)

3. **Добавить ResponseFieldFilter в Yandex Wiki** ✅ ВЫПОЛНЕНО
   - [x] Создать filter-fields.ts утилиту (как в TickTick)
   - [x] Добавить ResponseFieldsSchema в общие схемы
   - [x] Применить в GetPageTool (пример для остальных tools)

4. **Добавить validation.ts в TickTick** ✅ ВЫПОЛНЕНО
   - [x] Создать validateDIRegistrations()
   - [x] Добавить вызов в createContainer()

5. **Добавить batch конфигурацию в Yandex Wiki** ✅ ЧАСТИЧНО ВЫПОЛНЕНО
   - [x] Добавить maxBatchSize, maxConcurrentRequests в config
   - [ ] Реализовать batch операции для pages и grids (требует отдельной задачи)

### Фаза 3: Средний приоритет (P2)

6. **Рефакторинг архитектуры TickTick** ⏳ ОТЛОЖЕНО (значительный рефакторинг)
   - [ ] Добавить Services слой между Facade и Operations
   - [ ] Изменить инъекцию на class-based

7. **Структурные изменения TickTick** ✅ ВЫПОЛНЕНО
   - [x] Создана src/cli/ структура (types.ts, prompts.ts, bin/mcp-connect.ts)
   - [x] Добавить tsup конфигурацию и build:bundle

### Фаза 4: Низкий приоритет (P3)

8. **Унификация конфигурации и документации** ✅ ЧАСТИЧНО ВЫПОЛНЕНО
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
| Services слой (TickTick) | ⏳ ОТЛОЖЕНО (P2) |
| ServerConfig унификация | ⏳ ОТЛОЖЕНО (P3) |
| Полное тестовое покрытие | ⏳ ОТЛОЖЕНО (требует отдельной задачи) |

---

## Выводы

**Yandex Tracker** является эталоном с наиболее полной реализацией.

**Yandex Wiki** (0.1.0) — после ревью значительно улучшен:
- ✅ eslint, cpd, depcruise, validate:docs
- ✅ ResponseFieldFilter инфраструктура
- ✅ Batch конфигурация
- ✅ README.md во всех модулях
- ⏳ Требуется: batch операции, полное тестовое покрытие

**TickTick** (0.1.0) — после ревью унифицирован:
- ✅ eslint, validation.ts, CLI структура, build:bundle
- ✅ Базовые unit тесты и helpers
- ⏳ Требуется: Services слой (P2), полное тестовое покрытие

**Дата завершения ревью:** 2025-12-07
