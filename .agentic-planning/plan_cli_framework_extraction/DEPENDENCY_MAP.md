# CLI Dependency Map

**Дата:** 2025-11-22
**Статус:** Completed
**Цель:** Проанализировать граф зависимостей для нового пакета `@mcp-framework/cli`

---

## 🌳 Граф зависимостей с новым CLI пакетом

### Текущий граф (без CLI)

```
infrastructure (0 deps)
    ↓
core (deps: infrastructure)
    ↓
search (deps: core)
    ↓
yandex-tracker (deps: infrastructure, core, search)
```

### Предлагаемый граф (с CLI)

```
infrastructure (0 deps)
    ↓
    ├─→ core (deps: infrastructure)
    │      ↓
    │   search (deps: core)
    │
    └─→ cli (deps: infrastructure) ← НОВЫЙ ПАКЕТ
         ↓
    yandex-tracker (deps: infrastructure, core, search, cli)
```

### Обоснование позиции CLI

**Почему CLI параллельно core/search:**
- ✅ CLI — инфраструктурный инструмент (подключение к клиентам)
- ✅ Не использует domain logic (BaseTool, registry, search)
- ✅ Зависит только от базовых утилит (logger, file operations)
- ✅ Не должен знать о MCP protocol implementation

**Почему CLI зависит от infrastructure:**
- Может использовать logger (если понадобится структурированное логирование)
- Может использовать общие utilities (type guards, validators)
- Совместимость с архитектурой monorepo

**Кто может зависеть от CLI:**
- ✅ yandex-tracker (и другие будущие MCP серверы)
- ❌ core, search, infrastructure (нарушение графа)

---

## 📦 Dependency Map компонентов CLI

### 1. Базовые типы и интерфейсы

#### connectors/base/connector.interface.ts

- ❌ **YT imports:** Нет
- ✅ **Framework imports:** Нет
- ✅ **Node imports:** Нет
- 📝 **Используемые YT типы:** `MCPServerConfig` (имеет YT-специфичные поля)
- **Вердикт:** Требует рефакторинга типов (generic параметризация)

**Действие:**
```typescript
// Было (YT-specific)
export interface MCPServerConfig {
  token: string;        // YT-specific
  orgId: string;        // YT-specific
  projectPath: string;  // Generic
  // ...
}

// Станет (Framework - generic)
export interface BaseMCPServerConfig {
  projectPath: string;
  logLevel?: string;
}

export interface MCPConnector<TConfig extends BaseMCPServerConfig> {
  connect(config: TConfig): Promise<void>;
  // ...
}
```

#### connectors/base/base-connector.ts

- ❌ **YT imports:** Нет
- ✅ **Framework imports:** Нет
- ✅ **Node imports:** `os`
- 📝 **Используемые YT типы:** `MCPServerConfig` (в validateConfig)
- **Вердикт:** Требует параметризации валидации

**Действие:**
```typescript
// Было (YT-specific validation)
async validateConfig(config: MCPServerConfig): Promise<string[]> {
  if (!config.token) errors.push('OAuth токен обязателен');
  if (!config.orgId) errors.push('ID организации обязателен');
  // ...
}

// Станет (Generic - базовая валидация, наследники добавляют свою)
abstract validateConfig(config: TConfig): Promise<string[]>;
```

#### connectors/base/file-based-connector.ts

- ❌ **YT imports:** `#constants` (MCP_SERVER_NAME, SERVER_ENTRY_POINT, ENV_VAR_NAMES, DEFAULT_*)
- ❌ **YT imports:** `#common/type-guards.js` (isError)
- ✅ **Framework imports:** Нет
- ✅ **Node imports:** `path`
- **Вердикт:** Требует параметризации констант

