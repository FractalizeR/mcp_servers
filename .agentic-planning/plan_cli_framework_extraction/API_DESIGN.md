# API Design: @mcp-framework/cli

**Дата:** 2025-11-22
**Статус:** Draft v1.0

---

## 📋 Обзор

Дизайн публичного API для универсального CLI framework, который может быть использован любым MCP сервером.

**Ключевые принципы:**
- **Generic first**: работает с любым MCP сервером через параметризацию типов
- **Type-safe**: максимальное использование TypeScript для безопасности
- **Extensible**: легко добавить новые коннекторы, промпты, валидаторы
- **Simple**: минимальный boilerplate для пользователя

---

## 🎯 Цели API

1. **Универсальность**: любой MCP сервер может использовать CLI без изменений в framework
2. **Типобезопасность**: полная поддержка TypeScript inference и generics
3. **Расширяемость**: простое добавление новых клиентов и промптов
4. **DX (Developer Experience)**: минимум кода для интеграции

---

## 📦 Public API

### 1. Базовые типы и интерфейсы

#### BaseMCPServerConfig

```typescript
/**
 * Базовая конфигурация для любого MCP сервера
 * Все MCP серверы должны расширять этот интерфейс
 */
export interface BaseMCPServerConfig {
  /** Абсолютный путь к директории проекта */
  projectPath: string;

  /** Уровень логирования */
  logLevel?: 'debug' | 'info' | 'warn' | 'error';

  /** Дополнительные переменные окружения для MCP сервера */
  env?: Record<string, string>;
}
```

**Обоснование:**
- `projectPath` — обязателен для всех MCP серверов (передается в `command`)
- `logLevel`, `env` — стандартные опции, которые могут понадобиться любому серверу
- Минималистичен — только то, что действительно универсально

**Пример расширения:**
```typescript
// В yandex-tracker
export interface YandexTrackerMCPConfig extends BaseMCPServerConfig {
  token: string;
  orgId: string;
  apiBase?: string;
  requestTimeout?: number;
}
```

---

#### MCPClientInfo

```typescript
/**
 * Информация о MCP клиенте (Claude Desktop, Claude Code и т.д.)
 */
export interface MCPClientInfo {
  /** Уникальное имя клиента (используется как ключ) */
  name: string;

  /** Отображаемое имя для пользователя */
  displayName: string;

  /** Описание клиента */
  description: string;

  /** Команда для проверки установки (например, 'claude --version') */
  checkCommand?: string;

  /** Путь к конфигурационному файлу */
  configPath: string;

  /** Поддерживаемые платформы */
  platforms: Array<'darwin' | 'linux' | 'win32'>;
}
```

**Изменения:** Нет, этот тип полностью generic.

---

#### ConnectionStatus

```typescript
/**
 * Статус подключения MCP сервера к клиенту
 */
export interface ConnectionStatus {
  /** Подключен ли сервер */
  connected: boolean;

  /** Детали подключения */
  details?: {
    /** Путь к конфигурационному файлу клиента */
    configPath: string;

    /** Время последнего изменения конфига */
    lastModified?: Date;

    /** Дополнительная информация */
    metadata?: Record<string, unknown>;
  };

  /** Ошибка (если есть) */
  error?: string;
}
```

**Изменения:** Нет, этот тип полностью generic.

---

#### MCPConnector<TConfig>

```typescript
/**
 * Базовый интерфейс для всех MCP коннекторов
 * Generic по типу конфигурации сервера
 */
export interface MCPConnector<TConfig extends BaseMCPServerConfig = BaseMCPServerConfig> {
  /** Получить информацию о клиенте */
  getClientInfo(): MCPClientInfo;

  /** Проверить, установлен ли клиент в системе */
  isInstalled(): Promise<boolean>;

  /** Получить текущий статус подключения */
  getStatus(): Promise<ConnectionStatus>;

  /** Подключить MCP сервер к клиенту */
  connect(config: TConfig): Promise<void>;

  /** Отключить MCP сервер от клиента */
  disconnect(): Promise<void>;

  /** Валидировать конфигурацию перед подключением */
  validateConfig(config: TConfig): Promise<string[]>;
}
```

