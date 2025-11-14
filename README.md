# Яндекс.Трекер MCP Bundle

Полнофункциональный MCP (Model Context Protocol) Bundle для интеграции с API Яндекс.Трекера. Позволяет LLM-моделям (например, Claude) взаимодействовать с задачами, проектами и другими сущностями Яндекс.Трекера.

## Описание

MCP Bundle — это стандартизированный формат упаковки локальных MCP-серверов в виде `.mcpb` архивов для упрощения установки и распространения. Этот бандл реализует полноценный MCP-сервер для работы с Яндекс.Трекером, написанный на TypeScript с строгой типизацией.

### Основные возможности

- ✅ **Строгая типизация**: полная реализация на TypeScript
- ✅ **Безопасность**: защищённая передача токенов через переменные окружения
- ✅ **Логирование**: настраиваемые уровни логирования (debug, info, warn, error)
- ✅ **Обработка ошибок**: продуманная обработка ошибок API с информативными сообщениями
- ✅ **Таймауты**: настраиваемые таймауты для запросов к API
- ✅ **Batch-операции**: параллельное выполнение множественных запросов с контролем лимитов
- ✅ **Расширяемость**: простая архитектура для добавления новых инструментов

### Текущие инструменты

**API операции:**
- `yandex_tracker_ping` — проверка доступности API и валидности токена
- `yandex_tracker_get_issues` — получить задачи по ключам (batch операция)
- `yandex_tracker_find_issues` — найти задачи по JQL запросу

**Helper инструменты:**
- `yandex_tracker_get_issue_url` — получить URL задачи в Яндекс.Трекере
- `yandex_tracker_search_tools` — поиск доступных MCP инструментов по запросу
- `yandex_tracker_demo` — демонстрационный инструмент для тестирования

## Требования

- **Node.js**: версия 22.0.0 или выше
- **npm**: для установки зависимостей
- **OAuth токен Яндекс**: для доступа к API Трекера
- **ID организации**: для работы с конкретной организацией в Трекере

## Установка

### 1. Клонирование репозитория

```bash
git clone https://github.com/fractalizer/yandex-tracker-mcp.git
cd yandex-tracker-mcp
```

### 2. Установка зависимостей

```bash
npm install
```

### 3. Сборка проекта

```bash
npm run build
```

Эта команда скомпилирует TypeScript код в JavaScript в директорию `dist/`.

## Получение OAuth токена

### Шаги для получения токена:

1. Перейдите на страницу OAuth приложений Яндекса: https://oauth.yandex.ru/
2. Создайте новое приложение или используйте существующее
3. Выберите права доступа (scope): `tracker:read`, `tracker:write`
4. Получите OAuth токен

**Важно**: Храните токен в безопасности и никогда не коммитьте его в репозиторий!

### Получение ID организации

ID организации можно найти в настройках Яндекс.Трекера:
1. Откройте Яндекс.Трекер
2. Перейдите в "Настройки" → "Организация"
3. Скопируйте ID организации

## Конфигурация

Бандл настраивается через переменные окружения, которые передаются из `manifest.json`:

| Переменная | Тип | Обязательная | Описание | По умолчанию |
|-----------|-----|--------------|----------|--------------|
| `YANDEX_TRACKER_TOKEN` | string | ✅ Да | OAuth токен для API | - |
| `YANDEX_ORG_ID` | string | ✅ Да | ID организации в Яндекс.Трекере | - |
| `LOG_LEVEL` | string | Нет | Уровень логирования: debug, info, warn, error | `info` |
| `LOGS_DIR` | string | Нет | Директория для лог-файлов | `./logs` |
| `PRETTY_LOGS` | boolean | Нет | Pretty-printing логов (для development) | `false` |
| `LOG_MAX_SIZE` | number | Нет | Максимальный размер лог-файла (байты) | `51200` (50KB) |
| `LOG_MAX_FILES` | number | Нет | Количество ротируемых лог-файлов | `20` |
| `REQUEST_TIMEOUT` | number | Нет | Таймаут запросов (мс), диапазон: 5000-120000 | `30000` |
| `MAX_BATCH_SIZE` | number | Нет | Максимальное количество элементов в batch-запросе, диапазон: 1-1000 | `200` |
| `MAX_CONCURRENT_REQUESTS` | number | Нет | Максимальное количество одновременных HTTP-запросов, диапазон: 1-20 | `5` |

