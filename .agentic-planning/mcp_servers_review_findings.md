# Ревью MCP серверов - Список находок

**Дата:** 2025-12-07
**Эталон:** yandex-tracker (наиболее зрелый сервер, версия 4.0.0)

---

## Сводная таблица сравнения

| Критерий | Yandex Tracker | Yandex Wiki | TickTick |
|----------|----------------|-------------|----------|
| **Версия** | 4.0.0 | 0.1.0 | 0.1.0 |
| **Кол-во тестов** | 149 файлов | 7 файлов | 3 файла |
| **Smoke тесты** | 5 тестов | 1 тест | 2 теста |
| **DI validation.ts** | Есть | Есть | НЕТ |
| **Facade Services** | Есть (14 сервисов) | Есть (3 сервиса) | НЕТ |
| **ResponseFieldFilter** | Частичное | НЕТ | Есть |
| **Batch операции** | Есть | НЕТ | Есть |
| **eslint.config.js** | Есть | НЕТ | НЕТ |
| **cpd скрипт** | Есть | НЕТ | Есть |
| **depcruise скрипт** | Есть | НЕТ | Есть |
| **validate:docs** | Есть | НЕТ | НЕТ |
| **CLI папка** | src/cli/ | src/cli/ | cli.ts (файл) |
| **build:bundle** | tsup | tsup | НЕТ |
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
- [ ] НЕТ README.md в cli/ и других модулях
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
- [ ] НЕ использует ResponseFieldFilter!
- [x] @mcp-framework/infrastructure: Logger, HttpClient, CacheManager
- [x] @mcp-framework/search: ToolSearchEngine

### Многопоточность / параллелизм
- [ ] НЕТ maxBatchSize, maxConcurrentRequests в конфигурации!
- [ ] НЕТ batch операций вообще!
- [ ] Нет Promise.all для параллельных запросов

### Фильтрация выходных данных
- [ ] НЕ использует ResponseFieldFilter!
- [ ] Нет фильтрации полей в tools

### Прочее
- [ ] CLAUDE.md ~114 строк (базовый, намного меньше эталона)
- [ ] НЕТ eslint.config.js
- [ ] НЕТ cpd, depcruise скриптов
- [ ] НЕТ validate:docs скрипта
- [x] build:bundle через tsup
- [x] smoke-test-server.ts скрипт

---

## 3. TickTick

### Структура
- [x] 34 directories, 41 files в src/
- [ ] НЕТ cli/ папки (только cli.ts файл в корне src/)
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
- [ ] НЕТ validation.ts файла!
- [ ] НЕТ bindFacadeServices() (нет сервисов)
- [ ] ОТЛИЧАЕТСЯ: OPERATION_DEFINITIONS вместо OPERATION_CLASSES
- [x] bindOAuthLayer() - дополнительный слой для OAuth
- [x] reflect-metadata импортируется напрямую в container.ts

### Тесты
- [ ] КРИТИЧНО: Только 3 тестовых файла (50x меньше чем у эталона!)
- [ ] Только smoke/ и unit/auth
- [x] 2 smoke теста: di-container, mcp-server-lifecycle
- [ ] НЕТ integration/, workflows/, tools/, helpers/ тестов

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
- [ ] НЕТ eslint.config.js
- [x] cpd, depcruise скрипты есть
- [ ] НЕТ validate:docs скрипта
- [ ] НЕТ build:bundle (нет tsup)
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

7. **Отсутствие CLI папки в TickTick**
   - cli.ts в корне src/ вместо src/cli/
   - Требуется: переместить в src/cli/ структуру

8. **Отсутствие build:bundle в TickTick**
   - Нет единого бандла для продакшена
   - Требуется: добавить tsup конфигурацию

### P3 - Низкий приоритет

9. **Разная структура ServerConfig в TickTick**
   - Вложенная структура vs плоская
   - Рекомендация: унифицировать с остальными серверами

10. **Отсутствие README.md в модулях Wiki**
    - Нет документации в cli/ и других модулях
    - Требуется: добавить по образцу yandex-tracker

11. **Разный подход к smoke тестам**
    - Yandex Tracker/Wiki: через scripts/smoke-test-server.ts
    - TickTick: через vitest в tests/smoke/
    - Рекомендация: унифицировать подход

---

## План исправлений

### Фаза 1: Критические исправления (P0)

1. **Добавить eslint.config.js в Yandex Wiki и TickTick**
   - Скопировать из yandex-tracker
   - Адаптировать под специфику сервера
   - Запустить lint:fix

2. **Увеличить тестовое покрытие**
   - Yandex Wiki: добавить тесты для всех operations, tools, facade
   - TickTick: добавить тесты для всех operations, tools, facade
   - Добавить integration и workflow тесты

### Фаза 2: Высокий приоритет (P1)

3. **Добавить ResponseFieldFilter в Yandex Wiki**
   - Создать filter-fields.ts утилиту (как в TickTick)
   - Добавить FieldsSchema в общие схемы
   - Применить во всех read tools

4. **Добавить validation.ts в TickTick**
   - Создать validateDIRegistrations()
   - Добавить вызов в createContainer()

5. **Добавить batch операции в Yandex Wiki**
   - Добавить maxBatchSize, maxConcurrentRequests в config
   - Реализовать batch операции для pages и grids

### Фаза 3: Средний приоритет (P2)

6. **Рефакторинг архитектуры TickTick**
   - Добавить Services слой между Facade и Operations
   - Изменить инъекцию на class-based

7. **Структурные изменения TickTick**
   - Переместить cli.ts в src/cli/
   - Добавить tsup конфигурацию и build:bundle

### Фаза 4: Низкий приоритет (P3)

8. **Унификация конфигурации и документации**
   - Унифицировать ServerConfig структуру
   - Добавить README.md в модули Wiki
   - Унифицировать подход к smoke тестам

---

## Выводы

**Yandex Tracker** является эталоном с наиболее полной реализацией. Остальные серверы нуждаются в существенной доработке для достижения того же уровня качества.

**Yandex Wiki** находится на ранней стадии (0.1.0) и требует основных улучшений в тестировании, фильтрации и batch операциях.

**TickTick** имеет некоторые уникальные особенности (OAuth, filter-fields утилита), но архитектурно отклоняется от эталона и требует значительной унификации.
