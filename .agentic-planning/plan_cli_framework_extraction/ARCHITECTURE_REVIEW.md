# Архитектурное ревью: План выноса CLI в framework

**Ревьюер:** Senior Software Architect
**Дата:** 2025-11-22
**Оценка:** 7.5/10 — Хороший план, но есть критические пробелы

---

## ✅ Сильные стороны

### 1. Архитектурный дизайн
- ✅ **Правильный dependency graph** — CLI зависит только от infrastructure
- ✅ **Generic подход** — TConfig параметризация корректна
- ✅ **Separation of concerns** — механизм отделен от содержания
- ✅ **Open/Closed principle** — легко добавить новый коннектор без изменения framework

### 2. Процесс
- ✅ **Поэтапный подход** — снижает риски
- ✅ **Параллелизация** — этапы 3 и 6 можно делать одновременно
- ✅ **Валидация после каждого этапа** — быстрая обратная связь

### 3. Тестирование
- ✅ **Покрытие ≥90%** — хороший таргет
- ✅ **Unit + Integration тесты** — правильный подход

---

## 🚨 Критические проблемы

### 1. ❌ Отсутствие миграционной стратегии

**Проблема:** План не описывает, как обеспечить плавную миграцию без простоя.

**Что не хватает:**
- Нет стратегии co-existence старого и нового кода
- Нет feature flag для постепенного включения
- Не описан rollback plan если что-то сломается
- Нет smoke tests на production-like окружении

**Рекомендация:**
```markdown
## Этап 5.5: Feature Flag Strategy (ДОБАВИТЬ)

1. Добавить feature flag в yandex-tracker:
   ```typescript
   const USE_FRAMEWORK_CLI = process.env.USE_FRAMEWORK_CLI === 'true';

   if (USE_FRAMEWORK_CLI) {
     // Использовать @mcp-framework/cli
   } else {
     // Использовать старый код
   }
   ```

2. Поэтапное включение:
   - Неделя 1: Только в dev среде
   - Неделя 2: Beta пользователи
   - Неделя 3: 50% пользователей
   - Неделя 4: 100% если нет проблем

3. Rollback plan:
   - Оставить старый код до полного подтверждения работы нового
   - Удалить старый код только через 2-4 недели после миграции
```

### 2. ❌ Нет обработки Breaking Changes

**Проблема:** План удаляет старый код сразу (этап 5.3), но не описывает:
- Как уведомить пользователей о breaking changes
- Semantic versioning стратегию
- Deprecation period

**Рекомендация:**
```markdown
## Semantic Versioning

- @mcp-framework/cli: начать с 1.0.0
- yandex-tracker: major bump (2.0.0 → 3.0.0) если публичный API изменился

## Deprecation Strategy

1. Если yandex-tracker CLI используется внешними пользователями:
   - Добавить @deprecated комментарии
   - Добавить runtime warnings
   - Период deprecation: минимум 1 minor release или 3 месяца

2. CHANGELOG.md:
   - Описать все breaking changes
   - Предоставить migration guide
   - Примеры до/после
```

### 3. ❌ Отсутствие анализа производительности

**Проблема:** Не проверяется:
- Размер bundle после изменений
- Startup time CLI
- Memory footprint
- Import cost (tree-shaking)

**Рекомендация:**
```markdown
## Этап 7.15: Performance Benchmarks (ДОБАВИТЬ)

1. Bundle size analysis:
   ```bash
   npm run analyze-bundle
   # framework/cli должен быть <200KB
   # yandex-tracker не должен вырасти >10%
   ```

2. Startup benchmarks:
   ```bash
   time npm run mcp:connect -- --help
   # До: X ms
   # После: не более X + 20% ms
   ```

3. Tree-shaking verification:
   - Проверить что неиспользуемые коннекторы не попадают в bundle
   - Использовать webpack-bundle-analyzer
```

### 4. ⚠️ Недостаточная обработка ошибок

**Проблема:** План показывает "happy path", но не описывает:
- Что делать если коннектор не установлен
- Обработка корраптед config файлов
- Validation errors в промптах
- Network failures при установке зависимостей

**Рекомендация:**
```markdown
## Error Handling Strategy

1. Graceful degradation:
   - Если коннектор недоступен — показать понятное сообщение
   - Если config корраптед — предложить пересоздать
   - Если validation fail — показать что именно неправильно

2. Error codes:
   ```typescript
   export enum CLIErrorCode {
     NO_CLIENTS_INSTALLED = 'CLI_001',
     CONFIG_CORRUPTED = 'CLI_002',
     CONNECTION_FAILED = 'CLI_003',
     VALIDATION_FAILED = 'CLI_004',
   }
   ```

3. Logging:
   - Логировать все ошибки с context
   - Предоставить --verbose flag для отладки
```

---

## ⚠️ Серьезные замечания

### 5. ⚠️ Сложность Generic типов

