# CLI — Управление подключениями MCP сервера

**Интерактивный инструмент для автоматического подключения к MCP клиентам**

---

## 🎯 Назначение

**Автоматизация подключения** MCP сервера к различным клиентам (Claude Desktop, Claude Code, Codex)

**Ключевые возможности:**
- ✅ Интерактивный режим — задает вопросы о конфигурации
- ✅ Автоопределение установленных MCP клиентов
- ✅ Расширяемость — легкое добавление новых клиентов
- ✅ Типобезопасность (TypeScript)
- ✅ Команды: connect, disconnect, status, list

---

## 🚀 Быстрый старт

```bash
# Собрать проект
npm run build

# Интерактивное подключение
npm run mcp:connect
```

---

## 📁 Структура

```
src/cli/
├── bin/
│   └── mcp-connect.ts              # Entry point (commander)
├── connectors/                      # Коннекторы для клиентов
│   ├── base/
│   │   ├── connector.interface.ts  # MCPConnector интерфейс
│   │   └── base-connector.ts       # Абстрактный базовый класс
│   ├── claude-desktop/
│   │   ├── claude-desktop.connector.ts
│   │   └── types.ts
│   ├── claude-code/
│   │   ├── claude-code.connector.ts
│   │   └── types.ts
│   ├── codex/
│   │   ├── codex.connector.ts
│   │   └── types.ts
│   ├── registry.ts                 # ConnectorRegistry
│   └── index.ts
├── commands/                        # CLI команды
│   ├── connect.command.ts
│   ├── disconnect.command.ts
│   ├── status.command.ts
│   └── list.command.ts
├── utils/
│   ├── interactive.ts              # Inquirer вопросы
│   ├── config-manager.ts           # Сохранение конфигурации
│   ├── client-detector.ts          # Определение клиентов
│   └── logger.ts                   # CLI логирование (chalk, ora)
└── types.ts
```

---

## 📋 Команды

### `npm run mcp:connect`

**Назначение:** Интерактивное подключение к MCP клиенту

**Workflow:**
1. Находит установленные клиенты
2. Предлагает выбрать клиент
3. Запрашивает конфигурацию (токен, orgId, logLevel)
4. Настраивает подключение
5. Сохраняет конфигурацию

**Опции:**
```bash
# Интерактивный режим
npm run mcp:connect

# Указать клиент напрямую
npm run mcp:connect -- --client claude-desktop
```

---

### `npm run mcp:disconnect`

**Назначение:** Отключить MCP сервер от клиента

**Опции:**
```bash
# Интерактивный выбор клиента
npm run mcp:disconnect

# Указать клиент напрямую
npm run mcp:disconnect -- --client claude-desktop
```

---

### `npm run mcp:status`

**Назначение:** Проверить статус подключений

**Вывод:**
- ✅ Подключен — сервер настроен и работает
- ⭕ Не подключен — сервер не настроен
- ❌ Не установлен — клиент отсутствует

**Пример:**
```bash
npm run mcp:status

# Вывод:
# Claude Desktop: ✅ Подключен
# Claude Code:    ⭕ Не подключен
# Codex:          ❌ Не установлен
```

---

### `npm run mcp:list`

**Назначение:** Показать список поддерживаемых клиентов

---

## 🔧 Поддерживаемые клиенты

### Claude Desktop

