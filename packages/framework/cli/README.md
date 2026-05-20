# @fractalizer/mcp-cli

**Generic CLI фреймворк для управления подключениями MCP серверов к различным клиентам.**

Framework полностью **агностичен к доменной модели сервера**: оперирует двумя
абстракциями — `TDomainConfig` (произвольный объект, opaque для framework) и
`ServerLaunchSpec` (`{ command, args, env }` — готовая спецификация запуска).
Маппинг доменных полей в spec выполняет вызывающий код (адаптер домена).

---

## Возможности

- **Универсальный** — подходит для любого MCP сервера
- **Поддержка клиентов** — Claude Desktop, Claude Code, Codex, Gemini, Qwen (через `createConnector`)
- **Типобезопасность** — TypeScript generic-параметры с `extends object`
- **Декларативные промпты** — `ConfigPromptDefinition<T>`
- **Структурный парсинг статуса Claude Code** — `✓ Connected`/`✗ Failed`/`! Needs authentication`
- **Параллельный сбор статусов** — `Promise.allSettled` для всех клиентов сразу
- **Самодиагностика** — `connector.getLaunchSpec()` для проверки актуальности записей в конфигах

---

## Установка

```bash
npm install @fractalizer/mcp-cli
```

---

## Быстрый старт

```typescript
import {
  connectCommand,
  ConnectorRegistry,
  ConfigManager,
  createConnector,
  ClaudeCodeConnector,
} from '@fractalizer/mcp-cli';
import type {
  ConfigPromptDefinition,
  ServerLaunchSpec,
} from '@fractalizer/mcp-cli';

// 1. Доменная конфигурация (произвольный объект)
interface MyServerConfig {
  apiToken: string;
  orgId: string;
}

// 2. Реестр коннекторов
const registry = new ConnectorRegistry();
registry.register(createConnector('claude-desktop', 'my-server'));
registry.register(createConnector('gemini', 'my-server'));
registry.register(new ClaudeCodeConnector('my-server'));

// 3. ConfigManager (опционально, для сохранения)
const configManager = new ConfigManager<MyServerConfig>({
  projectName: 'my-mcp-server',
  // serialize-хук позволяет исключать секреты при сохранении
  serialize: (cfg) => ({ orgId: cfg.orgId }),
});

// 4. Промпты для сбора доменной конфигурации
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
    default: (saved) => saved?.orgId,
  },
];

// 5. Адаптер: доменная конфигурация → spec
function buildServerLaunch(cfg: MyServerConfig): ServerLaunchSpec {
  return {
    command: 'node',
    args: ['/abs/path/to/server.bundle.cjs'],
    env: {
      API_TOKEN: cfg.apiToken,
      ORG_ID: cfg.orgId,
    },
  };
}

// 6. Запускаем команду подключения
await connectCommand({
  registry,
  configManager,
  configPrompts,
  buildServerLaunch,
});
```

---

## Основные концепции

### ServerLaunchSpec

Спецификация запуска MCP сервера — готовая «команда + аргументы + env»,
записываемая в конфиг клиента:

```typescript
interface ServerLaunchSpec {
  command: string;
  args: string[];
  env: Record<string, string>;
}
```

### Коннекторы

**Два типа коннекторов:**

1. **`ConfigurableConnector`** — файл-ориентированные клиенты (Claude Desktop,
   Gemini, Qwen, Codex). Создаётся через фабрику `createConnector(client, serverName)`.
2. **`ClaudeCodeConnector`** — Claude Code CLI (управляется командами `claude mcp add/remove/list/get`).

```typescript
const desktop = createConnector('claude-desktop', 'my-server');
const claudeCode = new ClaudeCodeConnector('my-server');
```

**Контракт `MCPConnector`:**

```typescript
interface MCPConnector {
  getClientInfo(): MCPClientInfo;
  isInstalled(): Promise<boolean>;
  getStatus(): Promise<ConnectionStatus>;
  connect(spec: ServerLaunchSpec): Promise<void>;
  disconnect(): Promise<void>;
  validateLaunchSpec(spec: ServerLaunchSpec): Promise<string[]>;
  getLaunchSpec(): Promise<ServerLaunchSpec | null>;
}
```

### ConnectorRegistry

```typescript
const registry = new ConnectorRegistry();
registry.register(createConnector('gemini', 'my-server'));

// Установленные клиенты (проверка параллельная)
const installed = await registry.findInstalled();

// Все статусы параллельно через Promise.allSettled
const statuses = await registry.checkAllStatuses();
```

### ConfigManager

Хранит **доменную** конфигурацию в `~/.{projectName}/config.json`:

```typescript
const cm = new ConfigManager<MyConfig>({
  projectName: 'my-server',
  // По умолчанию сохраняется весь объект как есть.
  // Чтобы исключить секреты — задайте serialize:
  serialize: (cfg) => ({ orgId: cfg.orgId, apiBase: cfg.apiBase }),
});

await cm.save(config); // → ~/.my-server/config.json
const saved = await cm.load();
```