**Используемые константы:**
- `MCP_SERVER_NAME` — идентификатор сервера в конфигах клиентов
- `SERVER_ENTRY_POINT` — путь к entry point (dist/index.js)
- `ENV_VAR_NAMES` — маппинг полей конфига на env vars
- `DEFAULT_API_BASE`, `DEFAULT_LOG_LEVEL`, `DEFAULT_REQUEST_TIMEOUT` — дефолтные значения

**Действие:**
```typescript
// Добавить параметры в конструктор
export abstract class FileBasedConnector<TConfig, TKey, TFormat> {
  constructor(
    protected metadata: MCPServerMetadata,
    protected envMapping: MCPEnvVarMapping,
    protected defaults: Partial<TConfig>
  ) {}
}

// Где:
interface MCPServerMetadata {
  name: string;           // MCP_SERVER_NAME
  entryPoint: string;     // SERVER_ENTRY_POINT
}

interface MCPEnvVarMapping {
  [configKey: string]: string; // token -> YANDEX_TRACKER_TOKEN
}
```

---

### 2. Коннекторы

#### Все коннекторы (claude-desktop, claude-code, codex, gemini, qwen)

- ❌ **YT imports:** `#constants` (MCP_SERVER_NAME, SERVER_ENTRY_POINT, ENV_VAR_NAMES, DEFAULT_*)
- ❌ **YT imports:** `#common/type-guards.js` (isError)
- ✅ **Framework imports:** Нет
- ✅ **Node imports:** `path`, `os`
- **Вердикт:** Требует параметризации через constructor

**Паттерн одинаковый для всех:**
```typescript
// Текущий (YT-specific)
config.mcpServers[MCP_SERVER_NAME] = {
  command: 'node',
  args: [path.join(serverConfig.projectPath, SERVER_ENTRY_POINT)],
  env: {
    [ENV_VAR_NAMES.YANDEX_TRACKER_TOKEN]: serverConfig.token,
    // ...
  },
};

// Будущий (Generic)
config.mcpServers[this.metadata.name] = {
  command: 'node',
  args: [path.join(serverConfig.projectPath, this.metadata.entryPoint)],
  env: this.buildEnvVars(serverConfig),
};
```

**Действие:** Наследовать от параметризованного `FileBasedConnector`

#### connectors/registry.ts

- ❌ **YT imports:** Нет
- ✅ **Framework imports:** Нет
- ✅ **Node imports:** Нет
- **Вердикт:** Готов к выносу как есть

**Детали:**
- Полностью generic
- Hardcoded список коннекторов можно заменить на динамическую регистрацию
- Или оставить как есть (каждый MCP сервер регистрирует свои)

---

### 3. Команды

#### Все команды (connect, disconnect, status, list, validate)

- ❌ **YT imports:** `#common/type-guards.js` (isError) — только в connect и disconnect
- ✅ **Framework imports:** Нет
- ✅ **Node imports:** Нет
- **Вердикт:** Готовы к выносу (после переноса isError в infrastructure)

**Детали:**
- Работают через `ConnectorRegistry` и утилиты
- Не имеют прямых зависимостей от YT-специфичных вещей
- `isError` можно вынести в `@mcp-framework/infrastructure` (trivial utility)

---

### 4. Утилиты

#### utils/command-executor.ts

- ❌ **YT imports:** Нет
- ✅ **Framework imports:** Нет
- ✅ **Node imports:** `child_process`
- **Вердикт:** Готов к выносу как есть

#### utils/file-manager.ts

- ❌ **YT imports:** Нет
- ✅ **Framework imports:** Нет
- ✅ **Node imports:** `fs/promises`, `path`
- 📦 **NPM:** `@iarna/toml`
- **Вердикт:** Готов к выносу как есть

#### utils/logger.ts

- ❌ **YT imports:** Нет
- ✅ **Framework imports:** Нет
- ✅ **Node imports:** Нет
- 📦 **NPM:** `chalk`, `ora`
- **Вердикт:** Готов к выносу как есть

#### utils/config-manager.ts