**Изменения:**
- Добавлен generic параметр `TConfig extends BaseMCPServerConfig`
- Все методы теперь работают с generic типом
- Default = `BaseMCPServerConfig` для обратной совместимости

---

#### MCPClientServerConfig

```typescript
/**
 * Конфигурация MCP сервера для записи в файл клиента (JSON/TOML)
 */
export interface MCPClientServerConfig {
  command: string;
  args: string[];
  env: Record<string, string>;
}
```

**Изменения:** Нет.

---

#### MCPClientConfig<TKey>

```typescript
/**
 * Базовая структура конфигурационного файла MCP клиента
 * Generic тип для разных форматов (mcpServers, mcp_servers и т.д.)
 */
export type MCPClientConfig<TKey extends string = 'mcpServers'> = {
  [K in TKey]?: Record<string, MCPClientServerConfig>;
};
```

**Изменения:** Нет.

---

### 2. Система промптов

#### PromptType

```typescript
/**
 * Типы промптов для сбора конфигурации
 */
export type PromptType = 'input' | 'password' | 'list' | 'confirm' | 'number';
```

---

#### ConfigPromptDefinition<TConfig, K>

```typescript
/**
 * Определение промпта для сбора конфигурации
 * Generic по типу конфигурации и ключу поля
 */
export interface ConfigPromptDefinition<
  TConfig extends BaseMCPServerConfig,
  K extends keyof TConfig = keyof TConfig
> {
  /** Имя поля в конфигурации */
  name: K;

  /** Тип промпта */
  type: PromptType;

  /** Сообщение для пользователя */
  message: string;

  /** Значение по умолчанию (может быть функцией от сохраненной конфигурации) */
  default?: TConfig[K] | ((savedConfig?: Partial<TConfig>) => TConfig[K] | undefined);

  /** Функция валидации */
  validate?: (value: TConfig[K]) => string | true;

  /** Варианты выбора (для type: 'list') */
  choices?: Array<{ name: string; value: TConfig[K] }>;

  /** Условное отображение промпта */
  when?: (answers: Partial<TConfig>) => boolean;

  /** Маска для ввода (для type: 'password') */
  mask?: string;
}
```

**Особенности:**
- Generic по `TConfig` — типобезопасность для полей
- Generic по `K extends keyof TConfig` — автокомплит для `name`
- `default` может быть значением или функцией от `savedConfig`
- `validate` возвращает `string` (ошибка) или `true` (ok)
- `choices` для type='list', типизированы по `TConfig[K]`
- `when` для условного отображения

**Пример использования:**
```typescript
const prompts: ConfigPromptDefinition<YandexTrackerMCPConfig>[] = [
  {
    name: 'token',
    type: 'password',
    message: 'OAuth токен:',
    mask: '*',
    validate: (v) => v.length > 0 || 'Токен обязателен',
  },
  {
    name: 'orgId',
    type: 'input',
    message: 'ID организации:',
    default: (saved) => saved?.orgId,
    validate: (v) => v.length > 0 || 'ID обязателен',
  },
  {
    name: 'logLevel',
    type: 'list',
    message: 'Уровень логирования:',
    choices: [
      { name: 'Debug', value: 'debug' },
      { name: 'Info', value: 'info' },
    ],
    default: 'info',
  },
];
```

---

### 3. ConfigManager

#### ConfigManagerOptions<TConfig>

```typescript
/**
 * Опции для ConfigManager
 */
export interface ConfigManagerOptions<TConfig extends BaseMCPServerConfig> {
  /** Название проекта (для ~/.{projectName}/config.json) */
  projectName: string;

  /**
   * Поля конфигурации, которые можно сохранять (без секретов!)
   * Например: ['orgId', 'logLevel', 'apiBase']
   */
  safeFields: Array<keyof TConfig>;

  /**
   * Опционально: кастомная сериализация перед записью в файл
   */
  serialize?: (config: TConfig) => Record<string, unknown>;

  /**
   * Опционально: кастомная десериализация после чтения из файла
   */
  deserialize?: (data: Record<string, unknown>) => Partial<TConfig>;
}
```

---

#### ConfigManager<TConfig>

