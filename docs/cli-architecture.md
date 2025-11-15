# CLI Architecture — Интерактивный инструмент для управления MCP подключениями

## Обзор

Расширяемый CLI инструмент для автоматического подключения MCP сервера к различным клиентам (Claude Desktop, Claude Code, Codex и др.).

### Ключевые возможности

- ✅ **Интерактивный режим** — задает вопросы о конфигурации
- ✅ **Автоопределение** — находит установленные MCP клиенты
- ✅ **Расширяемость** — легкое добавление новых клиентов
- ✅ **Типобезопасность** — полная поддержка TypeScript
- ✅ **Управление** — connect, disconnect, status, list

---

## Структура файлов

```
src/cli/
├── bin/
│   └── mcp-connect.ts              # Entry point, commander setup
│
├── connectors/                      # Коннекторы для разных клиентов
│   ├── base/
│   │   ├── connector.interface.ts  # MCPConnector интерфейс
│   │   └── base-connector.ts       # Абстрактный базовый класс
│   │
│   ├── claude-desktop/
│   │   ├── claude-desktop.connector.ts
│   │   └── types.ts                # Типы для конфигурации Claude Desktop
│   │
│   ├── claude-code/
│   │   ├── claude-code.connector.ts
│   │   └── types.ts
│   │
│   ├── registry.ts                 # ConnectorRegistry — реестр коннекторов
│   └── index.ts
│
├── commands/                        # CLI команды
│   ├── connect.command.ts          # Интерактивное подключение
│   ├── disconnect.command.ts       # Отключение от клиента
│   ├── status.command.ts           # Статус подключений
│   └── list.command.ts             # Список поддерживаемых клиентов
│
├── utils/
│   ├── interactive.ts              # Интерактивные вопросы (inquirer)
│   ├── config-manager.ts           # Чтение/сохранение конфигурации
│   ├── client-detector.ts          # Определение установленных клиентов
│   └── logger.ts                   # CLI логирование (chalk, ora)
│
└── types.ts                        # Общие типы

tests/unit/cli/                           # Тесты CLI
├── connectors/
│   ├── claude-desktop.test.ts
│   └── claude-code.test.ts
└── commands/
    └── connect.test.ts
```

---

## Интерфейсы и типы

### MCPConnector (базовый интерфейс)

```typescript
// src/cli/connectors/base/connector.interface.ts

export interface MCPClientInfo {
  /** Название клиента */
  name: string;

  /** Дружественное отображаемое имя */
  displayName: string;

  /** Описание клиента */
  description: string;

  /** Команда для проверки установки (например, 'claude --version') */
  checkCommand?: string;

  /** Путь к конфигурационному файлу */
  configPath: string;

  /** Платформы, на которых работает клиент */
  platforms: Array<'darwin' | 'linux' | 'win32'>;
}

export interface MCPServerConfig {
  /** OAuth токен Яндекс.Трекера */
  token: string;

  /** ID организации */
  orgId: string;

  /** Базовый URL API (опционально) */
  apiBase?: string;

  /** Уровень логирования */
  logLevel?: 'debug' | 'info' | 'warn' | 'error';

  /** Таймаут запросов */
  requestTimeout?: number;

  /** Абсолютный путь к проекту */
  projectPath: string;
}

export interface ConnectionStatus {
  /** Подключен ли сервер */
  connected: boolean;

  /** Детали подключения */
  details?: {
    /** Путь к конфигу */
    configPath: string;

    /** Время последнего изменения конфига */
    lastModified?: Date;

    /** Дополнительная информация */
    metadata?: Record<string, unknown>;
  };

  /** Ошибка (если есть) */
  error?: string;
}

export interface MCPConnector {
  /** Информация о клиенте */
  getClientInfo(): MCPClientInfo;

  /** Проверить, установлен ли клиент */
  isInstalled(): Promise<boolean>;

  /** Проверить текущий статус подключения */
  getStatus(): Promise<ConnectionStatus>;

  /** Подключить MCP сервер к клиенту */
  connect(config: MCPServerConfig): Promise<void>;

  /** Отключить MCP сервер от клиента */
  disconnect(): Promise<void>;

  /** Валидировать конфигурацию перед подключением */
  validateConfig(config: MCPServerConfig): Promise<string[]>;
}
```

### ConnectorRegistry

