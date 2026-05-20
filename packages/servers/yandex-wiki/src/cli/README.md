# Yandex Wiki CLI

CLI для управления подключениями Yandex Wiki MCP Server к AI клиентам.

Построен на базе `@fractalizer/mcp-cli` (агностичный framework). Доменная
логика — здесь, в `src/cli/`.

---

## Использование

```bash
npm run mcp:connect      # Подключить к клиенту
npm run mcp:disconnect   # Отключить от клиента
npm run mcp:status       # Статус подключений
npm run mcp:list         # Список поддерживаемых клиентов
npm run mcp:validate     # Проверить валидность конфигураций
```

**Поддерживаемые клиенты:** Claude Desktop, Claude Code, Codex, Gemini, Qwen.

---

## Структура

```
src/cli/
├── bin/mcp-connect.ts     # CLI entry point (commander)
├── types.ts               # YandexWikiMCPConfig, OrgType
├── prompts.ts             # Промпты сбора доменной конфигурации
├── build-launch.ts        # Адаптер config → ServerLaunchSpec (env mapping)
├── bundle-resolver.ts     # Резолвер пути к собранному бандлу (DI)
├── serialize-config.ts    # Безопасная сериализация для config.json
├── deserialize-config.ts  # Чтение + миграция orgType
└── README.md              # Эта документация
```

---

## Конфигурация

| Поле | Тип | Описание | Сохраняется? |
|------|-----|----------|--------------|
| `token` | `string` | OAuth токен | Нет (секрет) |
| `orgType` | `'yandex360' \| 'cloud'` | Тип организации | Да |
| `orgId` | `string` | ID организации (для выбранного типа) | Да |
| `requestTimeout` | `number?` | Таймаут запросов, мс | Да |
| `logLevel` | `LogLevel?` | Уровень логирования | Да |

### Поддержка двух типов организации

Wiki API поддерживает два формата идентификатора:

| `orgType` | Env-переменная сервера | Когда выбирать |
|-----------|------------------------|----------------|
| `yandex360` | `YANDEX_ORG_ID` | Яндекс 360 для бизнеса |
| `cloud` | `YANDEX_CLOUD_ORG_ID` | Yandex Cloud Organization |

Mutually exclusive: одновременно обе переменные сервер отвергает.

### Миграция старых `config.json`

Файлы без `orgType` автоматически получают `orgType: 'yandex360'` —
сохраняется прежнее поведение CLI. Пользователи Yandex Cloud при следующем
`connect` явно выберут `cloud` в новом промпте.

---

## Архитектура адаптера

`mcp-connect.ts` использует framework-агностичный `connectCommand` и передаёт
ему доменный адаптер `buildYwServerLaunch`. Framework ничего не знает о полях
`YandexWikiMCPConfig` — он лишь вызывает адаптер и получает готовую
`ServerLaunchSpec` (`{ command, args, env }`).

`buildYwServerLaunch(config, resolver?)` принимает опциональный
{@link BundleResolver}. Дефолтный использует `createRequire(...).resolve(...)`
с fallback на путь относительно `import.meta.url`. Подробности — в
[bundle-resolver.ts](./bundle-resolver.ts).

---

## Дополнительная документация

- **Framework CLI:** [packages/framework/cli/README.md](../../../../framework/cli/README.md)
- **Yandex Wiki Server:** [packages/servers/yandex-wiki/README.md](../../../README.md)