```typescript
/**
 * Управление сохраненной конфигурацией MCP сервера
 */
export class ConfigManager<TConfig extends BaseMCPServerConfig> {
  constructor(private readonly options: ConfigManagerOptions<TConfig>) {}

  /**
   * Загрузить сохраненную конфигурацию из ~/.{projectName}/config.json
   * @returns Partial конфигурация (без секретов) или undefined если не найдена
   */
  async load(): Promise<Partial<TConfig> | undefined>;

  /**
   * Сохранить конфигурацию (только safeFields)
   * @param config - Полная конфигурация (секреты будут отфильтрованы)
   */
  async save(config: TConfig): Promise<void>;

  /**
   * Удалить сохраненную конфигурацию
   */
  async delete(): Promise<void>;

  /**
   * Проверить существование сохраненной конфигурации
   */
  async exists(): Promise<boolean>;

  /**
   * Получить путь к файлу конфигурации
   */
  getConfigPath(): string;
}
```

**Пример использования:**
```typescript
const configManager = new ConfigManager<YandexTrackerMCPConfig>({
  projectName: 'fractalizer_mcp_yandex_tracker',
  safeFields: ['orgId', 'logLevel', 'apiBase', 'requestTimeout'],
});

// Загрузить
const saved = await configManager.load(); // Partial<YandexTrackerMCPConfig> | undefined

// Сохранить (токен будет отфильтрован автоматически)
await configManager.save({
  token: 'secret',
  orgId: 'org123',
  projectPath: '/path/to/project',
  logLevel: 'info',
});
```

---

### 4. InteractivePrompter

#### InteractivePrompter<TConfig>

```typescript
/**
 * Интерактивные вопросы пользователю
 */
export class InteractivePrompter<TConfig extends BaseMCPServerConfig> {
  /**
   * Запросить конфигурацию сервера через интерактивные промпты
   * @param prompts - Определения промптов
   * @param savedConfig - Ранее сохраненная конфигурация (для значений по умолчанию)
   * @returns Собранная конфигурация (без projectPath - он добавляется отдельно)
   */
  static async promptServerConfig<T extends BaseMCPServerConfig>(
    prompts: ConfigPromptDefinition<T>[],
    savedConfig?: Partial<T>
  ): Promise<Omit<T, 'projectPath'>>;

  /**
   * Выбор клиента из списка
   * @param clients - Список доступных клиентов
   * @returns Имя выбранного клиента
   */
  static async promptClientSelection(clients: MCPClientInfo[]): Promise<string>;

  /**
   * Подтверждение (yes/no)
   * @param message - Сообщение для пользователя
   * @param defaultValue - Значение по умолчанию
   */
  static async promptConfirmation(message: string, defaultValue?: boolean): Promise<boolean>;

  /**
   * Выбор элемента из списка
   * @param message - Сообщение для пользователя
   * @param choices - Варианты выбора
   */
  static async promptSelection<T extends string>(
    message: string,
    choices: Array<{ name: string; value: T }>
  ): Promise<T>;
}
```

**Изменения:**
- `promptServerConfig` стал generic и принимает `ConfigPromptDefinition[]`
- Больше не hardcode промпты внутри — полностью параметризован

---

### 5. ConnectorRegistry

#### ConnectorRegistry<TConfig>

```typescript
/**
 * Реестр MCP коннекторов
 */
export class ConnectorRegistry<TConfig extends BaseMCPServerConfig = BaseMCPServerConfig> {
  /**
   * Создать реестр со стандартными коннекторами
   * @param autoRegister - Автоматически зарегистрировать стандартные коннекторы (default: true)
   */
  constructor(autoRegister?: boolean);

  /**
   * Зарегистрировать коннектор
   * @param connector - Коннектор для регистрации
   */
  register(connector: MCPConnector<TConfig>): void;

  /**
   * Получить коннектор по имени
   * @param name - Имя клиента
   */
  get(name: string): MCPConnector<TConfig> | undefined;

  /**
   * Получить все зарегистрированные коннекторы
   */
  getAll(): MCPConnector<TConfig>[];

  /**
   * Найти установленные в системе клиенты
   */
  async findInstalled(): Promise<MCPConnector<TConfig>[]>;

  /**
   * Проверить статус всех зарегистрированных клиентов
   */
  async checkAllStatuses(): Promise<Map<string, ConnectionStatus>>;
}
```

**Изменения:**
- Generic по `TConfig`
- Параметр `autoRegister` для отключения автоматической регистрации (если кто-то хочет custom набор)

