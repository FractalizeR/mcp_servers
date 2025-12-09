# @fractalizer/mcp-cli API Reference

Полная документация API для `@fractalizer/mcp-cli`.

---

## Типы

### BaseMCPServerConfig

Базовая конфигурация для любого MCP сервера.

```typescript
interface BaseMCPServerConfig {
  projectPath: string;
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
  env?: Record<string, string>;
}
```

### MCPClientInfo

Информация о MCP клиенте.

```typescript
interface MCPClientInfo {
  name: string;
  displayName: string;
  description: string;
  checkCommand?: string;
  configPath: string;
  platforms: Array<'darwin' | 'linux' | 'win32'>;
}
```

### ConnectionStatus

```typescript
interface ConnectionStatus {
  connected: boolean;
  details?: {
    configPath: string;
    lastModified?: Date;
    metadata?: Record<string, unknown>;
  };
  error?: string;
}
```

### ConfigPromptDefinition<TConfig, K>

Определение промпта для сбора конфигурации.

```typescript
interface ConfigPromptDefinition<
  TConfig extends BaseMCPServerConfig,
  K extends keyof TConfig = keyof TConfig,
> {
  name: K;
  type: PromptType;
  message: string;
  default?: TConfig[K] | ((savedConfig?: Partial<TConfig>) => TConfig[K] | undefined);
  validate?: (value: TConfig[K]) => string | true;
  choices?: Array<{ name: string; value: TConfig[K] }>;
  when?: (answers: Partial<TConfig>) => boolean;
  mask?: string;
}

type PromptType = 'input' | 'password' | 'list' | 'confirm' | 'number';
```

### ConfigManagerOptions<TConfig>

```typescript
interface ConfigManagerOptions<TConfig extends BaseMCPServerConfig> {
  projectName: string;
  safeFields: Array<keyof TConfig>;
  serialize?: (config: TConfig) => Record<string, unknown>;
  deserialize?: (data: Record<string, unknown>) => Partial<TConfig>;
}
```

### ConnectCommandOptions<TConfig>

```typescript
interface ConnectCommandOptions<TConfig extends BaseMCPServerConfig> {
  registry: IConnectorRegistry<TConfig>;
  configManager: ConfigManager<TConfig>;
  configPrompts: ConfigPromptDefinition<TConfig>[];
  cliOptions?: { client?: string };
  buildConfig?: (serverConfig: Omit<TConfig, 'projectPath'>) => TConfig;
}
```

---

## Классы

### ConnectorRegistry<TConfig>

Реестр MCP коннекторов.

```typescript
class ConnectorRegistry<TConfig extends BaseMCPServerConfig>
```

**Методы:**

```typescript
register(connector: MCPConnector<TConfig>): void
get(name: string): MCPConnector<TConfig> | undefined
getAll(): MCPConnector<TConfig>[]
async findInstalled(): Promise<MCPConnector<TConfig>[]>
async checkAllStatuses(): Promise<Map<string, ConnectionStatus>>
```

### ConfigManager<TConfig>

Менеджер конфигурации. Сохраняет только безопасные поля в `~/.{projectName}/config.json`.

```typescript
class ConfigManager<TConfig extends BaseMCPServerConfig>
```

**Конструктор:**

```typescript
constructor(options: ConfigManagerOptions<TConfig>)
```

**Методы:**

```typescript
async load(): Promise<Partial<TConfig> | undefined>
async save(config: TConfig): Promise<void>
async delete(): Promise<void>
async exists(): Promise<boolean>
getConfigPath(): string
```

**Пример:**

```typescript
const manager = new ConfigManager<MyConfig>({
  projectName: 'my-server',
  safeFields: ['orgId', 'apiBase'], // БЕЗ секретов
});
await manager.save(config);
const saved = await manager.load();
```

### InteractivePrompter<TConfig>

Сборщик конфигурации через интерактивные промпты.

```typescript
class InteractivePrompter<TConfig extends BaseMCPServerConfig>
```

**Конструктор:**

```typescript
constructor(prompts: ConfigPromptDefinition<TConfig>[])
```

**Методы:**

```typescript
async promptServerConfig(savedConfig?: Partial<TConfig>): Promise<Omit<TConfig, 'projectPath'>>
static async promptClientSelection(clients: MCPClientInfo[]): Promise<string>
static async promptConfirmation(message: string, defaultValue?: boolean): Promise<boolean>
```

### BaseConnector<TConfig>

Абстрактный базовый класс для всех MCP коннекторов.

```typescript
abstract class BaseConnector<TConfig extends BaseMCPServerConfig>
  implements MCPConnector<TConfig>
```

**Абстрактные методы:**

```typescript
abstract getClientInfo(): MCPClientInfo;
abstract isInstalled(): Promise<boolean>;
abstract getStatus(): Promise<ConnectionStatus>;
abstract connect(config: TConfig): Promise<void>;
abstract disconnect(): Promise<void>;
```

**Методы:**

```typescript
validateConfig(config: TConfig): Promise<string[]>
```

**Пример наследования:**

```typescript
class MyConnector extends BaseConnector<MyConfig> {
  getClientInfo() { return {...}; }
  async isInstalled() { return true; }
  async getStatus() { return {...}; }
  async connect(config) { /* ... */ }
  async disconnect() { /* ... */ }
}
```

