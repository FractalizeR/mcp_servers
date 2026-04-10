# @fractalizer/mcp-cli

**Generic CLI фреймворк для управления подключениями MCP серверов к различным клиентам.**

---

## 🎯 Возможности

- **Универсальный** — подходит для любого MCP сервера
- **Поддержка множества клиентов** — Claude Desktop, Claude Code, Codex, Gemini, Qwen
- **Типобезопасность** — TypeScript generics для конфигурации
- **Декларативные промпты** — простая настройка через `ConfigPromptDefinition`
- **Безопасное хранение** — секреты не сохраняются, только безопасные поля
- **Расширяемость** — легко добавить новый клиент или кастомизировать промпты
- **Интерактивность** — удобный CLI с выбором из списка, валидацией, спиннерами

---

## 📦 Установка

```bash
npm install @fractalizer/mcp-cli
```

---

## 🚀 Быстрый старт

### Минимальный пример

```typescript
import { connectCommand, ConnectorRegistry, ConfigManager } from '@fractalizer/mcp-cli';
import type { BaseMCPServerConfig, ConfigPromptDefinition } from '@fractalizer/mcp-cli';
import {
  ClaudeDesktopConnector,
  ClaudeCodeConnector,
} from '@fractalizer/mcp-cli/connectors';

// 1. Определяем конфигурацию вашего MCP сервера
interface MyServerConfig extends BaseMCPServerConfig {
  apiToken: string;  // Секрет
  orgId: string;     // Безопасное поле
}

// 2. Создаем реестр и регистрируем коннекторы
const registry = new ConnectorRegistry<MyServerConfig>();
registry.register(new ClaudeDesktopConnector('my-server', 'dist/index.js'));
registry.register(new ClaudeCodeConnector('my-server', 'dist/index.js'));

// 3. Создаем менеджер конфигурации
const configManager = new ConfigManager<MyServerConfig>({
  projectName: 'my-mcp-server',
  safeFields: ['orgId', 'logLevel', 'projectPath'], // БЕЗ apiToken!
});

// 4. Определяем промпты для сбора конфигурации
const configPrompts: ConfigPromptDefinition<MyServerConfig>[] = [
  {
    name: 'apiToken',
    type: 'password',
    message: 'API токен:',
    validate: (value) => (value ? true : 'Токен обязателен'),
  },
  {
    name: 'orgId',
    type: 'input',
    message: 'ID организации:',
    default: (saved) => saved?.orgId, // Используем сохраненное значение
  },
];

// 5. Запускаем команду подключения
await connectCommand({
  registry,
  configManager,
  configPrompts,
});
```

**Что произойдет:**
1. CLI найдет установленные MCP клиенты
2. Предложит выбрать клиент из списка
3. Соберет конфигурацию через интерактивные промпты
4. Провалидирует конфигурацию
5. Подключит MCP сервер к выбранному клиенту
6. Сохранит безопасные поля (без секретов)

---

## 📚 Основные концепции

### 1. Конфигурация MCP сервера

Все MCP серверы должны расширять `BaseMCPServerConfig`:

```typescript
interface BaseMCPServerConfig {
  projectPath: string;                   // Путь к проекту
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
  env?: Record<string, string>;          // Переменные окружения
}

// Расширяем для своего сервера
interface YandexTrackerConfig extends BaseMCPServerConfig {
  token: string;        // Секрет - НЕ сохраняется
  orgId: string;        // Безопасно - сохраняется
  apiBase?: string;     // Безопасно - сохраняется
}
```

### 2. Коннекторы

**Коннектор** — адаптер для конкретного MCP клиента (Claude Desktop, Claude Code и т.д.).

**Встроенные коннекторы:**
- `ClaudeDesktopConnector` — Claude Desktop (macOS/Windows)
- `ClaudeCodeConnector` — Claude Code (VSCode extension)
- `CodexConnector` — Codex IDE
- `GeminiConnector` — Google Gemini
- `QwenConnector` — Alibaba Qwen

**Использование:**

```typescript
import { ClaudeDesktopConnector } from '@fractalizer/mcp-cli/connectors';

const connector = new ClaudeDesktopConnector(
  'my-server',      // Имя сервера в конфиге клиента
  'dist/index.js'   // Путь к entry point вашего MCP сервера
);

// Проверить установку
const isInstalled = await connector.isInstalled();

// Подключить
await connector.connect(config);

// Отключить
await connector.disconnect();

// Проверить статус
const status = await connector.getStatus();
```

### 3. Реестр коннекторов

`ConnectorRegistry` управляет коллекцией коннекторов:

```typescript
const registry = new ConnectorRegistry<MyServerConfig>();

// Регистрация
registry.register(new ClaudeDesktopConnector('my-server', 'dist/index.js'));
registry.register(new ClaudeCodeConnector('my-server', 'dist/index.js'));

// Получение
const connector = registry.get('claude-desktop');

// Поиск установленных
const installed = await registry.findInstalled();

// Проверка статусов всех
const statuses = await registry.checkAllStatuses();
```

### 4. Менеджер конфигурации

`ConfigManager` сохраняет и загружает конфигурацию (только безопасные поля):

```typescript
const configManager = new ConfigManager<MyServerConfig>({
  projectName: 'my-server',
  safeFields: ['orgId', 'apiBase', 'logLevel'], // БЕЗ token!
});

// Сохранить (только safeFields будут записаны)
await configManager.save(config);

// Загрузить
const saved = await configManager.load();
// saved = { orgId: '...', apiBase: '...', logLevel: 'info' }
// token НЕ сохранен!
```

