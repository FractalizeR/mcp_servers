# Yandex Tracker CLI

CLI для управления подключениями Yandex Tracker MCP Server к различным AI клиентам.

Построен на базе `@fractalizer/mcp-cli` (агностичный framework: ничего не знает о
доменных полях). Доменная логика — здесь, в `src/cli/`.

---

## 🚀 Использование

```bash
npm run mcp:connect      # Подключить к клиенту
npm run mcp:disconnect   # Отключить от клиента
npm run mcp:status       # Статус подключений
npm run mcp:list         # Список поддерживаемых клиентов
npm run mcp:validate     # Проверить валидность конфигураций
```

**Поддерживаемые клиенты:**
- Claude Desktop, Claude Code, Codex, Gemini, Qwen

---

## 📁 Структура

```
src/cli/
├── bin/mcp-connect.ts     # CLI entry point (commander)
├── types.ts               # YandexTrackerMCPConfig, OrgType
├── prompts.ts             # Промпты сбора доменной конфигурации
├── build-launch.ts        # Адаптер config → ServerLaunchSpec (env mapping)
├── bundle-resolver.ts     # Резолвер пути к собранному бандлу (DI)
├── serialize-config.ts    # Безопасная сериализация для config.json
├── deserialize-config.ts  # Чтение + миграция orgType
└── README.md              # Эта документация
```

---

## ⚙️ Конфигурация

| Поле | Тип | Описание | Сохраняется? |
|------|-----|----------|--------------|
| `token` | `string` | OAuth токен | ❌ Секрет (не сохраняется) |
| `orgType` | `'yandex360' \| 'cloud'` | Тип организации | ✅ Да |
| `orgId` | `string` | ID организации (для выбранного типа) | ✅ Да |
| `apiBase` | `string?` | URL API (опционально) | ✅ Да |
| `requestTimeout` | `number?` | Таймаут запросов, мс | ✅ Да |
| `logLevel` | `LogLevel?` | Уровень логирования | ✅ Да |

### Поддержка двух типов организации

Я.Трекер работает с двумя видами идентификаторов:

| `orgType` | Env-переменная сервера | Когда выбирать |
|-----------|------------------------|----------------|
| `yandex360` | `YANDEX_ORG_ID` | Яндекс 360 для бизнеса |
| `cloud` | `YANDEX_CLOUD_ORG_ID` | Yandex Cloud Organization |

Mutually exclusive: одновременно обе переменные сервер отвергает
(`validateOrgIds` в `src/config/config-loader.ts`).

### Миграция старых `config.json`

Файлы без поля `orgType` (формат до текущего релиза) при чтении автоматически
получают `orgType: 'yandex360'` — это сохраняет прежнее поведение CLI.
Пользователи Yandex Cloud при следующем `connect` явно выберут `cloud` в новом
промпте.

---

## 🔧 Архитектура адаптера

`mcp-connect.ts` использует framework-агностичный `connectCommand` и передаёт
ему **доменный адаптер** `buildYtServerLaunch`. Framework ничего не знает о
полях `YandexTrackerMCPConfig` — он лишь вызывает адаптер и получает готовую
`ServerLaunchSpec` (`{ command, args, env }`).

### `BundleResolver` (DI)

`buildYtServerLaunch(config, resolver?)` принимает опциональный резолвер пути к
бандлу. Дефолтный `defaultBundleResolver`:

1. **Primary**: `createRequire(import.meta.url).resolve('@fractalizer/mcp-server-yandex-tracker/dist/yandex-tracker.bundle.cjs')` —
   семантически правильный путь через `exports` map пакета.
2. **Fallback**: `fileURLToPath(new URL('../../yandex-tracker.bundle.cjs', import.meta.url))` —
   путь относительно `dist/cli/bundle-resolver.js` (ESM-альтернатива `__dirname`).
3. Если оба пути не указывают на существующий файл — кидается понятная ошибка
   со списком попыток.

Выделение в отдельный модуль (`bundle-resolver.ts`) — для тестируемости: unit-
тесты подставляют фейковый резолвер вместо обращения к Node module resolver.

---

## 📚 Дополнительная документация

- **Framework CLI:** [packages/framework/cli/README.md](../../../../framework/cli/README.md)
- **Yandex Tracker Server:** [packages/servers/yandex-tracker/README.md](../../../README.md)