**Проблема:** Generic с 2-3 параметрами может быть сложен для понимания:

```typescript
// Может стать слишком сложным
export class InteractivePrompter<
  TConfig extends BaseMCPServerConfig,
  TPrompts extends ConfigPromptDefinition<TConfig>[]
> { ... }
```

**Рекомендация:**
- Ограничить generic параметры до 1-2 максимум
- Предоставить helper types для упрощения
- Добавить примеры для каждого сложного generic

### 6. ⚠️ Отсутствие E2E тестов

**Проблема:** План включает unit и integration тесты, но нет:
- E2E тестов реального подключения к MCP клиенту
- Тестов на разных ОС (macOS, Linux, Windows)
- Smoke tests в CI/CD

**Рекомендация:**
```markdown
## Этап 6.25: E2E Testing (ДОБАВИТЬ)

1. Настроить GitHub Actions matrix:
   - os: [ubuntu-latest, macos-latest, windows-latest]
   - node: [18, 20, 22]

2. E2E сценарий:
   - Установить mock MCP клиент
   - Запустить connect команду с fixture данными
   - Проверить что config файл создался
   - Проверить что подключение работает
   - Запустить disconnect
   - Проверить cleanup

3. Smoke tests:
   - Запускать при каждом PR
   - Блокировать merge при failure
```

### 7. ⚠️ Недостаточная документация API

**Проблема:** План упоминает API.md, но не описывает:
- JSDoc комментарии для каждого public API
- TypeDoc генерация
- Живые примеры (code playground)

**Рекомендация:**
```markdown
## Documentation Standards

1. JSDoc для всех public API:
   ```typescript
   /**
    * Generic CLI для управления MCP подключениями
    *
    * @template TConfig - Тип конфигурации сервера
    * @example
    * ```typescript
    * const prompter = new InteractivePrompter<MyConfig>(prompts);
    * const config = await prompter.promptServerConfig();
    * ```
    */
   export class InteractivePrompter<TConfig> { ... }
   ```

2. TypeDoc:
   - Добавить npm script: `docs:generate`
   - Публиковать на GitHub Pages
   - Включить в CI/CD

3. Examples:
   - Добавить в examples/ реальные рабочие примеры
   - README для каждого примера
   - Запускаемые через npm run example:*
```

---

## 💡 Улучшения архитектуры

### 8. 💡 Dependency Injection для коннекторов

**Текущий подход:** Registry регистрирует коннекторы вручную

```typescript
// Текущее (в YT bin/mcp-connect.ts)
const registry = new ConnectorRegistry();
registry.register(new ClaudeDesktopConnector());
registry.register(new ClaudeCodeConnector());
// ... вручную для каждого
```

**Предложение:** Plugin system с auto-discovery

```typescript
// framework/cli/src/plugins/plugin-system.ts
export interface CLIPlugin {
  name: string;
  connectors: Array<new () => MCPConnector>;
}

// yandex-tracker может просто импортировать плагины
import { standardPlugins } from '@mcp-framework/cli';

const registry = new ConnectorRegistry();
registry.loadPlugins(standardPlugins); // auto-register все
```

**Преимущества:**
- Легче добавить новый коннектор (просто добавить в plugins)
- Возможность динамической загрузки
- Упрощение кода в bin/mcp-connect.ts

### 9. 💡 Builder pattern для конфигурации

**Текущий подход:** Прямое создание объектов

```typescript
const configManager = new ConfigManager<Config>({
  projectName: '...',
  safeFields: [...],
});
```

**Предложение:** Builder для читаемости

```typescript
const configManager = ConfigManagerBuilder
  .forProject('yandex-tracker')
  .withSafeFields('orgId', 'apiBase')
  .excludeSecrets('token')
  .build<YandexTrackerMCPConfig>();
```

**Преимущества:**
- Более читаемый код
- Валидация на этапе сборки
- Fluent API

### 10. 💡 Webhook система для событий

**Добавить event system:**

```typescript
// framework/cli
export enum CLIEvent {
  BEFORE_CONNECT = 'before:connect',
  AFTER_CONNECT = 'after:connect',
  CONNECT_FAILED = 'connect:failed',
}

export class ConnectorRegistry {
  on(event: CLIEvent, handler: (data: unknown) => void): void;
  emit(event: CLIEvent, data: unknown): void;
}

// yandex-tracker может слушать события
registry.on(CLIEvent.AFTER_CONNECT, (data) => {
  Logger.info('YT: Connection established');
  // Отправить метрику, уведомление и т.д.
});
```

**Преимущества:**
- Расширяемость без изменения framework
- Telemetry и аналитика
- Custom workflows

---

## 🔒 Безопасность

### 11. 🔒 Secrets management

**Хорошо:** ConfigManager не сохраняет токены

**Улучшение:** Интеграция с системными keychain