- **Платформы:** macOS, Linux, Windows
- **Конфиг:** `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Метод:** прямая запись в JSON

### Claude Code

- **Платформы:** macOS, Linux, Windows
- **Конфиг:** управляется через CLI
- **Метод:** `claude mcp add`

### Codex

- **Платформы:** macOS, Linux, Windows
- **Конфиг:** `~/.codex/config.toml`
- **Метод:** `codex mcp add` + fallback через TOML

---

## 🏗️ Архитектура

### MCPConnector (интерфейс)

**Базовый интерфейс** для всех коннекторов

**Методы:**
- `getInfo()` — информация о клиенте
- `isInstalled()` — проверка установки
- `isConnected(serverId)` — проверка подключения
- `connect(config)` — подключение сервера
- `disconnect(serverId)` — отключение сервера

**Файл:** `connectors/base/connector.interface.ts`

### BaseConnector (абстрактный класс)

**Переиспользуемая логика** для коннекторов:
- Валидация конфигурации
- Чтение/запись файлов
- Обработка ошибок

**Файл:** `connectors/base/base-connector.ts`

### ConnectorRegistry

**Реестр доступных коннекторов**

**Методы:**
- `getAll()` — все коннекторы
- `getByName(name)` — получить коннектор по имени
- `getInstalled()` — только установленные клиенты

**Файл:** `connectors/registry.ts`

### ConfigManager

**Сохранение конфигурации** между запусками

**Формат:** JSON файл в `~/.yandex-tracker-mcp/config.json`

**Содержимое:**
```json
{
  "token": "your-oauth-token",
  "orgId": "your-org-id",
  "logLevel": "info"
}
```

**Файл:** `utils/config-manager.ts`

### ClientDetector

**Определение установленных клиентов**

**Методы:**
- `detectAll()` — находит все установленные клиенты
- `detectSpecific(name)` — проверяет конкретный клиент

**Файл:** `utils/client-detector.ts`

### Interactive

**Интерактивные вопросы** через Inquirer.js

**Функции:**
- `selectClient(clients)` — выбор клиента
- `inputToken()` — ввод токена
- `inputOrgId()` — ввод org ID
- `selectLogLevel()` — выбор уровня логирования

**Файл:** `utils/interactive.ts`

---

## 🔨 Добавление нового клиента

**Шаг 1:** Создать connector

```typescript
// src/cli/connectors/my-client/my-client.connector.ts

export class MyClientConnector extends BaseConnector {
  getInfo(): MCPClientInfo {
    return {
      name: 'my-client',
      displayName: 'My Client',
      description: 'My custom MCP client',
      platforms: ['darwin', 'linux', 'win32'],
    };
  }

  async isInstalled(): Promise<boolean> {
    // Проверка установки
    return existsSync('/path/to/my-client');
  }

  async connect(config: MCPServerConfig): Promise<void> {
    // Логика подключения
  }

  async disconnect(serverId: string): Promise<void> {
    // Логика отключения
  }
}
```

**Шаг 2:** Зарегистрировать в Registry

```typescript
// src/cli/connectors/registry.ts

import { MyClientConnector } from './my-client/my-client.connector.js';

export class ConnectorRegistry {
  private connectors: MCPConnector[] = [
    new ClaudeDesktopConnector(),
    new ClaudeCodeConnector(),
    new CodexConnector(),
    new MyClientConnector(), // ← добавить
  ];
}
```

**Шаг 3:** Добавить команду в package.json (опционально)

```json
{
  "scripts": {
    "mcp:connect:my-client": "tsx src/cli/bin/mcp-connect.ts connect --client my-client"
  }
}
```

**ВСЁ!** Новый клиент доступен в CLI.

---

## 🚨 Критические правила

### 1. Используй BaseConnector для новых клиентов

```typescript
// ✅ ПРАВИЛЬНО (наследование от BaseConnector)
export class MyConnector extends BaseConnector { ... }

// ❌ НЕПРАВИЛЬНО (прямая реализация интерфейса)
export class MyConnector implements MCPConnector { ... }
```

### 2. Всегда валидируй конфигурацию

```typescript
// ✅ BaseConnector автоматически валидирует
await connector.connect(config);

// Бросит ошибку если token или orgId отсутствуют
```

### 3. Обрабатывай все платформы

```typescript
// ✅ ПРАВИЛЬНО (проверка платформы)
async isInstalled(): Promise<boolean> {
  if (process.platform === 'darwin') {
    return existsSync('/Applications/MyClient.app');
  } else if (process.platform === 'win32') {
    return existsSync('C:\\Program Files\\MyClient');
  }
  return false;
}
```

### 4. Используй ConfigManager для сохранения

```typescript
// ✅ Конфигурация сохраняется автоматически
// Не нужно хардкодить токены в коде
```

---

## 🧪 Тестирование

**Файлы:** `tests/unit/cli/`

**Покрытие:**
- ✅ Все коннекторы (Claude Desktop, Claude Code, Codex)
- ✅ Команды (connect, disconnect, status, list)
- ✅ Утилиты (ConfigManager, ClientDetector)

**Запуск:**
```bash
npm run test:unit -- src/cli
```

---

## 🔗 См. также

- **Commander.js документация:** https://github.com/tj/commander.js
- **Inquirer.js документация:** https://github.com/SBoudrias/Inquirer.js
- **Chalk документация:** https://github.com/chalk/chalk
- **Root README:** [../../README.md](../../README.md)
- **ARCHITECTURE.md:** [../../ARCHITECTURE.md](../../ARCHITECTURE.md)