- ❌ **YT imports:** `#constants` (PROJECT_BASE_NAME)
- ✅ **Framework imports:** Нет
- ✅ **Node imports:** `path`
- 📝 **Используемые YT типы:** `MCPServerConfig`
- **Вердикт:** Требует параметризации

**Используемые константы:**
- `PROJECT_BASE_NAME` — для пути конфига (`.fractalizer_mcp_yandex_tracker/config.json`)

**Действие:**
```typescript
// Было
const CONFIG_DIR = `.${PROJECT_BASE_NAME}`;

// Станет
export class ConfigManager<TConfig extends BaseMCPServerConfig> {
  constructor(
    private projectBaseName: string,
    private safeFields: Array<keyof TConfig>
  ) {
    this.configDir = `.${projectBaseName}`;
  }
}
```

#### utils/interactive-prompter.ts

- ❌ **YT imports:** `#constants` (DEFAULT_LOG_LEVEL)
- ✅ **Framework imports:** Нет
- ✅ **Node imports:** Нет
- 📦 **NPM:** `inquirer`
- 📝 **Используемые YT типы:** `MCPServerConfig`
- **Вердикт:** Требует создания generic версии + YT-специфичные промпты

**Детали:**
- `promptClientSelection()`, `promptConfirmation()`, `promptSelection()` — ✅ Generic
- `promptServerConfig()` — ❌ Fully YT-specific (промпты для token, orgId)

**Действие:** Декларативная система промптов
```typescript
// Framework предоставит механизм
export type ConfigPromptDefinition<T> = {
  name: keyof T;
  type: 'input' | 'password' | 'list';
  message: string;
  default?: unknown;
  validate?: (value: unknown) => string | true;
};

export class GenericInteractivePrompter<TConfig> {
  async promptConfig(
    prompts: ConfigPromptDefinition<TConfig>[],
    savedConfig?: Partial<TConfig>
  ): Promise<TConfig>;
}

// YT определит свои промпты
const ytPrompts: ConfigPromptDefinition<YandexTrackerMCPConfig>[] = [
  { name: 'token', type: 'password', message: 'OAuth токен:', ... },
  { name: 'orgId', type: 'input', message: 'ID организации:', ... },
];
```

---

### 5. Entry Point

#### bin/mcp-connect.ts

- ❌ **YT imports:** `#constants` (MCP_SERVER_NAME, MCP_SERVER_DISPLAY_NAME)
- ❌ **YT imports:** `#common/type-guards.js` (isError)
- ✅ **Framework imports:** Нет (но будет использовать после миграции)
- ✅ **Node imports:** Нет
- 📦 **NPM:** `commander`
- **Вердикт:** Останется в YT (adapter pattern)

**Детали:**
- Этот файл должен остаться в yandex-tracker как адаптер
- Будет импортировать framework команды и конфигурировать их
- Передаст YT-специфичные metadata, prompts, validators

**Пример использования после миграции:**
```typescript
import { program } from 'commander';
import { connectCommand, statusCommand, ... } from '@mcp-framework/cli';
import { ytMetadata, ytPrompts, ytEnvMapping } from './config.js';

const registry = createRegistry(ytMetadata, ytEnvMapping);
const configManager = new ConfigManager(ytMetadata.projectBaseName);

program
  .command('connect')
  .action(async () => {
    await connectCommand({ registry, configManager, prompts: ytPrompts });
  });
```

---

## 🔍 Проблемные зависимости

### Критичные (требуют параметризации)

| Зависимость | Файлы | Решение |
|-------------|-------|---------|
| `PROJECT_BASE_NAME` | config-manager.ts | Передавать в constructor |
| `MCP_SERVER_NAME` | file-based-connector.ts, все коннекторы | Передавать через metadata |
| `SERVER_ENTRY_POINT` | file-based-connector.ts, все коннекторы | Передавать через metadata |
| `ENV_VAR_NAMES` | file-based-connector.ts, все коннекторы | Передавать через envMapping |
| `DEFAULT_*` константы | file-based-connector.ts, все коннекторы | Передавать через defaults |
| `MCPServerConfig` | connector.interface.ts, base-connector.ts, config-manager.ts | Generic параметризация |