```typescript
// framework/cli/src/utils/secrets-manager.ts
export class SecretsManager {
  async storeSecret(key: string, value: string): Promise<void> {
    // macOS: использовать Keychain
    // Linux: использовать libsecret
    // Windows: использовать Credential Manager
  }

  async retrieveSecret(key: string): Promise<string | undefined> {
    // Достать из системного хранилища
  }
}
```

**Использование:**
```typescript
// Вместо запроса token каждый раз
const secretsManager = new SecretsManager();
let token = await secretsManager.retrieveSecret('yt-token');

if (!token) {
  token = await prompter.promptPassword('Token:');
  await secretsManager.storeSecret('yt-token', token);
}
```

### 12. 🔒 Input sanitization

**Добавить:** Санитизация всех user inputs

```typescript
// Предотвращение command injection
export function sanitizeInput(input: string): string {
  return input.replace(/[;&|`$(){}]/g, '');
}

// Валидация путей
export function validatePath(path: string): boolean {
  // Проверить что путь не выходит за пределы допустимого
  return !path.includes('..');
}
```

---

## 📦 Versioning и Release

### 13. 📦 Changesets

**Проблема:** План не описывает release процесс

**Рекомендация:** Использовать changesets

```bash
npm install -D @changesets/cli
npx changeset init
```

**Workflow:**
1. Разработчик делает изменения
2. Запускает `npx changeset` и описывает изменение
3. CI автоматически создает PR с version bump
4. При merge — автоматический publish в npm

### 14. 📦 Conventional Commits

**Добавить:** Линтинг commit messages

```json
// package.json
{
  "commitlint": {
    "extends": ["@commitlint/config-conventional"]
  }
}
```

**Примеры:**
```
feat(cli): add support for Qwen client
fix(cli): handle missing config file gracefully
docs(cli): add API reference
BREAKING CHANGE: ConfigManager API changed
```

---

## 🧪 Тестирование

### 15. 🧪 Contract Testing

**Добавить:** Контрактные тесты между framework и yandex-tracker

```typescript
// framework/cli/tests/contracts/connector.contract.test.ts
describe('MCPConnector Contract', () => {
  it('should implement all required methods', () => {
    const connector = new MockConnector();
    expect(connector.getClientInfo).toBeDefined();
    expect(connector.isInstalled).toBeDefined();
    // ... все методы интерфейса
  });

  it('should return valid ClientInfo structure', async () => {
    const info = connector.getClientInfo();
    expect(info).toMatchObject({
      name: expect.any(String),
      displayName: expect.any(String),
      platforms: expect.any(Array),
    });
  });
});
```

### 16. 🧪 Mutation Testing

**Опционально:** Добавить mutation testing

```bash
npm install -D @stryker-mutator/core
```

**Проверяет качество тестов** — мутирует код и смотрит, ловят ли это тесты

---

## 📋 Итоговые рекомендации

### Критично исправить ПЕРЕД началом работы:

1. ❌ **Добавить миграционную стратегию** (Feature flags, rollback plan)
2. ❌ **Определить Breaking Changes policy** (versioning, deprecation)
3. ❌ **Добавить performance benchmarks** (bundle size, startup time)

### Исправить ДО финализации (этап 7):

4. ⚠️ **E2E тесты на всех платформах**
5. ⚠️ **Улучшить error handling** (error codes, logging)
6. ⚠️ **JSDoc + TypeDoc генерация**

### Nice-to-have (можно после релиза):

7. 💡 Plugin system для коннекторов
8. 💡 Builder pattern для конфигурации
9. 💡 Event system для extensibility
10. 🔒 Keychain integration для secrets
11. 📦 Changesets для release automation

---

## 🎯 Финальная оценка

**Оценка:** 7.5/10

**Что хорошо:**
- Архитектура правильная
- Generic подход корректный
- Процесс поэтапный и безопасный

**Что критично:**
- Отсутствует миграционная стратегия
- Нет rollback плана
- Недостаточно внимания к breaking changes

**Что улучшить:**
- Performance monitoring
- E2E тесты
- Documentation standards

**Рекомендация:**
✅ **Можно начинать** после добавления критичных пунктов (1-3)
⚠️ **Серьезные замечания** (4-6) добавить в процессе
💡 **Nice-to-have** (7-11) — для версии 1.1

---

## 📝 Action Items

**До начала работы:**
- [ ] Добавить этап "5.5 Feature Flag Strategy"
- [ ] Обновить этап 5.3 — не удалять старый код сразу
- [ ] Добавить этап "7.15 Performance Benchmarks"
- [ ] Определить semantic versioning strategy
- [ ] Написать MIGRATION.md draft

**В процессе:**
- [ ] Добавить E2E тесты в этап 6.2
- [ ] Улучшить error handling в этапах 4.x
- [ ] JSDoc комментарии во всех этапах создания кода

**После релиза:**
- [ ] Рассмотреть plugin system
- [ ] Keychain integration
- [ ] Changesets setup