---

### 6. CLI Commands

#### ConnectCommandOptions<TConfig>

```typescript
/**
 * Опции для команды connect
 */
export interface ConnectCommandOptions<TConfig extends BaseMCPServerConfig> {
  /** Реестр коннекторов */
  registry: ConnectorRegistry<TConfig>;

  /** Менеджер конфигурации */
  configManager: ConfigManager<TConfig>;

  /** Промпты для сбора конфигурации */
  configPrompts: ConfigPromptDefinition<TConfig>[];

  /** CLI опции (из commander) */
  cliOptions?: {
    client?: string;
  };

  /** Опционально: функция для добавления projectPath к конфигу */
  buildConfig?: (serverConfig: Omit<TConfig, 'projectPath'>) => TConfig;
}
```

---

#### connectCommand<TConfig>()

```typescript
/**
 * Команда подключения MCP сервера к клиенту
 */
export async function connectCommand<TConfig extends BaseMCPServerConfig>(
  options: ConnectCommandOptions<TConfig>
): Promise<void>;
```

**Пример использования:**
```typescript
import { connectCommand } from '@mcp-framework/cli';

await connectCommand<YandexTrackerMCPConfig>({
  registry,
  configManager,
  configPrompts: ytConfigPrompts,
  cliOptions: { client: 'claude-desktop' },
  buildConfig: (serverConfig) => ({
    ...serverConfig,
    projectPath: process.cwd(),
  }),
});
```

---

#### statusCommand<TConfig>()

```typescript
/**
 * Команда проверки статуса подключений
 */
export async function statusCommand<TConfig extends BaseMCPServerConfig>(
  registry: ConnectorRegistry<TConfig>
): Promise<void>;
```

---

#### listCommand()

```typescript
/**
 * Команда вывода списка доступных клиентов
 */
export async function listCommand<TConfig extends BaseMCPServerConfig>(
  registry: ConnectorRegistry<TConfig>
): Promise<void>;
```

---

#### disconnectCommand<TConfig>()

```typescript
/**
 * Команда отключения MCP сервера от клиента
 */
export async function disconnectCommand<TConfig extends BaseMCPServerConfig>(options: {
  registry: ConnectorRegistry<TConfig>;
  cliOptions?: {
    client?: string;
    all?: boolean;
  };
}): Promise<void>;
```

---

#### validateCommand<TConfig>()

```typescript
/**
 * Команда валидации конфигурации
 */
export async function validateCommand<TConfig extends BaseMCPServerConfig>(options: {
  registry: ConnectorRegistry<TConfig>;
  configManager: ConfigManager<TConfig>;
  cliOptions?: {
    client?: string;
  };
}): Promise<void>;
```

---

### 7. Утилиты

#### Logger

```typescript
/**
 * CLI логгер (chalk + ora)
 */
export class Logger {
  static header(message: string): void;
  static info(message: string): void;
  static success(message: string): void;
  static warn(message: string): void;
  static error(message: string): void;
  static newLine(): void;
  static spinner(text: string): {
    stop(): void;
    succeed(text?: string): void;
    fail(text?: string): void;
  };
}
```

---

#### FileManager

```typescript
/**
 * Управление файлами и директориями
 */
export class FileManager {
  static async exists(path: string): Promise<boolean>;
  static async ensureDir(path: string): Promise<void>;
  static async readJSON<T>(path: string): Promise<T>;
  static async writeJSON(path: string, data: unknown): Promise<void>;
  static async setPermissions(path: string, mode: number): Promise<void>;
  static getHomeDir(): string;
  static expandPath(path: string): string;
}
```

---

#### CommandExecutor

```typescript
/**
 * Выполнение shell команд
 */
export class CommandExecutor {
  static async execute(command: string, options?: {
    silent?: boolean;
    cwd?: string;
  }): Promise<{ stdout: string; stderr: string; exitCode: number }>;

  static async executeAndCheck(command: string): Promise<boolean>;
}
```

---

## 📚 Примеры использования

### Yandex Tracker интеграция

