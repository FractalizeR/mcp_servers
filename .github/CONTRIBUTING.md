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

**Триггер:** push тега вида `v*.*.*` (например, `v1.0.0`)

**Этапы:**
1. **Validate** — полная валидация перед релизом
2. **Publish NPM** — публикация в npm registry
3. **Build MCPB** — сборка standalone bundle
4. **GitHub Release** — создание release с артефактами

## 📦 Процесс релиза

### 1. Обновить версию

```bash
# Patch (0.1.0 -> 0.1.1)
npm version patch

# Minor (0.1.0 -> 0.2.0)
npm version minor

# Major (0.1.0 -> 1.0.0)
npm version major
```

Эта команда:
- Обновит `package.json`
- Создаст git tag `v{version}`
- **НЕ** запушит (делаем вручную)

### 2. Закоммитить изменения

```bash
git add package.json package-lock.json
git commit -m "chore: release v1.0.0"
```

### 3. Запушить с тегом

```bash
git push origin master
git push origin v1.0.0  # Это триггерит release workflow
```

### 5. GitHub Actions автоматически:

- ✅ Запустит полную валидацию
- ✅ Опубликует пакет в npm (если настроен `NPM_TOKEN`)
- ✅ Соберет MCPB bundle
- ✅ Создаст GitHub Release с артефактами

## ⚙️ Настройка Secrets (для maintainers)

### NPM_TOKEN

1. Создай токен на [npmjs.com](https://www.npmjs.com/settings/~/tokens)
2. Добавь в GitHub: Settings → Secrets → New repository secret
   - Name: `NPM_TOKEN`
   - Value: `npm_...`

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