```typescript
// src/cli/connectors/registry.ts

export class ConnectorRegistry {
  private connectors: Map<string, MCPConnector>;

  /** Регистрация нового коннектора */
  register(connector: MCPConnector): void;

  /** Получить коннектор по имени */
  get(name: string): MCPConnector | undefined;

  /** Получить все зарегистрированные коннекторы */
  getAll(): MCPConnector[];

  /** Найти установленные клиенты */
  async findInstalled(): Promise<MCPConnector[]>;

  /** Проверить статус всех клиентов */
  async checkAllStatuses(): Promise<Map<string, ConnectionStatus>>;
}
```

---

## Реализация коннекторов

### Claude Desktop Connector

```typescript
// src/cli/connectors/claude-desktop/claude-desktop.connector.ts

import { MCPConnector, MCPClientInfo, MCPServerConfig, ConnectionStatus } from '../base/connector.interface.js';
import { BaseConnector } from '../base/base-connector.js';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

export class ClaudeDesktopConnector extends BaseConnector implements MCPConnector {
  private readonly configPath: string;

  constructor() {
    super();

    // Определение пути в зависимости от платформы
    const platform = os.platform();
    if (platform === 'darwin') {
      this.configPath = path.join(
        os.homedir(),
        'Library/Application Support/Claude/claude_desktop_config.json'
      );
    } else if (platform === 'linux') {
      this.configPath = path.join(
        os.homedir(),
        '.config/claude/claude_desktop_config.json'
      );
    } else {
      // Windows
      this.configPath = path.join(
        process.env.APPDATA || '',
        'Claude/claude_desktop_config.json'
      );
    }
  }

  getClientInfo(): MCPClientInfo {
    return {
      name: 'claude-desktop',
      displayName: 'Claude Desktop',
      description: 'Официальное десктопное приложение Claude от Anthropic',
      configPath: this.configPath,
      platforms: ['darwin', 'linux', 'win32'],
    };
  }

  async isInstalled(): Promise<boolean> {
    try {
      await fs.access(path.dirname(this.configPath));
      return true;
    } catch {
      return false;
    }
  }

  async getStatus(): Promise<ConnectionStatus> {
    // Реализация проверки статуса...
  }

  async connect(config: MCPServerConfig): Promise<void> {
    // Реализация подключения...
  }

  async disconnect(): Promise<void> {
    // Реализация отключения...
  }

  async validateConfig(config: MCPServerConfig): Promise<string[]> {
    // Валидация конфигурации...
  }
}
```

### Claude Code Connector

```typescript
// src/cli/connectors/claude-code/claude-code.connector.ts

export class ClaudeCodeConnector extends BaseConnector implements MCPConnector {
  getClientInfo(): MCPClientInfo {
    return {
      name: 'claude-code',
      displayName: 'Claude Code',
      description: 'CLI инструмент Claude Code для разработки',
      checkCommand: 'claude --version',
      configPath: 'managed-by-cli', // Управляется через `claude mcp` команды
      platforms: ['darwin', 'linux', 'win32'],
    };
  }

  async isInstalled(): Promise<boolean> {
    try {
      const { execSync } = await import('child_process');
      execSync('claude --version', { stdio: 'ignore' });
      return true;
    } catch {
      return false;
    }
  }

  async connect(config: MCPServerConfig): Promise<void> {
    // Использует `claude mcp add` команду
    const { execSync } = await import('child_process');

    const args = [
      'mcp', 'add',
      '--transport', 'stdio',
      'yandex-tracker',
      '--env', `YANDEX_TRACKER_TOKEN=${config.token}`,
      '--env', `YANDEX_ORG_ID=${config.orgId}`,
      '--',
      'node',
      path.join(config.projectPath, 'dist/index.js')
    ];

    execSync(`claude ${args.join(' ')}`, { stdio: 'inherit' });
  }

  async disconnect(): Promise<void> {
    const { execSync } = await import('child_process');
    execSync('claude mcp remove yandex-tracker', { stdio: 'inherit' });
  }

  // ... остальные методы
}
```

---

## CLI команды

### connect — Интерактивное подключение