```typescript
// packages/servers/yandex-tracker/src/cli/config/prompts.ts
import type { ConfigPromptDefinition } from '@mcp-framework/cli';
import type { YandexTrackerMCPConfig } from './types.js';

export const ytConfigPrompts: ConfigPromptDefinition<YandexTrackerMCPConfig>[] = [
  {
    name: 'token',
    type: 'password',
    message: 'OAuth токен Яндекс.Трекера:',
    mask: '*',
    validate: (v) => v.length > 0 || 'Токен обязателен',
  },
  {
    name: 'orgId',
    type: 'input',
    message: 'ID организации:',
    default: (saved) => saved?.orgId,
    validate: (v) => v.length > 0 || 'ID обязателен',
  },
  {
    name: 'logLevel',
    type: 'list',
    message: 'Уровень логирования:',
    choices: [
      { name: 'Debug', value: 'debug' },
      { name: 'Info', value: 'info' },
      { name: 'Warning', value: 'warn' },
      { name: 'Error', value: 'error' },
    ],
    default: 'info',
  },
];
```

```typescript
// packages/servers/yandex-tracker/src/cli/bin/mcp-connect.ts
import { program } from 'commander';
import {
  connectCommand,
  disconnectCommand,
  statusCommand,
  listCommand,
  validateCommand,
  ConnectorRegistry,
  ConfigManager,
} from '@mcp-framework/cli';
import { ytConfigPrompts } from '../config/prompts.js';
import type { YandexTrackerMCPConfig } from '../config/types.js';

const registry = new ConnectorRegistry<YandexTrackerMCPConfig>();
const configManager = new ConfigManager<YandexTrackerMCPConfig>({
  projectName: 'fractalizer_mcp_yandex_tracker',
  safeFields: ['orgId', 'logLevel', 'apiBase', 'requestTimeout'],
});

program
  .command('connect')
  .option('--client <name>', 'MCP клиент')
  .action(async (opts) => {
    await connectCommand<YandexTrackerMCPConfig>({
      registry,
      configManager,
      configPrompts: ytConfigPrompts,
      cliOptions: opts,
      buildConfig: (serverConfig) => ({
        ...serverConfig,
        projectPath: process.cwd(),
      }),
    });
  });

program
  .command('status')
  .action(async () => {
    await statusCommand(registry);
  });

program
  .command('list')
  .action(async () => {
    await listCommand(registry);
  });

program
  .command('disconnect')
  .option('--client <name>', 'MCP клиент')
  .option('--all', 'Отключить от всех')
  .action(async (opts) => {
    await disconnectCommand({ registry, cliOptions: opts });
  });

program
  .command('validate')
  .option('--client <name>', 'MCP клиент')
  .action(async (opts) => {
    await validateCommand({ registry, configManager, cliOptions: opts });
  });

program.parse();
```

---

## 🔄 Сравнение: До vs После

### До (текущий yandex-tracker CLI)

```typescript
// Hardcoded в InteractivePrompter
static async promptServerConfig(
  savedConfig?: Partial<MCPServerConfig>
): Promise<Omit<MCPServerConfig, 'projectPath'>> {
  // Hardcoded промпты для YT
  const answers = await inquirer.prompt([
    { type: 'password', name: 'token', message: 'OAuth токен:' },
    // ...
  ]);
}

// Hardcoded в ConfigManager
const CONFIG_DIR = `.fractalizer_mcp_yandex_tracker`;

// Hardcoded список safeFields
const safeConfig: Partial<MCPServerConfig> = {
  orgId: config.orgId,
  projectPath: config.projectPath,
};
```

**Проблемы:**
- ❌ Невозможно использовать для других MCP серверов
- ❌ Hardcoded константы и промпты
- ❌ Нет типобезопасности для расширений

---

### После (generic framework CLI)

```typescript
// Generic промпты
const prompts: ConfigPromptDefinition<MyMCPConfig>[] = [
  { name: 'apiKey', type: 'password', message: 'API Key:' },
];

// Generic ConfigManager
const configManager = new ConfigManager<MyMCPConfig>({
  projectName: 'my_mcp_server',
  safeFields: ['orgId', 'apiBase'],
});

// Generic команда
await connectCommand<MyMCPConfig>({
  registry,
  configManager,
  configPrompts: prompts,
});
```

**Преимущества:**
- ✅ Полностью generic и переиспользуемый
- ✅ Типобезопасность через generics
- ✅ Параметризация через options
- ✅ Простая интеграция в любой MCP сервер