**Путь к файлу:** `~/.{projectName}/config.json`

### 5. Интерактивные промпты

`ConfigPromptDefinition` определяет, как собирать конфигурацию:

```typescript
const prompts: ConfigPromptDefinition<MyServerConfig>[] = [
  {
    name: 'token',
    type: 'password',
    message: 'OAuth токен:',
    validate: (value) => value ? true : 'Токен обязателен',
  },
  {
    name: 'orgId',
    type: 'input',
    message: 'ID организации:',
    default: (saved) => saved?.orgId, // Используем сохраненное
  },
  {
    name: 'logLevel',
    type: 'select',
    message: 'Уровень логирования:',
    choices: [
      { name: 'Debug', value: 'debug' },
      { name: 'Info', value: 'info' },
      { name: 'Warn', value: 'warn' },
      { name: 'Error', value: 'error' },
    ],
    default: 'info',
  },
];

const prompter = new InteractivePrompter<MyServerConfig>(prompts);
const config = await prompter.promptServerConfig(savedConfig);
```

**Типы промптов:**
- `input` — текстовый ввод
- `password` — скрытый ввод (для секретов)
- `select` — выбор из списка
- `confirm` — да/нет
- `number` — числовой ввод

---

## 🎨 Команды

### connectCommand

Подключает MCP сервер к выбранному клиенту.

```typescript
import { connectCommand } from '@fractalizer/mcp-cli/commands';

await connectCommand({
  registry,
  configManager,
  configPrompts,
  cliOptions: {
    client: 'claude-desktop', // Опционально: пропустить выбор клиента
  },
  buildConfig: (serverConfig) => ({
    ...serverConfig,
    projectPath: process.cwd(),
  }),
});
```

### disconnectCommand

Отключает MCP сервер от клиента.

```typescript
import { disconnectCommand } from '@fractalizer/mcp-cli/commands';

await disconnectCommand({
  registry,
  cliOptions: {
    client: 'claude-desktop',
  },
});
```

### statusCommand

Показывает статус подключений для всех клиентов.

```typescript
import { statusCommand } from '@fractalizer/mcp-cli/commands';

await statusCommand({ registry });
```

### listCommand

Показывает список всех доступных MCP клиентов.

```typescript
import { listCommand } from '@fractalizer/mcp-cli/commands';

await listCommand({ registry });
```

### validateCommand

Валидирует текущую конфигурацию для выбранного клиента.

```typescript
import { validateCommand } from '@fractalizer/mcp-cli/commands';

await validateCommand({
  registry,
  configManager,
  configPrompts,
  cliOptions: {
    client: 'claude-desktop',
  },
});
```

---

## 🛠️ Утилиты

### CommandExecutor

Выполнение shell команд:

```typescript
import { CommandExecutor } from '@fractalizer/mcp-cli/utils';

const result = await CommandExecutor.execute('ls -la');
if (result.success) {
  console.log(result.stdout);
}
```

### FileManager

Работа с файлами:

```typescript
import { FileManager } from '@fractalizer/mcp-cli/utils';

// Чтение JSON
const data = await FileManager.readJSON('/path/to/config.json');

// Запись JSON
await FileManager.writeJSON('/path/to/config.json', data);

// Проверка существования
const exists = await FileManager.exists('/path/to/file');

// Создание директории
await FileManager.ensureDir('/path/to/dir');
```

### Logger

CLI логирование:

```typescript
import { Logger } from '@fractalizer/mcp-cli/utils';

Logger.info('Информация');
Logger.success('Успех!');
Logger.error('Ошибка!');
Logger.warn('Предупреждение');

const spinner = Logger.spinner('Загрузка...');
// ... выполнение операции ...
spinner.succeed('Готово!');
```

---

## 🏗️ Создание кастомного коннектора

Если нужно добавить новый MCP клиент:

```typescript
import { BaseConnector } from '@fractalizer/mcp-cli/connectors';
import type { MCPClientInfo, ConnectionStatus } from '@fractalizer/mcp-cli';

class MyCustomConnector<TConfig extends BaseMCPServerConfig> extends BaseConnector<TConfig> {
  constructor(
    private serverName: string,
    private serverPath: string
  ) {
    super();
  }

  getClientInfo(): MCPClientInfo {
    return {
      name: 'my-client',
      displayName: 'My Custom Client',
      description: 'My custom MCP client',
      configPath: '/path/to/config',
      platforms: ['darwin', 'linux', 'win32'],
    };
  }

  async isInstalled(): Promise<boolean> {
    // Проверка установки клиента
    return true;
  }

  async getStatus(): Promise<ConnectionStatus> {
    // Проверка статуса подключения
    return { connected: true };
  }

  async connect(config: TConfig): Promise<void> {
    // Логика подключения
  }

  async disconnect(): Promise<void> {
    // Логика отключения
  }

  async validateConfig(config: TConfig): Promise<string[]> {
    const errors = await super.validateConfig(config);
    // Добавить свои проверки
    return errors;
  }
}

// Использование
const connector = new MyCustomConnector('my-server', 'dist/index.js');
registry.register(connector);
```

---

## 📖 Примеры использования

### Реальный пример: Yandex Tracker MCP

См. реализацию в [`packages/servers/yandex-tracker/src/cli/`](../../servers/yandex-tracker/src/cli/).

---

## 🔗 См. также

- **[Полный API Reference](./API.md)** — детальная документация всех типов и методов
- **[@fractalizer/mcp-infrastructure](../infrastructure/README.md)** — инфраструктурные утилиты

---

## 📝 Лицензия

PolyForm Shield License 1.0.0
