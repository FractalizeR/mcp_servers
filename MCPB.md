# MCPB Bundle - Руководство по сборке

**MCP Bundle (.mcpb)** — это упакованный дистрибутив MCP сервера в формате zip-архива, который можно установить одним кликом в совместимых приложениях (например, Claude Desktop).

---

## 📦 Что такое MCPB?

MCPB (Model Context Protocol Bundle) — это стандартизированный формат для распространения MCP серверов, разработанный Anthropic. Формат включает:

- **manifest.json** — метаданные сервера и конфигурация запуска
- **dist/** — скомпилированный код сервера
- **package.json** — npm метаданные (опционально)
- **README.md** — документация (опционально)

Подробнее: https://github.com/anthropics/mcpb

---

## 🚀 Сборка MCPB архива

### Быстрый старт

```bash
# Из корня монорепо
npm run build:mcpb --workspace=@mcp-server/yandex-tracker

# Или из packages/servers/yandex-tracker/
npm run build:mcpb
```

### Результат

Архив будет создан в корне монорепо:
```
fractalizer_mcp_yandex_tracker-0.1.0.mcpb
```

### Что происходит при сборке?

1. **Компиляция** — TypeScript → JavaScript (tsc + tsup)
2. **Валидация** — проверка manifest.json согласно схеме MCP v0.3
3. **Упаковка** — создание zip-архива со всеми необходимыми файлами
4. **Подпись** — (опционально) цифровая подпись архива

---

## 📄 Структура manifest.json

Наш `manifest.json` следует спецификации MCPB v0.3:

```json
{
  "$schema": "https://raw.githubusercontent.com/anthropics/mcpb/main/dist/mcpb-manifest-v0.3.schema.json",
  "manifest_version": "0.3",
  "name": "fractalizer_mcp_yandex_tracker",
  "version": "0.1.0",
  "display_name": "FractalizeR's Yandex Tracker MCP",
  "description": "...",
  "author": { ... },
  "server": {
    "type": "node",
    "entry_point": "dist/yandex-tracker.bundle.js",
    "mcp_config": {
      "command": "node",
      "args": ["${__dirname}/dist/yandex-tracker.bundle.js"],
      "env": { ... }
    }
  },
  "user_config": { ... },
  "compatibility": { ... }
}
```

### Ключевые поля:

- **`server.entry_point`** — путь к главному файлу сервера (бандл)
- **`server.mcp_config`** — команда запуска с подстановкой переменных
- **`user_config`** — параметры, запрашиваемые у пользователя при установке
- **`compatibility`** — требования к runtime и платформе

---

## 🔧 Настройка сборки

### .mcpbignore

Файл `.mcpbignore` (в корне репозитория) определяет, какие файлы исключить из архива:

```
# Исходники
src/
*.ts

# Тесты
tests/
coverage/

# Конфиги разработки
tsconfig*.json
vitest.config.ts
```

### Кастомизация скрипта

Скрипт сборки: `packages/servers/yandex-tracker/scripts/build-mcpb.ts`

Основные параметры:

```typescript
await buildMcpb({
  projectRoot: '/path/to/workspace',
  outputPath: '/path/to/output.mcpb', // опционально
  silent: false
});
```

---

## 🧪 Тестирование MCPB

### Валидация манифеста

```bash
npx @anthropic-ai/mcpb validate manifest.json
```

### Распаковка и проверка содержимого

```bash
# Распаковать архив
npx @anthropic-ai/mcpb unpack fractalizer_mcp_yandex_tracker-0.1.0.mcpb

# Или через unzip
unzip -l fractalizer_mcp_yandex_tracker-0.1.0.mcpb
```

### Локальное тестирование

```bash
# Установить в Claude Desktop (macOS/Windows)
# 1. Откройте Claude Desktop
# 2. Settings → Developer → Extensions
# 3. Перетащите .mcpb файл в окно
```

---

## 📋 CI/CD интеграция

### GitHub Actions пример

```yaml
name: Build MCPB
on:
  release:
    types: [published]

jobs:
  build-mcpb:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '22'

      - run: npm ci
      - run: npm run build:mcpb --workspace=@mcp-server/yandex-tracker

      - uses: actions/upload-artifact@v4
        with:
          name: mcpb-bundle
          path: '*.mcpb'
```

---

## 🔍 Troubleshooting

### Ошибка: "manifest.json не соответствует схеме"

Проверьте обязательные поля:
- `manifest_version: "0.3"`
- `name`, `version`, `description`, `author`
- `server.type`, `server.entry_point`, `server.mcp_config`

### Ошибка: "dist/ не найдена"

Сначала выполните сборку:
```bash
npm run build --workspace=@mcp-server/yandex-tracker
```

### Архив слишком большой

Проверьте `.mcpbignore` — убедитесь что исключены:
- `node_modules/`
- исходники (`src/`)
- тесты

---

## 📚 Дополнительные ресурсы

- [MCPB Specification](https://github.com/anthropics/mcpb/blob/main/MANIFEST.md)
- [MCP Protocol Docs](https://modelcontextprotocol.io)
- [Anthropic Engineering Blog](https://www.anthropic.com/engineering/desktop-extensions)
- [@anthropic-ai/mcpb NPM](https://www.npmjs.com/package/@anthropic-ai/mcpb)

---

## 🤝 Вклад в проект

При изменении manifest.json:

1. Обновите версию в `manifest.json`
2. Валидируйте: `npx @anthropic-ai/mcpb validate manifest.json`
3. Пересоберите: `npm run build:mcpb`
4. Протестируйте установку локально

---

**Версия документа:** 2025-11-17
**MCPB Manifest Version:** 0.3
**@anthropic-ai/mcpb:** ^2.0.1
