# CLI — Управление подключениями MCP сервера

Интерактивный инструмент для автоматического подключения MCP сервера к клиентам.

## Быстрый старт

```bash
# Собрать проект
npm run build

# Подключиться к клиенту
npm run mcp:connect
```

## Команды

### `npm run mcp:connect`
Интерактивное подключение MCP сервера к клиенту.

**Что делает:**
1. Находит установленные MCP клиенты (Claude Desktop, Claude Code, Codex)
2. Предлагает выбрать клиент
3. Запрашивает конфигурацию (токен, org_id, log_level)
4. Настраивает подключение
5. Сохраняет конфигурацию для следующего раза

**Опции:**
- `--client <name>` — указать клиент напрямую (`claude-desktop`, `claude-code`, `codex`)

**Пример:**
```bash
npm run mcp:connect -- --client claude-desktop
```

---

### `npm run mcp:disconnect`
Отключить MCP сервер от клиента.

**Опции:**
- `--client <name>` — указать клиент для отключения

**Пример:**
```bash
npm run mcp:disconnect -- --client claude-desktop
```

---

### `npm run mcp:status`
Проверить статус подключений MCP сервера ко всем клиентам.

**Вывод:**
- ✅ Подключен — сервер настроен и работает
- ⭕ Не подключен — сервер не настроен
- ❌ Не установлен — клиент отсутствует в системе

---

### `npm run mcp:list`
Показать список поддерживаемых MCP клиентов.

---

## Поддерживаемые клиенты

### Claude Desktop
- **Платформы:** macOS, Linux, Windows
- **Конфигурация:** `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Метод:** прямая запись в JSON конфиг

### Claude Code
- **Платформы:** macOS, Linux, Windows
- **Конфигурация:** управляется через CLI
- **Метод:** `claude mcp add` команда

### Codex
- **Платформы:** macOS, Linux, Windows
- **Конфигурация:** `~/.codex/config.toml`
- **Метод:** `codex mcp add` команда + fallback через TOML

---

## Сохранение конфигурации

CLI сохраняет конфигурацию в `~/.fyt-mcp/config.json` для повторного использования.

**Что сохраняется:**
- ID организации
- Уровень логирования
- Путь к проекту
- ⚠️ **Токен НЕ сохраняется** (для безопасности)

**Права доступа:** `0600` (только владелец может читать/писать)

---

## Добавление нового клиента

1. Создай класс коннектора в `src/cli/connectors/new-client/`
2. Реализуй интерфейс `MCPConnector`
3. Зарегистрируй в `src/cli/connectors/registry.ts`:

```typescript
import { NewClientConnector } from './new-client/new-client.connector.js';

constructor() {
  this.register(new ClaudeDesktopConnector());
  this.register(new ClaudeCodeConnector());
  this.register(new CodexConnector());
  this.register(new NewClientConnector()); // ← одна строка
}
```

**ВСЁ!** Новый клиент появится во всех командах автоматически.

---

## Устранение проблем

**CLI не находит клиент:**
- Убедись, что клиент установлен
- Проверь доступность команды: `claude --version`, `codex --version`

**Ошибка подключения:**
- Проверь корректность токена и org_id
- Запусти `npm run mcp:status` для диагностики

**Токен не работает:**
- Убедись, что токен получен через https://oauth.yandex.ru/
- Проверь права доступа: `tracker:read`, `tracker:write`