### Логирование

MCP сервер использует production-ready логирование на базе [Pino](https://github.com/pinojs/pino) с поддержкой:
- **Structured logging** — логи в JSON формате для удобного парсинга
- **Автоматическая ротация** — старые логи сжимаются в `.gz` архивы
- **Dual output** — критичные логи (error/warn) дублируются в stderr для мониторинга
- **Request tracing** — поддержка correlation ID через child loggers

#### Директория логов

По умолчанию логи записываются в `./logs` относительно текущей рабочей директории.

**Для локального запуска через npx:**
```bash
# Создайте рабочую директорию
mkdir ~/yandex-tracker-workspace
cd ~/yandex-tracker-workspace

# Запустите сервер (логи будут в ~/yandex-tracker-workspace/logs/)
npx yandex-tracker-mcp

# Или укажите кастомную директорию
LOGS_DIR=~/logs/yandex-tracker npx yandex-tracker-mcp
```

**Для Claude Desktop:**
- Логи создаются автоматически в директории приложения
- Обычно: `~/Library/Application Support/Claude/logs/` (macOS)

#### Ротация логов

Логи автоматически ротируются при достижении указанного размера:

```bash
# По умолчанию: 50KB файл, 20 ротаций (максимум ~1MB на диске)
LOG_MAX_SIZE=51200     # 50KB в байтах
LOG_MAX_FILES=20       # Количество файлов

# Пример: увеличить до 1MB файл, 50 ротаций (~50MB на диске)
LOG_MAX_SIZE=1048576 LOG_MAX_FILES=50 npx yandex-tracker-mcp
```

**Файлы логов:**
- `combined.log` — все логи (info, warn, error, debug)
- `combined.log.1.gz`, `combined.log.2.gz`, ... — ротированные архивы
- `error.log` — только ошибки (error)
- `error.log.1.gz`, `error.log.2.gz`, ... — ротированные архивы ошибок

**Важно:** Старые логи автоматически удаляются при превышении `LOG_MAX_FILES`, так что сервер не засорит диск.

#### Development mode

Для удобной разработки включите pretty-printing:

```bash
PRETTY_LOGS=true LOG_LEVEL=debug npm run dev
```

В этом режиме логи выводятся в stderr в человекочитаемом формате (без записи в файлы).

## Использование

### Локальный запуск для тестирования

```bash
# Установите переменные окружения
export YANDEX_TRACKER_TOKEN="your-oauth-token"
export YANDEX_ORG_ID="your-org-id"
export LOG_LEVEL="debug"

# Запустите сервер
npm run dev
```

### Использование в Claude Desktop

1. **Упакуйте бандл** (если установлен MCPB CLI):
   ```bash
   npx @anthropic-ai/mcpb pack
   ```

2. **Установите в Claude Desktop**:
   - Откройте настройки Claude Desktop
   - Перейдите в раздел MCP Bundles
   - Добавьте созданный файл `yandex-tracker-mcp.mcpb`
   - Введите OAuth токен и ID организации в параметрах конфигурации

3. **Используйте инструменты**:
   Теперь Claude может использовать инструменты Яндекс.Трекера в диалоге:
   ```
   User: Проверь доступность API Яндекс.Трекера
   Claude: [использует yandex_tracker_ping]
   ```

## Разработка

### Структура проекта

```
yandex-tracker-mcp/
├── manifest.json            # Манифест MCPB бандла
├── package.json             # Зависимости Node.js
├── tsconfig.json            # Конфигурация TypeScript
├── CLAUDE.md                # Правила и конвенции для ИИ агентов
├── ARCHITECTURE.md          # Архитектурная документация
├── src/                     # Исходный код TypeScript
│   ├── index.ts            # Главный файл MCP-сервера
│   ├── composition-root/   # DI контейнер (InversifyJS)
│   ├── infrastructure/     # HTTP, кеш, логирование, параллелизация
│   ├── tracker_api/        # API Operations, Entities, DTO, Facade
│   └── mcp/                # MCP Tools (API + Helpers), Registry, Search
├── tests/                   # Тесты (unit + integration + e2e)
├── dist/                    # Скомпилированный JavaScript (создаётся при сборке)
└── README.md               # Эта документация
```

Подробная документация по архитектуре: [ARCHITECTURE.md](./ARCHITECTURE.md)

### Добавление новых инструментов

Проект использует **feature-based архитектуру** с автоматической регистрацией через DI контейнер.

**Для добавления нового MCP Tool:**

1. **Создай файловую структуру** (например, для создания задачи):
   ```
   src/mcp/tools/api/issues/create/
   ├── create-issue.schema.ts      # Zod схемы для валидации
   ├── create-issue.definition.ts  # MCP ToolDefinition для ИИ
   ├── create-issue.tool.ts        # Основной класс Tool
   └── index.ts                    # Реэкспорт
   ```

2. **Добавь 1 строку в автоматическую регистрацию**:
   ```typescript
   // src/composition-root/definitions/tool-definitions.ts
   import { CreateIssueTool } from '@mcp/tools/api/issues/create/index.js';

   export const TOOL_CLASSES = [
     // ... существующие tools
     CreateIssueTool,  // ← ДОБАВЬ ОДНУ СТРОКУ
   ] as const;
   ```

3. **ВСЁ!** DI контейнер автоматически:
   - Зарегистрирует Tool в контейнере
   - Сгенерирует Symbol для DI токена
   - Добавит Tool в ToolRegistry

4. **Запусти валидацию**:
   ```bash
   npm run validate  # lint + typecheck + tests + depcruise + build
   ```

**Подробная документация:**
- Правила и шаблоны: [src/mcp/CONVENTIONS.md](./src/mcp/CONVENTIONS.md)
- Общие конвенции: [CLAUDE.md](./CLAUDE.md)
- Архитектура: [ARCHITECTURE.md](./ARCHITECTURE.md)

### Скрипты разработки

```bash
# Сборка проекта
npm run build

# Сборка в режиме watch (пересборка при изменениях)
npm run watch

# Запуск с отладкой
npm run dev

# Проверка типов без сборки
npm run typecheck          # Только src/
npm run typecheck:tests    # Только tests/
npm run typecheck:all      # src/ + tests/

# Линтинг кода
npm run lint

# Очистка собранных файлов
npm run clean
```

## Тестирование

### Ручное тестирование через stdio

Вы можете тестировать MCP-сервер напрямую, отправляя JSON-RPC сообщения через stdin:

```bash
npm run build
node dist/index.js
```

Затем отправьте JSON-RPC запрос:
```json
{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}
```

### Тестирование ping инструмента

```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "tools/call",
  "params": {
    "name": "yandex_tracker_ping",
    "arguments": {}
  }
}
```

## Безопасность

### Защита токенов

- **Никогда не коммитьте токены** в систему контроля версий
- Используйте `.env` файлы для локальной разработки (они в `.gitignore`)
- В продакшене передавайте токены через переменные окружения
- Ограничивайте права доступа OAuth токена минимально необходимыми

### Обработка ошибок

Все ошибки API логируются без раскрытия чувствительных данных. Токены и другие конфиденциальные параметры не включаются в логи.

## Совместимость

- **Платформы**: macOS, Linux, Windows
- **MCP клиенты**: Claude Desktop ≥ 0.10.0
- **Node.js**: ≥ 22.0.0

## Лицензия

MIT License. См. файл `LICENSE` для подробностей.

## Автор

Fractalizer (fractalizer@example.com)

## Полезные ссылки

- [Спецификация MCP Bundle](https://github.com/anthropics/mcpb)
- [Model Context Protocol SDK](https://github.com/anthropics/mcp)
- [API Яндекс.Трекера](https://cloud.yandex.ru/docs/tracker/about-api)
- [OAuth Яндекс](https://yandex.ru/dev/oauth/)

## Поддержка

При возникновении проблем:
1. Проверьте корректность OAuth токена и ID организации
2. Убедитесь, что установлены все зависимости (`npm install`)
3. Проверьте логи с уровнем `debug`: `export LOG_LEVEL=debug`
4. Создайте issue в репозитории GitHub