---

## Команды

### connectCommand(options)

Подключение MCP сервера к клиенту.

```typescript
async function connectCommand<TConfig extends BaseMCPServerConfig>(
  options: ConnectCommandOptions<TConfig>
): Promise<void>
```

### disconnectCommand(options)

Отключение MCP сервера.

```typescript
async function disconnectCommand<TConfig extends BaseMCPServerConfig>(options: {
  registry: IConnectorRegistry<TConfig>;
  cliOptions?: { client?: string };
}): Promise<void>
```

### statusCommand(options)

Показать статус подключений.

```typescript
async function statusCommand<TConfig extends BaseMCPServerConfig>(options: {
  registry: IConnectorRegistry<TConfig>;
}): Promise<void>
```

### listCommand(options)

Список доступных клиентов.

```typescript
async function listCommand<TConfig extends BaseMCPServerConfig>(options: {
  registry: IConnectorRegistry<TConfig>;
}): Promise<void>
```

### validateCommand(options)

Валидация конфигурации.

```typescript
async function validateCommand<TConfig extends BaseMCPServerConfig>(options: {
  registry: IConnectorRegistry<TConfig>;
  configManager: ConfigManager<TConfig>;
  configPrompts: ConfigPromptDefinition<TConfig>[];
  cliOptions?: { client?: string };
}): Promise<void>
```

---

## Утилиты

### CommandExecutor

Выполнение shell команд.

```typescript
static async execute(
  command: string,
  options?: { cwd?: string; env?: NodeJS.ProcessEnv }
): Promise<{
  success: boolean;
  stdout: string;
  stderr: string;
  code: number | null;
}>
```

**Пример:** `const result = await CommandExecutor.execute('ls -la');`

### FileManager

Работа с файлами.

```typescript
static async readJSON<T>(filePath: string): Promise<T>
static async writeJSON(filePath: string, data: unknown): Promise<void>
static async exists(filePath: string): Promise<boolean>
static async ensureDir(dirPath: string): Promise<void>
static async setPermissions(filePath: string, mode: number): Promise<void>
static getHomeDir(): string
```

### Logger

CLI логирование.

```typescript
static info(message: string): void
static success(message: string): void
static error(message: string): void
static warn(message: string): void
static header(message: string): void
static newLine(): void
static spinner(message: string): Ora
```

**Пример:**

```typescript
const spinner = Logger.spinner('Загрузка...');
await operation();
spinner.succeed('Готово!');
```

---

## Коннекторы

### ClaudeDesktopConnector<TConfig>

```typescript
class ClaudeDesktopConnector<TConfig extends BaseMCPServerConfig>
  extends FileBasedConnector<TConfig>
```

**Конструктор:** `new ClaudeDesktopConnector(serverName: string, serverPath: string)`

### ClaudeCodeConnector<TConfig>

```typescript
class ClaudeCodeConnector<TConfig extends BaseMCPServerConfig>
  extends FileBasedConnector<TConfig>
```

**Конструктор:** `new ClaudeCodeConnector(serverName: string, serverPath: string)`

### CodexConnector<TConfig>

```typescript
class CodexConnector<TConfig extends BaseMCPServerConfig>
  extends FileBasedConnector<TConfig>
```

**Конструктор:** `new CodexConnector(serverName: string, serverPath: string)`

### GeminiConnector<TConfig>

```typescript
class GeminiConnector<TConfig extends BaseMCPServerConfig>
  extends FileBasedConnector<TConfig>
```

**Конструктор:** `new GeminiConnector(serverName: string, serverPath: string)`

### QwenConnector<TConfig>

```typescript
class QwenConnector<TConfig extends BaseMCPServerConfig>
  extends FileBasedConnector<TConfig>
```

**Конструктор:** `new QwenConnector(serverName: string, serverPath: string)`

---

## Интерфейсы

### MCPConnector<TConfig>

```typescript
interface MCPConnector<TConfig extends BaseMCPServerConfig> {
  getClientInfo(): MCPClientInfo;
  isInstalled(): Promise<boolean>;
  getStatus(): Promise<ConnectionStatus>;
  connect(config: TConfig): Promise<void>;
  disconnect(): Promise<void>;
  validateConfig(config: TConfig): Promise<string[]>;
}
```

---

## Экспорты

### Главный экспорт

```typescript
export * from './types.js';
export * from './connectors/index.js';
export * from './utils/index.js';
export * from './commands/index.js';
```

### Subpath экспорты

```typescript
import { ... } from '@fractalizer/mcp-cli';           // Все
import { ... } from '@fractalizer/mcp-cli/connectors'; // Только коннекторы
import { ... } from '@fractalizer/mcp-cli/commands';   // Только команды
import { ... } from '@fractalizer/mcp-cli/utils';      // Только утилиты
import { ... } from '@fractalizer/mcp-cli/types';      // Только типы
```

---

## Примеры

Полные примеры использования см. в [README.md](./README.md) и реальной реализации в [`packages/servers/yandex-tracker/src/cli/`](../../servers/yandex-tracker/src/cli/).