```typescript
// src/cli/commands/connect.command.ts

import inquirer from 'inquirer';
import { ConnectorRegistry } from '../connectors/registry.js';
import { ConfigManager } from '../utils/config-manager.js';
import { logger } from '../utils/logger.js';

export async function connectCommand(options: { client?: string }): Promise<void> {
  const registry = new ConnectorRegistry();
  const configManager = new ConfigManager();

  // 1. Найти установленные клиенты
  const installedClients = await registry.findInstalled();

  if (installedClients.length === 0) {
    logger.error('Не найдено установленных MCP клиентов');
    logger.info('Поддерживаемые клиенты: Claude Desktop, Claude Code');
    return;
  }

  // 2. Выбрать клиент (если не указан)
  let connector;
  if (options.client) {
    connector = registry.get(options.client);
    if (!connector) {
      logger.error(`Клиент "${options.client}" не найден`);
      return;
    }
  } else {
    const { selectedClient } = await inquirer.prompt([
      {
        type: 'list',
        name: 'selectedClient',
        message: 'Выберите MCP клиент для подключения:',
        choices: installedClients.map(c => {
          const info = c.getClientInfo();
          return {
            name: `${info.displayName} — ${info.description}`,
            value: info.name,
          };
        }),
      },
    ]);

    connector = registry.get(selectedClient);
  }

  if (!connector) return;

  // 3. Спросить конфигурацию (или использовать сохраненную)
  const savedConfig = await configManager.load();
  const config = await promptConfiguration(savedConfig);

  // 4. Валидация
  const errors = await connector.validateConfig(config);
  if (errors.length > 0) {
    logger.error('Ошибки конфигурации:');
    errors.forEach(err => logger.error(`  - ${err}`));
    return;
  }

  // 5. Подключение
  logger.info(`Подключаю к ${connector.getClientInfo().displayName}...`);
  await connector.connect(config);

  // 6. Сохранение конфигурации
  const { saveConfig } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'saveConfig',
      message: 'Сохранить конфигурацию для следующего раза?',
      default: true,
    },
  ]);

  if (saveConfig) {
    await configManager.save(config);
  }

  logger.success('✅ MCP сервер успешно подключен!');
}

async function promptConfiguration(savedConfig?: Partial<MCPServerConfig>) {
  const answers = await inquirer.prompt([
    {
      type: 'password',
      name: 'token',
      message: 'OAuth токен Яндекс.Трекера:',
      default: savedConfig?.token,
      validate: (input) => input.length > 0 || 'Токен обязателен',
      mask: '*',
    },
    {
      type: 'input',
      name: 'orgId',
      message: 'ID организации:',
      default: savedConfig?.orgId,
      validate: (input) => input.length > 0 || 'ID организации обязателен',
    },
    {
      type: 'list',
      name: 'logLevel',
      message: 'Уровень логирования:',
      choices: ['info', 'debug', 'warn', 'error'],
      default: savedConfig?.logLevel || 'info',
    },
  ]);

  return {
    ...answers,
    projectPath: process.cwd(),
  };
}
```

### status — Статус подключений

```typescript
// src/cli/commands/status.command.ts

export async function statusCommand(): Promise<void> {
  const registry = new ConnectorRegistry();
  const statuses = await registry.checkAllStatuses();

  logger.info('\n📊 Статус подключений MCP сервера:\n');

  for (const [name, status] of statuses.entries()) {
    const connector = registry.get(name);
    if (!connector) continue;

    const info = connector.getClientInfo();
    const isInstalled = await connector.isInstalled();

    if (!isInstalled) {
      logger.warn(`${info.displayName}: не установлен`);
      continue;
    }

    if (status.connected) {
      logger.success(`${info.displayName}: ✅ подключен`);
      if (status.details) {
        logger.info(`  Конфиг: ${status.details.configPath}`);
      }
    } else {
      logger.info(`${info.displayName}: ⭕ не подключен`);
    }
  }
}
```

---

## Использование

### Интерактивный режим

```bash
# Запуск интерактивного подключения
npm run mcp:connect

# Или через npx (после публикации)
npx yandex-tracker-mcp connect

# Подключение к конкретному клиенту
npm run mcp:connect -- --client claude-desktop
```

### Проверка статуса

```bash
npm run mcp:status

# Вывод:
# 📊 Статус подключений MCP сервера:
#
# Claude Desktop: ✅ подключен
#   Конфиг: /Users/user/Library/Application Support/Claude/claude_desktop_config.json
#
# Claude Code: ⭕ не подключен
```

