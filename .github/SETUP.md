# GitHub Repository Setup

## 🔐 Настройка Secrets для CI/CD

После создания репозитория на GitHub, настрой секреты для автоматической публикации:

### 1. NPM_TOKEN (для публикации в npm registry)

**Когда получишь npm аккаунт:**

1. **Создай Access Token на npmjs.com:**
   - Зайди на https://www.npmjs.com/
   - Войди в аккаунт
   - Settings → Access Tokens → Generate New Token
   - Выбери тип: **Automation** (для CI/CD)
   - Скопируй токен (начинается с `npm_...`)

2. **Добавь в GitHub Secrets:**
   - Открой репозиторий на GitHub
   - Settings → Secrets and variables → Actions
   - New repository secret
   - Name: `NPM_TOKEN`
   - Value: `npm_...` (вставь скопированный токен)
   - Add secret

3. **Готово!** Теперь при пуше тега автоматически будет:
   - Публиковаться пакет в npm
   - Создаваться GitHub Release
   - Собираться MCPB bundle

### 2. CODECOV_TOKEN (опционально, для покрытия кода)

Если хочешь отслеживать test coverage на codecov.io:

1. **Зарегистрируй проект:**
   - Зайди на https://codecov.io/
   - Войди через GitHub
   - Добавь репозиторий
   - Скопируй токен

2. **Добавь в GitHub Secrets:**
   - Name: `CODECOV_TOKEN`
   - Value: токен с codecov.io

### 3. Проверка настройки

После добавления `NPM_TOKEN`:

```bash
# Создай тестовый релиз
npm version patch
git push origin master
git push origin v0.1.1

# Проверь GitHub Actions:
# https://github.com/YOUR_USERNAME/yandex-tracker-mcp/actions
```

Если все настроено правильно:
- ✅ CI проходит успешно
- ✅ Release создается автоматически
- ✅ Пакет публикуется в npm
- ✅ MCPB bundle прикрепляется к релизу

## 📝 Branch Protection Rules (рекомендуется)

Защити основную ветку от случайных push:

1. Settings → Branches → Add rule
2. Branch name pattern: `master`
3. Включи:
   - ✅ Require a pull request before merging
   - ✅ Require status checks to pass before merging
     - Выбери: `validate` (из CI workflow)
   - ✅ Require branches to be up to date before merging

## 🏷️ GitHub Topics

Добавь topics для лучшей видимости:

Settings → About → Topics:
- `mcp`
- `yandex-tracker`
- `claude`
- `claude-desktop`
- `mcp-server`
- `typescript`
- `task-management`

## 📊 Бейджи для README

Уже добавлены в README.md:
- ✅ CI Status
- ✅ Release Status
- ✅ NPM Version
- ✅ License

## 🚀 Первый релиз

После настройки всех secrets:

```bash
# 1. Убедись что все тесты проходят
npm run validate

# 2. Создай версию
npm version 0.1.0

# 3. Закоммить
git add package.json package-lock.json
git commit -m "chore: release v0.1.0"

# 4. Запуш с тегом (триггерит автоматический release)
git push origin master
git push origin v0.1.0
```

GitHub Actions автоматически:
1. Запустит полную валидацию
2. Опубликует в npm (если `NPM_TOKEN` настроен)
3. Создаст GitHub Release
4. Приложит MCPB bundle к релизу

## ⚠️ Если NPM_TOKEN еще не настроен

Не проблема! Workflow настроен с `continue-on-error: true` для npm publish.

Это значит:
- ✅ GitHub Release создастся
- ✅ MCPB bundle будет доступен для скачивания
- ⏭️ Публикация в npm пропустится без ошибки

Когда получишь npm аккаунт - просто добавь токен и запуш новый тег.