---

## 🚨 Breaking Changes

### Для пользователей yandex-tracker

**НЕТ breaking changes!** Пользовательский опыт остается таким же:

```bash
# Все команды работают как раньше
npx mcp-connect connect
npx mcp-connect status
npx mcp-connect disconnect
```

### Для разработчиков (внутренний API)

**Breaking changes** (только если кто-то импортирует internal модули):

1. **MCPConnector** теперь generic:
   ```typescript
   // Было
   interface MCPConnector {
     connect(config: MCPServerConfig): Promise<void>;
   }

   // Стало
   interface MCPConnector<TConfig extends BaseMCPServerConfig> {
     connect(config: TConfig): Promise<void>;
   }
   ```

2. **ConfigManager** требует options:
   ```typescript
   // Было
   const manager = new ConfigManager();

   // Стало
   const manager = new ConfigManager({
     projectName: 'name',
     safeFields: ['field1'],
   });
   ```

3. **InteractivePrompter.promptServerConfig** требует prompts:
   ```typescript
   // Было
   const config = await InteractivePrompter.promptServerConfig(saved);

   // Стало
   const config = await InteractivePrompter.promptServerConfig(prompts, saved);
   ```

---

## 📐 Диаграмма архитектуры

```
┌─────────────────────────────────────────────────────────────────┐
│                   @mcp-framework/cli                            │
│                                                                 │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐       │
│  │   Types      │   │  Connectors  │   │   Commands   │       │
│  ├──────────────┤   ├──────────────┤   ├──────────────┤       │
│  │ BaseConfig   │   │ Registry<T>  │   │ connect<T>() │       │
│  │ MCPConnector │   │ ClaudeDesktop│   │ status<T>()  │       │
│  │ ClientInfo   │   │ ClaudeCode   │   │ list<T>()    │       │
│  │ PromptDef    │   │ Codex        │   │ disconnect   │       │
│  └──────────────┘   │ Gemini       │   │ validate     │       │
│                     │ Qwen         │   └──────────────┘       │
│  ┌──────────────┐   └──────────────┘                          │
│  │   Utils      │                                              │
│  ├──────────────┤   ┌──────────────┐   ┌──────────────┐       │
│  │ ConfigMgr<T> │   │ FileManager  │   │   Logger     │       │
│  │ Prompter<T>  │   │ CommandExec  │   │   (chalk)    │       │
│  └──────────────┘   └──────────────┘   └──────────────┘       │
└─────────────────────────────────────────────────────────────────┘
                              ↓ depends on
                    ┌───────────────────────┐
                    │ @mcp-framework/       │
                    │   infrastructure      │
                    │  (FileManager, etc)   │
                    └───────────────────────┘

                              ↑ extends
┌─────────────────────────────────────────────────────────────────┐
│              @mcp-server/yandex-tracker                         │
│                                                                 │
│  ┌──────────────────────────────────────────────────────┐     │
│  │  src/cli/                                            │     │
│  ├──────────────────────────────────────────────────────┤     │
│  │  config/                                             │     │
│  │    ├─ types.ts (YandexTrackerMCPConfig)             │     │
│  │    └─ prompts.ts (ytConfigPrompts)                  │     │
│  │                                                      │     │
│  │  bin/                                                │     │
│  │    └─ mcp-connect.ts (использует CLI framework)     │     │
│  └──────────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────────┘
```

---

## ✅ Критерии готовности

- [x] Базовые типы определены и документированы
- [x] Система промптов спроектирована
- [x] ConfigManager API определен
- [x] InteractivePrompter API определен
- [x] CLI команды имеют четкую сигнатуру
- [x] Примеры использования для yandex-tracker написаны
- [x] Сравнение "До vs После" выполнено
- [x] Диаграмма архитектуры создана
- [x] Breaking changes документированы

---

## 🎯 Следующие шаги

1. Создать структуру пакета `packages/framework/cli` (этап 2.1)
2. Реализовать базовые типы (этап 2.2)
3. Вынести коннекторы (этап 2.3)
4. Реализовать generic компоненты (этапы 3.1-3.3)
5. Реализовать команды (этапы 4.1-4.3)
6. Мигрировать yandex-tracker (этап 5)
