# MCP Framework и MCP Серверы

[![CI](https://github.com/FractalizeR/mcp_servers/actions/workflows/ci.yml/badge.svg)](https://github.com/FractalizeR/mcp_servers/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**Monorepo с MCP Framework пакетами и MCP серверами для различных сервисов**

Этот репозиторий содержит:
- **MCP Серверы** — готовые серверы для Yandex Tracker, Yandex Wiki, TickTick
- **MCP Framework** — переиспользуемые пакеты для создания MCP инструментов

---

## 📦 Скачать MCPB Bundles

Готовые бандлы для установки в MCP клиенты (Claude Desktop и др.):

| Сервер | Описание | Скачать |
|--------|----------|---------|
| **Yandex Tracker** | Интеграция с Yandex.Tracker API | [⬇️ mcp-server-yandex-tracker.mcpb](https://github.com/FractalizeR/mcp_servers/releases/latest/download/mcp-server-yandex-tracker.mcpb) |
| **Yandex Wiki** | Интеграция с Yandex Wiki API | [⬇️ mcp-server-yandex-wiki.mcpb](https://github.com/FractalizeR/mcp_servers/releases/latest/download/mcp-server-yandex-wiki.mcpb) |
| **TickTick** | Интеграция с TickTick API | [⬇️ mcp-server-ticktick.mcpb](https://github.com/FractalizeR/mcp_servers/releases/latest/download/mcp-server-ticktick.mcpb) |

> 💡 Все бандлы также доступны на странице [GitHub Releases](https://github.com/FractalizeR/mcp_servers/releases/latest)

---

## Быстрый старт (Пользователи)

### Способ 1: MCPB Bundle (Рекомендуется)

Скачай готовый `.mcpb` бандл по ссылкам выше и установи его напрямую в MCP клиент.

### Способ 2: CLI установка

```bash
# Клонируй репозиторий
git clone https://github.com/FractalizeR/mcp_server_yandex_tracker.git
cd mcp_server_yandex_tracker
npm install && npm run build

# Подключи к MCP клиенту интерактивно
cd packages/servers/yandex-tracker
npm run mcp:connect
```

CLI поддерживает: **Claude Desktop**, **Claude Code**, **Codex**, **Gemini**, **Qwen**

### Способ 3: npm глобальная установка

```bash
npm install -g mcp-server-yandex-tracker
```

Затем настрой Claude Desktop вручную — см. [Yandex Tracker README](packages/servers/yandex-tracker/README.md#установка).

---

## Пакеты

### MCP Серверы

| Пакет | Описание |
|-------|----------|
| [@fractalizer/mcp-server-yandex-tracker](packages/servers/yandex-tracker) | MCP сервер для Yandex.Tracker API (v2/v3) |
| [@fractalizer/mcp-server-yandex-wiki](packages/servers/yandex-wiki) | MCP сервер для Yandex Wiki API |
| [@fractalizer/mcp-server-ticktick](packages/servers/ticktick) | MCP сервер для TickTick API |

### Framework пакеты

| Пакет | Описание |
|-------|----------|
| [@fractalizer/mcp-infrastructure](packages/framework/infrastructure) | HTTP клиент, кэш, логирование, async утилиты |
| [@fractalizer/mcp-cli](packages/framework/cli) | Универсальный CLI для MCP подключений |
| [@fractalizer/mcp-core](packages/framework/core) | Базовые классы, система типов, реестр инструментов |
| [@fractalizer/mcp-search](packages/framework/search) | Поисковый движок с compile-time индексацией |

---

## Архитектура

```
packages/
├── framework/
│   ├── infrastructure/     → @fractalizer/mcp-infrastructure
│   ├── cli/               → @fractalizer/mcp-cli
│   ├── core/              → @fractalizer/mcp-core
│   └── search/            → @fractalizer/mcp-search
└── servers/
    ├── yandex-tracker/    → @fractalizer/mcp-server-yandex-tracker
    ├── yandex-wiki/       → @fractalizer/mcp-server-yandex-wiki
    └── ticktick/          → @fractalizer/mcp-server-ticktick
```

**Граф зависимостей:**
```
infrastructure (0 зависимостей)
    ↓
cli (зависит от infrastructure)
    ↓
core (зависит от infrastructure)
    ↓
search (зависит от core)
    ↓
yandex-tracker (зависит от всех framework пакетов)
```

**Подробности:** [ARCHITECTURE.md](./ARCHITECTURE.md)

---

## Разработка

### Для контрибьюторов

```bash
# Клонируй и настрой
git clone https://github.com/FractalizeR/mcp_server_yandex_tracker.git
cd mcp_server_yandex_tracker
npm install
npm run build
npm run test
```

**Читай руководство:** [.github/CONTRIBUTING.md](.github/CONTRIBUTING.md)

### Для пользователей Framework

```bash
npm install @fractalizer/mcp-infrastructure
npm install @fractalizer/mcp-core
npm install @fractalizer/mcp-search
```

**Примеры использования:** см. README.md в каждом пакете.

### Команды Workspace

```bash
# Установить все зависимости
npm install

# Собрать все пакеты (топологический порядок)
npm run build

# Протестировать все пакеты
npm run test

# Валидация всего monorepo
npm run validate

# Очистить все пакеты
npm run clean
```

### Работа с отдельными пакетами

```bash
# Собрать один пакет
npm run build --workspace=@fractalizer/mcp-core

# Протестировать один пакет
npm run test --workspace=mcp-server-yandex-tracker

# Все команды пакета
cd packages/servers/yandex-tracker
npm run <script>
```

### Управление зависимостями

```bash
# Добавить зависимость в конкретный пакет
npm install axios --workspace=@fractalizer/mcp-infrastructure

# Добавить framework пакет в yandex-tracker
cd packages/servers/yandex-tracker
npm install @fractalizer/mcp-core
```

---

## Документация

### Monorepo

- **[CLAUDE.md](CLAUDE.md)** — руководство для ИИ агентов
- **[ARCHITECTURE.md](ARCHITECTURE.md)** — обзор архитектуры
- **[.github/CONTRIBUTING.md](.github/CONTRIBUTING.md)** — руководство для контрибьюторов

### Пакеты

- **Infrastructure:** [packages/framework/infrastructure/README.md](packages/framework/infrastructure/README.md)
- **CLI:** [packages/framework/cli/README.md](packages/framework/cli/README.md)
- **Core:** [packages/framework/core/README.md](packages/framework/core/README.md)
- **Search:** [packages/framework/search/README.md](packages/framework/search/README.md)
- **Yandex Tracker:** [packages/servers/yandex-tracker/README.md](packages/servers/yandex-tracker/README.md)

---

## Тестирование

**Запустить все тесты:**
```bash
npm run test
```

**С покрытием:**
```bash
npm run test:coverage
```

**Для конкретного пакета:**
```bash
npm run test --workspace=@fractalizer/mcp-core
```

**Watch режим:**
```bash
cd packages/servers/yandex-tracker
npm run test:watch
```

---

## Качество кода

**Линтинг:**
```bash
npm run lint              # Проверить все пакеты
npm run lint:fix          # Исправить автоматически
```

**Проверка типов:**
```bash
npm run typecheck         # Проверить все пакеты
```

**Валидация архитектуры:**
```bash
npm run depcruise         # Валидация графа зависимостей
npm run depcruise:graph   # Сгенерировать визуальный граф
```

**Аудит безопасности:**
```bash
npm run audit:socket      # Анализ supply-chain
npm run audit:secrets     # Сканирование секретов
npm run audit:lockfile    # Проверка package-lock.json
```

**Поиск мертвого кода:**
```bash
npm run knip              # Найти неиспользуемые файлы/экспорты/зависимости
```

---

## Публикация

**Framework пакеты** (`@mcp-framework/*`) публикуются в npm registry.
**Пакет приложения** (`mcp-server-yandex-tracker`) публикуется в npm registry.

**Управление версиями:**
- Используется [Changesets](https://github.com/changesets/changesets)
- Автоматизировано через GitHub Actions при merge в main

**Ручная публикация (при необходимости):**
```bash
# Создать changeset
npx changeset add

# Обновить версии
npx changeset version

# Опубликовать (из main ветки)
npm run publish:all
```

---

## Вклад в проект

Мы приветствуем вклад в проект! Пожалуйста, прочитай:

1. **[.github/CONTRIBUTING.md](.github/CONTRIBUTING.md)** — процесс контрибьюции
2. **[CLAUDE.md](CLAUDE.md)** — соглашения о коде и правила архитектуры
3. **[ARCHITECTURE.md](ARCHITECTURE.md)** — понимание кодовой базы

**Быстрый чек-лист:**
- Форкни и создай feature ветку
- Следуй соглашениям о коде (см. CLAUDE.md)
- Добавь тесты (покрытие ≥80%)
- Запусти `npm run validate` перед коммитом
- Напиши понятные сообщения коммитов
- Открой Pull Request

---

## Лицензия

MIT License — свободное использование, модификация и распространение.

См. [LICENSE](LICENSE) для подробностей.

---

## Ссылки

- **GitHub:** https://github.com/FractalizeR/mcp_server_yandex_tracker
- **Releases:** https://github.com/FractalizeR/mcp_server_yandex_tracker/releases
- **Issues:** https://github.com/FractalizeR/mcp_server_yandex_tracker/issues
- **MCP спецификация:** https://github.com/anthropics/mcp
- **Yandex.Tracker API:** https://cloud.yandex.ru/docs/tracker/about-api

---

## Поддержка

**Нашел баг или есть вопрос?**
1. Проверь [issues](https://github.com/FractalizeR/mcp_server_yandex_tracker/issues)
2. Прочитай документацию пакетов (README.md в каждом пакете)
3. Создай новый issue с подробностями

**Хочешь помочь?**
- Поставь звезду на GitHub
- Сообщи о баге
- Предложи новую фичу
- Сделай Pull Request

---

<div align="center">

**Сделано с любовью для MCP сообщества**

[Наверх](#mcp-framework-и-yandex-tracker-server)

</div>