Права файла — `0o600`. Для фильтрации полей при сохранении используйте
`serialize`-хук (единственный механизм).

### Интерактивные промпты

```typescript
const prompts: ConfigPromptDefinition<MyConfig>[] = [
  { name: 'token', type: 'password', message: 'OAuth токен:' },
  { name: 'orgId', type: 'input', message: 'ID организации:' },
  {
    name: 'logLevel',
    type: 'select',
    message: 'Уровень логирования:',
    choices: [
      { name: 'Debug', value: 'debug' },
      { name: 'Info', value: 'info' },
    ],
    default: 'info',
  },
];

const prompter = new InteractivePrompter<MyConfig>(prompts);
const config = await prompter.promptServerConfig(savedConfig);
```

**Типы промптов:** `input`, `password`, `select`, `confirm`, `number`.

---

## Команды

### connectCommand

Поток:

1. Найти установленные клиенты.
2. Выбрать клиент (через `--client` или интерактивно).
3. Загрузить сохранённую доменную конфигурацию.
4. Собрать новую конфигурацию через промпты.
5. `buildServerLaunch(domainConfig)` → `ServerLaunchSpec`.
6. `connector.validateLaunchSpec(spec)`. При ошибках — abort.
7. `connector.connect(spec)`. При исключении управление прерывается до save.
8. `connector.getStatus()` (информационный).
9. **После успешного connect** — `configManager.save(domainConfig)` и warning про
   plaintext-хранение токена в конфиге клиента.

```typescript
await connectCommand({
  registry,
  configManager,
  configPrompts,
  buildServerLaunch: (cfg) => ({
    command: 'node',
    args: ['/abs/path/server.bundle.cjs'],
    env: { API_TOKEN: cfg.token, ORG_ID: cfg.orgId },
  }),
  cliOptions: { client: 'claude-desktop' },
});
```

### disconnectCommand / statusCommand / listCommand / validateCommand

```typescript
await disconnectCommand({ registry, cliOptions: { client: 'claude-desktop' } });
await statusCommand({ registry });
await listCommand({ registry });
await validateCommand({ registry });
```

`statusCommand` и `validateCommand` собирают статусы параллельно через
`Promise.allSettled`, рендерят результат в детерминированном порядке регистрации.

---

## Утилиты

### CommandExecutor

```typescript
import { CommandExecutor } from '@fractalizer/mcp-cli';

// Простое выполнение
const out = CommandExecutor.exec('node --version');

// С таймаутом — при превышении бросает Error('Timeout: ...').
const list = CommandExecutor.exec('claude mcp list', { timeout: 5000 });

// Интерактивно (наследует stdio)
await CommandExecutor.execInteractive('claude', ['mcp', 'add', '...']);

// Проверка наличия в PATH
if (CommandExecutor.isCommandAvailable('claude')) { /* ... */ }
```

### FileManager / Logger

```typescript
import { FileManager, Logger } from '@fractalizer/mcp-cli';

const data = await FileManager.readJSON('/path/to/config.json');
await FileManager.writeJSON('/path/to/config.json', data);

Logger.info('Информация');
Logger.success('Успех!');
Logger.warn('Внимание');
Logger.error('Ошибка');
```

---

## Кастомный коннектор

Если нужно поддержать клиент, не входящий в `KnownClient`:

```typescript
import { BaseConnector } from '@fractalizer/mcp-cli';
import type { MCPClientInfo, ConnectionStatus, ServerLaunchSpec } from '@fractalizer/mcp-cli';

class MyCustomConnector extends BaseConnector {
  getClientInfo(): MCPClientInfo {
    return {
      name: 'my-client',
      displayName: 'My Custom Client',
      description: 'My custom MCP client',
      configPath: '/path/to/config',
      platforms: ['darwin', 'linux', 'win32'],
    };
  }

  async isInstalled(): Promise<boolean> { /* ... */ return true; }

  async getStatus(): Promise<ConnectionStatus> { /* ... */ return { connected: true }; }

  async connect(spec: ServerLaunchSpec): Promise<void> { /* запись spec */ }

  async disconnect(): Promise<void> { /* удаление записи */ }

  async getLaunchSpec(): Promise<ServerLaunchSpec | null> { /* чтение записи */ return null; }
}
```

`BaseConnector.validateLaunchSpec` уже проверяет:
- `spec.command` непустой;
- абсолютный путь команды существует на диске;
- для `command === 'node'` — первый абсолютный путь в `spec.args` существует;
- значения `spec.env` — строки.

Наследник может переопределить, вызвав `super.validateLaunchSpec(spec)` для
сохранения базовых проверок.

---

## Лицензия

PolyForm Shield License 1.0.0