### Отключение

```bash
npm run mcp:disconnect -- --client claude-desktop
```

### Список поддерживаемых клиентов

```bash
npm run mcp:list

# Вывод:
# 📋 Поддерживаемые MCP клиенты:
#
# ✅ Claude Desktop (установлен)
#    Официальное десктопное приложение Claude от Anthropic
#
# ✅ Claude Code (установлен)
#    CLI инструмент Claude Code для разработки
#
# ❌ Codex (не установлен)
#    CLI инструмент Codex от Anthropic
```

---

## Добавление нового коннектора

### Шаг 1: Создать класс коннектора

```typescript
// src/cli/connectors/new-client/new-client.connector.ts

import { MCPConnector } from '../base/connector.interface.js';
import { BaseConnector } from '../base/base-connector.js';

export class NewClientConnector extends BaseConnector implements MCPConnector {
  getClientInfo() {
    return {
      name: 'new-client',
      displayName: 'New Client',
      description: 'Описание нового клиента',
      configPath: '/path/to/config',
      platforms: ['darwin', 'linux'],
    };
  }

  async isInstalled(): Promise<boolean> {
    // Реализация проверки установки
  }

  async connect(config: MCPServerConfig): Promise<void> {
    // Реализация подключения
  }

  async disconnect(): Promise<void> {
    // Реализация отключения
  }

  // ... остальные методы
}
```

### Шаг 2: Зарегистрировать в реестре

```typescript
// src/cli/connectors/index.ts

import { ConnectorRegistry } from './registry.js';
import { ClaudeDesktopConnector } from './claude-desktop/claude-desktop.connector.js';
import { ClaudeCodeConnector } from './claude-code/claude-code.connector.js';
import { NewClientConnector } from './new-client/new-client.connector.js';

export function createRegistry(): ConnectorRegistry {
  const registry = new ConnectorRegistry();

  registry.register(new ClaudeDesktopConnector());
  registry.register(new ClaudeCodeConnector());
  registry.register(new NewClientConnector()); // ← Добавить одну строку

  return registry;
}
```

**ВСЁ!** Новый клиент автоматически появится во всех командах CLI.

---

## Зависимости

```json
{
  "dependencies": {
    "commander": "^12.0.0",
    "inquirer": "^10.0.0",
    "chalk": "^5.0.0",
    "ora": "^8.0.0"
  },
  "devDependencies": {
    "@types/inquirer": "^9.0.0"
  }
}
```

---

## npm scripts

```json
{
  "scripts": {
    "mcp:connect": "tsx src/cli/bin/mcp-connect.ts connect",
    "mcp:disconnect": "tsx src/cli/bin/mcp-connect.ts disconnect",
    "mcp:status": "tsx src/cli/bin/mcp-connect.ts status",
    "mcp:list": "tsx src/cli/bin/mcp-connect.ts list"
  }
}
```

---

## Тестирование

```typescript
// tests/unit/cli/connectors/claude-desktop.test.ts

describe('ClaudeDesktopConnector', () => {
  let connector: ClaudeDesktopConnector;

  beforeEach(() => {
    connector = new ClaudeDesktopConnector();
  });

  it('should detect installed Claude Desktop', async () => {
    const isInstalled = await connector.isInstalled();
    expect(typeof isInstalled).toBe('boolean');
  });

  it('should connect to Claude Desktop', async () => {
    const config: MCPServerConfig = {
      token: 'test-token',
      orgId: 'test-org',
      projectPath: '/test/path',
    };

    // Mock fs operations
    await connector.connect(config);

    const status = await connector.getStatus();
    expect(status.connected).toBe(true);
  });
});
```

---

## Безопасность

1. **Токены**: Пароли вводятся через `inquirer` с `type: 'password'` (маскируются)
2. **Хранение**: Конфигурация сохраняется в `~/.yandex-tracker-mcp/config.json` с правами `0600`
3. **Логирование**: Токены НЕ логируются в консоль
4. **Git**: Конфигурация добавлена в `.gitignore`

---

## Следующие шаги

1. ✅ Реализовать базовые интерфейсы
2. ✅ Создать коннекторы для Claude Desktop и Claude Code
3. ✅ Реализовать CLI команды
4. ✅ Добавить интерактивный режим
5. ✅ Написать тесты
6. ✅ Обновить документацию
