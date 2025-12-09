# MCP Servers

Коллекция MCP серверов, построенных на @mcp-framework.

---

## 📁 Структура

```
packages/servers/
├── tsup.config.base.ts    # Общий build конфиг для всех серверов
├── tsconfig.base.json     # Общие TypeScript настройки
└── yandex-tracker/        # Yandex.Tracker MCP Server
    ├── src/
    ├── tsup.config.ts     # Использует defineServerConfig()
    ├── package.json
    └── dist/
        └── yandex-tracker.bundle.js  # Именованный бандл
```

**Будущие серверы:** `github/`, `jira/`, `gitlab/`, etc.

---

## 🚀 Создание нового сервера

### 1. Создать структуру директорий

```bash
mkdir -p packages/servers/{server-name}/src
cd packages/servers/{server-name}
```

### 2. Создать package.json

```json
{
  "name": "@mcp-server/{server-name}",
  "version": "0.1.0",
  "description": "MCP Server for {Service Name}",
  "type": "module",
  "main": "./dist/{server-name}.bundle.js",
  "bin": {
    "mcp-server-{server-name}": "./dist/{server-name}.bundle.js"
  },
  "scripts": {
    "build": "tsc -b && tsup",
    "build:bundle": "tsup",
    "clean": "rimraf dist",
    "dev": "npm run build && node dist/{server-name}.bundle.js",
    "test": "vitest run",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@fractalizer/mcp-core": "*",
    "@fractalizer/mcp-infrastructure": "*",
    "@fractalizer/mcp-search": "*",
    "@modelcontextprotocol/sdk": "^1.22.0"
  },
  "devDependencies": {
    "tsup": "^8.3.5",
    "typescript": "^5.9.3",
    "vitest": "^4.0.8"
  }
}
```

### 3. Создать tsup.config.ts

```typescript
import { defineServerConfig } from '../tsup.config.base.js';

export default defineServerConfig('{server-name}', {
  // Специфичные настройки для этого сервера (опционально)
});
```

**Для сервера с CLI инструментами:**

```typescript
import { defineConfig } from 'tsup';
import { defineServerConfig } from '../tsup.config.base.js';

export default defineConfig([
  // Основной MCP сервер
  defineServerConfig('{server-name}'),

  // CLI инструмент (если нужен)
  {
    entry: ['src/cli/index.ts'],
    outDir: 'dist/cli',
    format: ['esm'],
    platform: 'node',
    bundle: true,
    esbuildOptions: (options) => {
      options.banner = { js: '#!/usr/bin/env node' };
    },
    external: [/* зависимости CLI */],
  },
]);
```

### 4. Создать tsconfig.json

```json
{
  "extends": "../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"],
  "references": [
    { "path": "../framework/infrastructure" },
    { "path": "../framework/core" },
    { "path": "../framework/search" }
  ]
}
```

### 5. Создать src/index.ts (точку входа)

```typescript
#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { Container } from 'inversify';

// Ваша логика инициализации сервера...

async function main() {
  const container = new Container();
  // Setup DI, tools, operations...

  const server = new Server(
    { name: '{server-name}', version: '0.1.0' },
    { capabilities: { tools: {} } }
  );

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch(console.error);
```

### 6. Добавить в workspace

Убедитесь что корневой `package.json` содержит:

```json
{
  "workspaces": ["packages/servers/*"]
}
```

### 7. Установить зависимости и собрать

```bash
npm install
npm run build --workspace=@mcp-server/{server-name}
```

---

## 🔧 Build конфигурация

### Именованные бандлы

Все серверы используют `tsup.config.base.ts` для создания именованных бандлов:

- **Выходной файл:** `dist/{server-name}.bundle.js`
- **Формат:** ESM
- **Платформа:** Node.js 18+
- **Shebang:** автоматически добавляется (`#!/usr/bin/env node`)

### External зависимости

По умолчанию:

- ✅ **External:** `@modelcontextprotocol/sdk` (peer dependency)
- ❌ **Bundled:** все `@mcp-framework/*` пакеты (для самодостаточности)

Можно переопределить в `additionalOptions`:

```typescript
defineServerConfig('my-server', {
  external: [
    '@modelcontextprotocol/sdk',
    'axios', // добавить в external
  ],
});
```

---

## 📚 Документация

### Для каждого сервера создайте:

- `README.md` — описание, установка, использование
- `CLAUDE.md` — правила для ИИ агентов (опционально)
- `CHANGELOG.md` — история изменений

### Пример структуры README:

```markdown
# {Server Name} MCP Server

Описание сервера, его назначение.

## Установка

npm install @mcp-server/{server-name}

## Использование

mcp-server-{server-name}

## Доступные инструменты (tools)

- tool_name_1 — описание
- tool_name_2 — описание
```

---

## ✅ Чек-лист создания нового сервера

- [ ] Создать директорию `packages/servers/{server-name}/`
- [ ] Создать `package.json` с правильным scope (`@mcp-server/`)
- [ ] Создать `tsup.config.ts` используя `defineServerConfig()`
- [ ] Создать `tsconfig.json` с ссылками на framework пакеты
- [ ] Создать `src/index.ts` (точку входа)
- [ ] Добавить зависимости на `@mcp-framework/*`
- [ ] Установить зависимости: `npm install`
- [ ] Собрать: `npm run build --workspace=@mcp-server/{server-name}`
- [ ] Проверить создание бандла: `ls -lh dist/{server-name}.bundle.js`
- [ ] Протестировать: `./dist/{server-name}.bundle.js --version`
- [ ] Создать README.md с документацией
- [ ] Добавить тесты (vitest)
- [ ] Настроить CI/CD (опционально)

---

## 🔗 Ссылки

- **MCP Protocol:** https://github.com/anthropics/mcp
- **Framework Core:** [../framework/core/README.md](../framework/core/README.md)
- **Framework Infrastructure:** [../framework/infrastructure/README.md](../framework/infrastructure/README.md)
- **Framework Search:** [../framework/search/README.md](../framework/search/README.md)
- **Пример (Yandex Tracker):** [./yandex-tracker/README.md](./yandex-tracker/README.md)

---

**Автор:** MCP Framework Team
**Лицензия:** MIT