### Trivial (легко вынести)

| Зависимость | Файлы | Решение |
|-------------|-------|---------|
| `isError` type guard | file-based-connector.ts, все коннекторы, команды | Вынести в infrastructure |

---

## 🔄 Обратные зависимости

**Проверка:** Кто импортирует что-то из CLI?

```bash
grep -r "from.*cli" packages/servers/yandex-tracker/src/ --exclude-dir=cli
# Результат: пусто
```

✅ **Никто не импортирует CLI** — полная изоляция!

**Выводы:**
- CLI используется только через CLI commands (bin/mcp-connect.ts)
- Нет внутренних зависимостей от CLI в остальном коде YT
- Безопасно выносить в framework — не сломает существующий код

---

## 🛡️ Dependency Cruiser Rules

### Текущие правила (релевантные для CLI)

**Существует правило:**
```javascript
{
  name: 'cli-is-independent',
  severity: 'error',
  comment: 'CLI не зависит от других framework пакетов',
  from: { path: '^packages/cli/' },
  to: { path: '^packages/(infrastructure|core|search|yandex-tracker)/' },
}
```

**Проблема:** Это правило блокирует зависимость CLI от infrastructure!

### Предлагаемые обновления

#### 1. Обновить правило `cli-is-independent`

```javascript
{
  name: 'cli-depends-only-on-infrastructure',
  severity: 'error',
  comment: 'CLI может зависеть только от infrastructure',
  from: {
    path: '^packages/(cli|framework/cli)/',
  },
  to: {
    path: '^packages/(core|search|yandex-tracker|framework/(core|search)|servers/)/',
  },
}
```

#### 2. Обновить правило `infrastructure-bottom-layer`

Убрать `cli` из запрещенных зависимостей для infrastructure:

```javascript
{
  name: 'infrastructure-bottom-layer',
  severity: 'error',
  comment: 'Infrastructure — базовый слой, не зависит от других framework пакетов',
  from: {
    path: '^packages/(infrastructure|framework/infrastructure)/',
  },
  to: {
    path: '^packages/(core|search|cli|yandex-tracker|framework/(core|search|cli)|servers/)/',
    //                      ^^^ убрать cli отсюда
  },
}
```

**Исправлено:**
```javascript
{
  name: 'infrastructure-bottom-layer',
  severity: 'error',
  comment: 'Infrastructure — базовый слой, не зависит от других framework пакетов',
  from: {
    path: '^packages/(infrastructure|framework/infrastructure)/',
  },
  to: {
    path: '^packages/(core|search|yandex-tracker|framework/(core|search)|servers/)/',
    // cli убран — infrastructure НЕ должен зависеть от cli (обратная зависимость)
  },
}
```

#### 3. Обновить правило `no-reverse-dependencies`

Добавить CLI в список базовых пакетов:

```javascript
{
  name: 'no-reverse-dependencies',
  severity: 'error',
  comment: 'Запрет обратных зависимостей в графе пакетов',
  from: {
    path: '^packages/(infrastructure|core|search|cli|framework/(infrastructure|core|search|cli))/',
    //                                        ^^^                                         ^^^
  },
  to: {
    path: '^packages/(yandex-tracker|servers/)/',
  },
}
```

#### 4. Обновить остальные правила

Убедиться, что core и search не могут зависеть от CLI:

```javascript
// Уже есть (OK)
{
  name: 'core-depends-only-on-infrastructure',
  from: { path: '^packages/(core|framework/core)/' },
  to: { path: '^packages/(search|cli|yandex-tracker|framework/search|servers/)/' },
  //                              ^^^ CLI уже в списке запрещенных
}

// Уже есть (OK)
{
  name: 'search-depends-only-on-core-and-infrastructure',
  from: { path: '^packages/(search|framework/search)/' },
  to: { path: '^packages/(cli|yandex-tracker|servers/)/' },
  //                       ^^^ CLI уже в списке запрещенных
}
```

