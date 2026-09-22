# Contributing Guide

## 🚀 Quick Start для разработчиков

### Установка

```bash
git clone https://github.com/fractalizer/yandex-tracker-mcp.git
cd yandex-tracker-mcp
npm install
```

### Development

```bash
npm run build        # Сборка проекта
npm run test         # Запуск тестов
npm run validate     # Полная валидация (CI-эквивалент)
```

## 📋 Процесс контрибуции

### 1. Создание feature branch

```bash
git checkout -b feature/my-awesome-feature
```

### 2. Разработка

- Следуй [CLAUDE.md](../CLAUDE.md) для правил кодирования
- Пиши тесты для нового функционала
- Убедись что `npm run validate` проходит успешно

### 3. Коммиты

Используем [Conventional Commits](https://www.conventionalcommits.org/):

```
<тип>: краткое описание

Подробности (опционально)

🤖 Generated with Claude Code
Co-Authored-By: Claude <noreply@anthropic.com>
```

**Типы:**
- `feat:` — новый функционал
- `fix:` — исправление бага
- `docs:` — только документация
- `refactor:` — рефакторинг без изменения функционала
- `test:` — добавление/изменение тестов
- `chore:` — обновление зависимостей, конфигурации и т.д.

**Pre-commit hooks** автоматически:
- Форматируют код (Prettier)
- Проверяют коммит-сообщения (commitlint)
- Сканируют секреты (Gitleaks)

### 4. Pull Request

1. Push в свою ветку: `git push origin feature/my-awesome-feature`
2. Открой PR на GitHub
3. Дождись прохождения CI checks
4. Запроси review

## 🔄 CI/CD Pipeline

### CI (`.github/workflows/ci.yml`)

**Триггеры:** каждый push, каждый PR

**Оптимизации для скорости:**
- 🚀 **Параллельные jobs:** 7 независимых проверок одновременно
- ⚡ **Matrix strategy:** 4 security проверки параллельно
- 🔄 **Concurrency control:** отмена устаревших запусков при новом push
- 📦 **npm cache:** ускорение установки зависимостей
- 📋 **Grouping логов:** сворачиваемые секции для читаемости

**Jobs (выполняются параллельно):**
1. **Code Quality** - ESLint, TypeScript, Prettier
2. **Tests & Coverage** - тесты с загрузкой в Codecov
3. **Architecture** - dependency-cruiser, регистрация tools
4. **Security (matrix)** - 4 проверки параллельно:
   - Gitleaks (секреты)
   - Knip (мёртвый код)
   - Lockfile integrity
   - npm audit
5. **Documentation** - валидация размеров
6. **Build** - TypeScript + MCPB bundle
7. **Lint Commits** (только PR) - commitlint

**Final check:** `ci-success` job для branch protection

**Примерное время:** ~2-3 минуты (вместо 8-10 последовательно)

### Release (`.github/workflows/release.yml`)

**Триггер:** push в `main`.

**Этапы:**
1. **Release Please** — держит открытым релизный PR; при его мерже ставит тег и
   создаёт GitHub Release
2. **Validate** — полная валидация на теге, барьер перед публикацией
3. **Publish NPM** — публикация семи пакетов через OIDC Trusted Publishing
4. **Build MCPB** — сборка bundle и прикрепление к релизу

⚠️ Имя файла `release.yml` менять нельзя: trusted publisher на npmjs.com сверяет
именно его. Переименование обрушит публикацию всех пакетов с ошибкой 404.

## 📦 Процесс релиза

Версии не проставляются руками и теги не ставятся вручную — этим занимается
[release-please](https://github.com/googleapis/release-please).

### 1. Влить изменения в `main` через PR

Номер версии считается по Conventional Commits:

| коммит | эффект |
|---|---|
| `fix:` | patch (5.1.0 → 5.1.1) |
| `feat:` | minor (5.1.0 → 5.2.0) |
| `feat!:` / `fix!:` | major (5.1.0 → 6.0.0) |
| `docs:`, `chore:`, `test:`, `ci:` | версию не двигают |

⚠️ Мажор объявляется восклицательным знаком в ЗАГОЛОВКЕ. Футер `BREAKING CHANGE:`
при squash-мерже теряется, и мажорный релиз молча превращается в минорный.

### 2. Дождаться релизного PR

После первого же `feat`/`fix` в `main` робот открывает PR вида
«chore(main): release 5.2.0». Пока он открыт, новые изменения в `main` его обновляют —
релиз копится, а не выпускается.

В PR уже проставлены: версия во всех восьми `package.json`, перезаписанные внутренние
зависимости между пакетами и CHANGELOG.

### 3. Смержить релизный PR

Мерж = выпуск версии. Дальше автоматически: тег `vX.Y.Z`, GitHub Release, публикация
в npm, MCPB-бандлы.

Нужен внеочередной номер версии — правится прямо в релизном PR, а не тегом.

## ⚙️ Настройка Secrets (для maintainers)

### Публикация в npm — токен НЕ нужен

Пакеты публикуются через OIDC Trusted Publishing: GitHub Actions обменивает
собственный id-token на право публикации, секрет в репозитории не хранится.

Настраивается на стороне npmjs.com отдельно для каждого пакета
(Settings → Publishing access → Trusted Publisher):

| поле | значение |
|---|---|
| Publisher | GitHub Actions |
| Organization or user | `FractalizeR` (регистр важен!) |
| Repository | `mcp_servers` |
| Workflow filename | `release.yml` (только имя, без пути) |
| Environment name | `npm-publish` |

Организация в нижнем регистре молча отдаёт 404 — OIDC-claim приходит из GitHub
как `FractalizeR`.

### Права GitHub Actions

Для работы release-please нужна галочка Settings → Actions → General →
Workflow permissions → «Allow GitHub Actions to create and approve pull requests»,
иначе робот не сможет открыть релизный PR.

### CODECOV_TOKEN (опционально)

Для загрузки coverage в [codecov.io](https://codecov.io/):
1. Зарегистрируй проект на Codecov
2. Добавь токен в GitHub Secrets

## 🛠️ Полезные команды

```bash
# Валидация (как в CI)
npm run validate

# Только тесты
npm run test
npm run test:coverage

# Только security audit
npm run validate:security

# Dependency graph
npm run depcruise:graph  # Создаст dependency-graph.svg

# Локальная симуляция release build
npm run build:bundle
```

## 📚 Дополнительная документация

- [CLAUDE.md](../CLAUDE.md) — правила кодирования для ИИ агентов
- [ARCHITECTURE.md](../ARCHITECTURE.md) — архитектура проекта
- [tests/README.md](../packages/servers/yandex-tracker/tests/README.md) — правила тестирования
- [packages/servers/yandex-tracker/src/tools/README.md](../packages/servers/yandex-tracker/src/tools/README.md) — разработка MCP tools

## ❓ Вопросы?

Открывай issue на GitHub или пиши в Discussions!