### Итоговый набор правил для CLI

```javascript
// 1. CLI может зависеть только от infrastructure
{
  name: 'cli-depends-only-on-infrastructure',
  severity: 'error',
  from: { path: '^packages/(cli|framework/cli)/' },
  to: { path: '^packages/(core|search|yandex-tracker|framework/(core|search)|servers/)/' },
}

// 2. Infrastructure не зависит от CLI (обратная зависимость)
{
  name: 'infrastructure-bottom-layer',
  severity: 'error',
  from: { path: '^packages/(infrastructure|framework/infrastructure)/' },
  to: { path: '^packages/(core|search|yandex-tracker|framework/(core|search)|servers/)/' },
}

// 3. CLI в списке базовых пакетов (не может зависеть от servers)
{
  name: 'no-reverse-dependencies',
  severity: 'error',
  from: { path: '^packages/(infrastructure|core|search|cli|framework/(infrastructure|core|search|cli))/' },
  to: { path: '^packages/(yandex-tracker|servers/)/' },
}

// 4. Core не зависит от CLI
// 5. Search не зависит от CLI
// (уже покрыто существующими правилами)
```

---

## 📊 Итоговая карта зависимостей

### Framework пакеты

```
infrastructure/
  ├── src/
  │   ├── http/         (может понадобиться CLI для проверок)
  │   ├── cache/        (не нужно CLI)
  │   ├── logger/       (может понадобиться CLI)
  │   └── utils/        (type guards → CLI)
  └── 0 dependencies

cli/
  ├── src/
  │   ├── connectors/   (5 клиентов)
  │   ├── commands/     (5 команд)
  │   ├── utils/        (4 утилиты)
  │   └── types.ts
  └── dependencies: infrastructure

core/
  └── dependencies: infrastructure

search/
  └── dependencies: core, infrastructure
```

### Yandex Tracker

```
yandex-tracker/
  ├── src/
  │   ├── cli/          (адаптер для framework/cli)
  │   │   ├── bin/mcp-connect.ts
  │   │   ├── config.ts (metadata, prompts, env mapping)
  │   │   └── types.ts  (YandexTrackerMCPConfig)
  │   ├── tracker_api/
  │   └── mcp/
  └── dependencies: infrastructure, core, search, cli
```

### Направление зависимостей

```
infrastructure
    ↓
    ├─→ core → search
    │
    └─→ cli
         ↓
     yandex-tracker
```

---

## ✅ Критерии готовности этапа 1.2

- [x] Определено место CLI в графе зависимостей
- [x] Все импорты в CLI проанализированы
- [x] Идентифицированы проблемные зависимости (8 констант + isError)
- [x] Проверены обратные зависимости (нет)
- [x] Предложены правила для dependency-cruiser (4 обновления)
- [x] Документ `DEPENDENCY_MAP.md` создан

---

## 🚀 Следующие шаги

1. ✅ **Этап 1.2 ЗАВЕРШЕН** — Граф зависимостей спроектирован
2. ⏭️ **Этап 1.3** — Дизайн API для generic CLI
3. ⏭️ **Этап 2.1** — Создание структуры пакета

---

## 📝 Ключевые выводы

1. **CLI полностью изолирован** — нет обратных зависимостей из YT
2. **Граф валиден** — CLI параллельно core/search, зависит только от infrastructure
3. **Проблемные зависимости минимальны** — только 8 констант требуют параметризации
4. **Все константы можно параметризовать** — через metadata, envMapping, defaults
5. **isError можно вынести в infrastructure** — trivial type guard
6. **Dependency-cruiser требует 4 обновления** — все понятные и безопасные
7. **Риски минимальны** — чистая архитектура, хорошая изоляция
