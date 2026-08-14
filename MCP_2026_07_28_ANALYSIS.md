# Анализ MCP 2026-07-28 применительно к нашим MCP-серверам

Дата анализа: 2026-08-14.
База: `origin/main@4e36bd6` (`v1.7.0`, 2026-06-19), версии всех трёх серверных пакетов — `1.7.0`.

> **Поправка к ревью этого документа.** Промежуточная редакция утверждала, что коммита `4e36bd6` и
> тега `v1.7.0` не существует, и объявляла исходную привязку выдуманной. Это была ошибка ревью:
> локальный клон просто не фетчил `origin` с 19 июня, поэтому release-коммит от `semantic-release-bot`
> в нём отсутствовал. Исходная редакция была права — и в SHA, и в том, что локальный checkout отставал
> ровно на один release commit. Привязка восстановлена.

## Что поменялось в MCP

Официальные источники: [changelog 2026-07-28](https://modelcontextprotocol.io/specification/2026-07-28/changelog),
[server discovery](https://modelcontextprotocol.io/specification/2026-07-28/server/discover),
[deprecated features](https://modelcontextprotocol.io/specification/2026-07-28/deprecated),
[MRTR](https://modelcontextprotocol.io/specification/2026-07-28/basic/patterns/mrtr),
[Streamable HTTP](https://modelcontextprotocol.io/specification/2026-07-28/basic/transports/streamable-http).

Затрагивает нас напрямую:

- Удалены `initialize`/`notifications/initialized`, протокольные сессии и `Mcp-Session-Id`. Каждый запрос
  самодостаточен: версия протокола, capabilities и `clientInfo` едут в `_meta`; сервер SHOULD возвращать
  `serverInfo` в `_meta` **каждого** результата.
- Сервер **MUST** реализовать `server/discover`. На stdio клиент использует его как probe совместимости.
- Все результаты несут обязательное поле `resultType` (`complete` / `input_required`).
- `tools/list`, `prompts/list`, `resources/list`, `resources/read`, `resources/templates/list` обязаны
  возвращать `ttlMs` и `cacheScope` (`public`/`private`).
- `tools/list` SHOULD возвращать детерминированный порядок — под кеш на стороне клиента.
- Удалены RPC `ping` и `logging/setLevel`. Уровень лога — per-request через `_meta`
  `io.modelcontextprotocol/logLevel`; без этого поля сервер **MUST NOT** слать `notifications/message`.
  (Наш `fr_*_ping` — это **tool**, а не протокольный метод; он не затронут.)
- `inputSchema`/`outputSchema` приняли любые ключевые слова JSON Schema 2020-12, `structuredContent` —
  любое JSON-значение. Добавлены требования к разрешению `$ref`.
- Server-to-client requests заменены на MRTR: сервер возвращает `input_required`, клиент повторяет запрос.
- Tasks вынесены из core в extension `io.modelcontextprotocol/tasks`.
- Roots, Sampling и MCP Logging — deprecated. Также deprecated HTTP+SSE и Dynamic Client Registration.
- Новые коды ошибок: `-32020` HeaderMismatch, `-32021` MissingRequiredClientCapability,
  `-32022` UnsupportedProtocolVersion. `resources` not found переехал `-32002` → `-32602`.

Затрагивает только remote-сценарий (мы его не делаем, см. ниже): stateless POST-транспорт,
обязательные `MCP-Protocol-Version`/`Mcp-Method`/`Mcp-Name`, `subscriptions/listen` вместо HTTP GET и
`resources/subscribe`, отмена resumability SSE (`Last-Event-ID`), зеркалирование параметров в
`Mcp-Param-*` через `x-mcp-header`.

## Готовность клиентов — и почему V1 остаётся навсегда

Наш потребитель — своя команда: Claude Code, Claude Desktop, Codex CLI, ChatGPT Desktop.

| Клиент | Статус 2026-07-28 |
|---|---|
| Claude (web/Desktop/Code) | Первый крупный клиент с поддержкой; роллаут по продуктам идёт |
| Codex CLI | С `v0.147.0` (2026-08-07) — **opt-in**: legacy lifecycle по умолчанию, stdio требует `CODEX_MCP_PROTOCOL_VERSION=2026-07-28` |

**Вывод: dual-era — не переходный этап, а постоянный режим.** Пока хотя бы один клиент по умолчанию
открывает соединение через `initialize`, legacy-ветку выбрасывать нельзя. Это дёшево ровно при одном
условии: lifecycle живёт в одном месте. Сейчас он скопирован в трёх `server.ts` — вот это и есть
настоящая стоимость, а не сам факт двух эпох.

## Где мы сейчас

Три исполняемых сервера, 97 tools суммарно (+`SearchToolsTool` рантаймом в lazy-режиме):

| Сервер | Tools | Протокольная поверхность |
|---|---:|---|
| Yandex Tracker | 50 | `initialize`, `tools/list`, `tools/call`, stdio |
| Yandex Wiki | 22 | то же |
| TickTick | 25 | то же |

Проверенные разрывы (все ссылки перепроверены по коду):

- SDK `@modelcontextprotocol/sdk ^1.27.1`, старый `Server` + `StdioServerTransport` — core и 3 сервера.
- Hardcoded `protocolVersion: '2025-06-18'`: [tracker `server.ts:62`](packages/servers/yandex-tracker/src/server.ts),
  [wiki `server.ts:62`](packages/servers/yandex-wiki/src/server.ts), [ticktick `server.ts:63`](packages/servers/ticktick/src/server.ts).
- `tools/list` отдаёт только `name`/`description`/`inputSchema` — [`server.ts:88-92`](packages/servers/yandex-tracker/src/server.ts).
- Результат — JSON только в `content[].text`, без `structuredContent` — [`base-tool.ts:255-258`](packages/framework/core/src/tools/base/base-tool.ts).
- `ToolDefinition` без `title`/`outputSchema`/`annotations`/`icons` — [`base.types.ts:11-28`](packages/framework/core/src/tools/base/base.types.ts).
- Генератор таргетирует draft-7 и вырезает `$ref` как «неподдерживаемый MCP» —
  [`zod-json-schema-adapter.ts:83` и `:13`](packages/framework/core/src/definition/zod-json-schema-adapter.ts),
  [`schema-to-definition.ts:65`](packages/framework/core/src/definition/schema-to-definition.ts). Оба утверждения теперь неверны.
- Нет Resources, Prompts, structured output, cancellation, progress, Tasks, MRTR, protocol conformance tests.
- Нет `server.json`/`mcpName` → публикация в MCP Registry невозможна.
- ~~`manifest.template.json` застрял на `0.1.0`~~ — **находка снята**. Это шаблон; реальный
  `manifest.json` лежит в `.gitignore` и генерируется `scripts/update-versions.mjs`, который
  подставляет актуальную версию с хешем сборки (`1.7.0+3866fc5`). Рассинхрона нет.

### Два дефекта текущей версии

Не связаны с новой спекой и чинятся независимо от всего остального.

**1. Фильтрация tools — не граница доступа.** `tools/list` фильтрует, а
[`ToolRegistry.execute()` (`tool-registry.ts:238-290`)](packages/framework/core/src/tool-registry/tool-registry.ts)
берёт инструмент из полной карты `this.tools` без единой проверки. Скрытый или отключённый tool остаётся
вызываемым по прямому `tools/call`. Любой будущий read-only профиль на этой основе будет фикцией.

**2. Логируется весь payload вызова.** [`tool-registry.ts:242`](packages/framework/core/src/tool-registry/tool-registry.ts):
`logger.debug('Параметры вызова:', params)` — тексты комментариев, содержимое страниц Wiki, всё
остальное уезжает в файловый лог.

## Принятые решения

Зафиксировано по итогам обсуждения, менять только сознательно:

1. **Remote/hosted HTTP не делаем.** Каждый ставит сервер себе. Следовательно из плана уходят OAuth,
   scopes, PRM, audience/issuer, Origin-валидация, threat model и весь transport-раздел спеки.
2. **Legacy 2025-06-18 не выключаем никогда** — пока Codex CLI открывает соединение через `initialize`
   по умолчанию.
3. **Lazy discovery удаляется целиком.** Основной потребитель — готовый продукт со своим поиском
   инструментов, а не голый харнесс. Дублировать progressive disclosure на стороне сервера незачем.
4. **Отключение групп остаётся** как пользовательский рубильник, но по умолчанию не отключает ничего.
5. **MCP Apps** проектируем от батч-сценариев (результат поиска, эпик, связи, доска), а не от одиночной
   задачи — это наше отличие, и UI должен его усиливать, а не сводить к карточке.
6. **Пакет `@fractalizer/mcp-search` удаляется** вместе с lazy discovery, с `npm deprecate`.
7. **`icons` — одна на сервер, встроенная.** Не 97 штук на каждый tool. Детали ниже.
8. **Трек авторизации отложен.** Схема получения токена остаётся как есть; общий `client_id` не заводим.
9. **Apps-пилот берём в работу**, первый сценарий — анализ задачи и правка description. Не раньше
   Resources и `structuredContent`: App технически стоит на них.

## План

### Этап 0. Дефекты — первым приоритетом

- Единая policy: один источник истины `tool × listed × callable`, проверяется и при публикации списка,
  и **перед** исполнением в `execute()`.
- Redaction логирования: вместо полного payload — имена параметров и типы; значения только по
  явному allow-list.
- DoD: регрессионный тест на прямой вызов отключённого tool падает до фикса; тест, что в логе нет
  значения секретного параметра.

Файлы: `tool-registry.ts`, `tool-filter.service.ts` + тесты. Пересекается с этапом 1 по той же точке —
делать строго до него.

### Этап 1. Удаление lazy discovery

Перечисление снято `grep` по `toolDiscoveryMode|essentialTools|TOOL_DISCOVERY_MODE|ESSENTIAL_TOOLS|search_tools|SearchToolsTool|mcp-search|'lazy'|'eager'`
по всему репозиторию (src, tests, docs, json, скрипты; без `node_modules`/`dist`/`.turbo`/submodule).
**Затронуто 82 файла**, таблица — в scratchpad `table1-lazy-surface.md`.
Способ не видит: значения в пользовательских конфигах вне репо (`claude_desktop_config.json`, `~/.mcp/*`)
и README уже опубликованных версий на npmjs — их правим отдельно, вручную.

- Убрать `toolDiscoveryMode` и `essentialTools`; `tools/list` всегда отдаёт полный список.
- Оставить единственный рубильник `DISABLED_TOOL_GROUPS`, дефолт — пусто. Удалить давно помеченный
  `@deprecated` `ENABLED_TOOL_CATEGORIES`.
- Удалить пакет `@fractalizer/mcp-search` целиком вместе с `generated-index.ts`, `generate-tool-index.ts`
  и соответствующим шагом валидации. Пакет опубликован в npm — нужен `npm deprecate`, а не тихое удаление.
  Восстановить из git при необходимости дешевле, чем содержать мёртвый опубликованный пакет.
- Зафиксировать детерминированный порядок `tools/list` (требование спеки) — сортировка остаётся,
  но становится контрактом с тестом.

### Этап 2. Контракты tools

Параллелится по серверам — наборы файлов не пересекаются.

- **JSON Schema 2020-12.** Смена `target: 'draft-7'` → `'draft-2020-12'` (Zod `4.3.6` это умеет) и отказ
  от вырезания `$ref`. Zod при этом остаётся единственным источником истины и валидатором на входе —
  JSON Schema это только описание контракта наружу, не замена валидации.
  Обязательный тест: схема каждого tool валидна как 2020-12 **и не содержит рекурсивных `$ref`** —
  рекурсия ломает programmatic tool calling на стороне клиента (`Circular $ref detected`).
- **Расширить `ToolDefinition`**: `title`, `outputSchema`, `annotations`.
- **Одна иконка на сервер** — в `Implementation.icons` (идентичность сервера), а не на каждом tool.
  `src` допускает `data:` URI с base64, поэтому внешний хост не нужен и stdio-серверу ничего не мешает.
  Требования, вытекающие из спеки:
  - **PNG обязателен.** Клиенты, умеющие рисовать иконки, **MUST** поддерживать `image/png` и
    `image/jpeg`; `image/svg+xml` — только **SHOULD**, и часть клиентов отклонит SVG из-за риска
    встроенного JavaScript. Массив допускает несколько записей: кладём PNG как гарантированный
    вариант, SVG рядом — для тех, кто умеет.
  - **Текст перевести в кривые.** Каллиграфический шрифт в SVG не встраивается: на машине без него
    буквы отрисуются чем попало. Outline самодостаточен и мал.
  - **Держать под ~2 КБ.** `serverInfo` (тип `Implementation`) сервер SHOULD слать в `_meta`
    **каждого** результата — тяжёлый data URI поедет с каждым ответом. Пара букв в кривых укладывается
    в сотни байт, так что ограничение не мешает, но проверять его надо тестом.
  - `sizes: ["any"]` для SVG, конкретные размеры для PNG; опционально `theme` (`light`/`dark`).
- **Классификация 97 tools** по `readOnlyHint`/`destructiveHint`/`idempotentHint`/`openWorldHint`.
  Выводить из `requiresExplicitUserConsent` нельзя: поле проставлено всего в 3 файлах из 97. Сырьё —
  таблица `table2-tools-matrix.tsv` (97 строк, 12 категорий; по эвристике имени ~49 мутирующих).
  Работа механическая — уровень sonnet, по пакету на сервер.
- **`outputSchema` + `structuredContent`** с текстовым fallback. См. раздел про code execution — это
  не косметика, а условие работы клиентского code-mode.
- Единые success/error envelopes. Удалить неиспользуемый `buildDefinition()` (не переопределён нигде).

### Этап 3. Dual-era транспорт

- Миграция на SDK v2 (модульные пакеты).
- Вынести lifecycle и transport из трёх почти одинаковых `server.ts` в общий framework-adapter.
- `serveStdio(() => buildServer())` — обслуживает обе эпохи; одна фабрика пинится на соединение,
  legacy **не** отключаем (`legacy: 'reject'` не используем). На 2026-era идентичность читается из
  `ctx.mcpReq.envelope`, а не из `initialize`.
- `resultType`, `serverInfo` в `_meta` и cache-поля (`ttlMs`, `cacheScope`) — владелец adapter, а не
  каждый tool. Кеш — консервативно: `private` и короткий TTL, пока не доказана безопасность иного.
- Raw-wire тесты для каждого сервера: legacy `initialize`; modern `server/discover`; неподдерживаемая
  версия → `-32022`; обязательные modern-поля результата; детерминированный порядок `tools/list`;
  одинаковое поведение `tools/call` в обеих эпохах.

[SDK v2 migration](https://github.com/modelcontextprotocol/typescript-sdk/blob/main/docs/migration/upgrade-to-v2.md),
[2026-07-28 support](https://github.com/modelcontextprotocol/typescript-sdk/blob/main/docs/migration/support-2026-07-28.md).
Простой version bump ничего не мигрирует: `Server` + `StdioServerTransport` продолжат говорить только
на 2025-эпохе.

### Этап 4. Ценность

**Resources + ResourceLink — главный выигрыш, и он про батч.** Сейчас `find_issues` на 200 задач
вываливает 200 JSON-объектов в контекст. С `ResourceLink` tool возвращает компактную сводку и ссылки
(`tracker://issue/QUEUE-123`), а тела агент подтягивает выборочно через `resources/read` — который
ещё и кешируется по `ttlMs`. Это усиливает ровно то, что у нас уже сильно.

**Prompts** — самый дешёвый способ вовлечь команду: именованные шаблоны становятся слэш-командами в
клиенте (`/tracker:standup`, `/tracker:triage QUEUE`, `/wiki:summary`). Новый API не нужен, это обёртки
над существующими tools.

**Tasks** (extension) — для bulk-операций, которые не укладываются в один ответ: сервер отдаёт handle,
клиент опрашивает `tasks/get`. Плюс cancellation/progress.

**MCP Apps** — HTML в песочном iframe внутри диалога, двусторонний: приложение само может звать
`tools/call`. Поддержка: Claude, Claude Desktop, VS Code Copilot, M365 Copilot, Goose, Postman.
**ChatGPT/Codex в списке поддержки нет** — половина команды пилот не увидит, поэтому tool-fallback
обязателен в каждом сценарии.

Технически App — это ресурс `ui://`, на который tool ссылается через `_meta.ui.resourceUri`. Значит
**Apps невозможны раньше Resources**, а данные в App приходят из результата вызова — то есть раньше
`structuredContent`. Порядок 2 → 4.1 → Apps не является предпочтением, он вынужденный.

Разбор предложенных сценариев:

| Сценарий | Оценка |
|---|---|
| Анализ задачи продактом + правка description | **Пилот №1** |
| Динамический список поиска + массовые действия | **Пилот №2** (поглощает «перевод статуса») |
| Перевод статуса задачи | Не отдельный App — действие внутри списка |
| Preview статьи Вики | Отложить; переосмыслить как diff |

**Анализ задачи и правка description — лучший первый пилот.** Это единственный из четырёх сценариев,
где есть человеческий ввод, а не только отображение, и где виджет убирает реальную боль: правка текста
через диалог — это три круга «нет, вот здесь не так». App показывает текущее описание и предложение
модели рядом, продакт правит прямо в поле и жмёт «применить» — App зовёт `update_issue` сам. Ценность
очевидна нетехническому пользователю, что и нужно для вовлечения команды. Обязателен санитайз: тело
описания приходит из Трекера и для рендера недоверенное.

**Динамический список поиска — витрина нашего отличия.** Главный выигрыш не в удобстве, а в контексте:
200 найденных задач не попадают в контекст модели вообще. Пользователь фильтрует и листает внутри
виджета (курсорная пагинация у нас уже есть — App дозагружает страницы сам), отмечает нужные, и только
выбранное уезжает в действие. Массовый перевод статуса — действие внутри этого списка.

**Перевод статуса отдельным App смысла не имеет:** одиночный переход агент делает текстом не хуже. Зато
внутри списка у него появляется то, чего текст не умеет: в Трекере доступны не произвольные статусы, а
конкретные переходы из текущего, и виджет может показать реально доступные transitions вместо того,
чтобы модель их угадывала.

**Preview Вики — самый дорогой и наименее ценный из четырёх.** Потребует тащить в iframe рендерер
Yandex Flavored Markdown, который всегда будет отставать от настоящего рендера Вики, ради результата,
достижимого ссылкой на саму страницу. Если возвращаться к сценарию — то не как preview, а как **diff
перед сохранением**: агент правит страницу, App показывает построчную разницу и просит подтверждения.
Это и дешевле (diff не требует полного YFM), и закрывает реальный риск — незаметную порчу страницы.

### Отдельный трек. Авторизация и Registry

**MCP Registry — это каталог метаданных, а не решение проблемы токенов.** Он хостит `server.json`
(имя, репозиторий, npm-пакет, транспорт, перечень env-переменных с пометкой secret); артефакты лежат в
npm, credentials не хранятся и не выдаются. Статус — preview. Даёт находимость и установку одной
командой; получение токена Яндекса за пользователя не даёт и дать не может.

Автоматизировать выдачу токена можно только OAuth-флоу. В MCP он определён исключительно для
HTTP-транспорта, а remote мы не делаем — значит, путь один: **довести до конца собственный CLI-мастер**
(`packages/framework/cli` + `src/cli` с `prompts.ts`/`doctor-checks.ts` уже есть).

Что болит сейчас: по [README](packages/servers/yandex-tracker/README.md) (шаги 96-111) **каждый
пользователь регистрирует собственное приложение** на oauth.yandex.ru и вручную копирует токен. Это и
есть главный барьер входа, а вовсе не ввод токена как таковой. Убирается он тем, что `client_id`
становится наш, один на всех, зашитый в пакет.

**Решение: трек отложен.** Схема остаётся текущей — пользователь регистрирует своё приложение и вводит
токен. Материал ниже сохранён как вход для будущего возврата к теме, работы по нему сейчас нет.

Статус проверки Яндекс OAuth — **частично подтверждено**:

- Подтверждено: существует режим с `Redirect URI = https://oauth.yandex.ru/verification_code`, когда
  Яндекс показывает код на странице, а пользователь переносит его в приложение. Этого уже достаточно,
  чтобы флоу выглядел как «выполни команду → откроется браузер → подтверди → вставь код»: без
  регистрации приложения пользователем.
- **Не подтверждено:** допускает ли Яндекс `http://localhost:PORT` как Redirect URI. Полностью
  автоматический вариант (как `gh auth login`, где CLI сам ловит код на loopback) зависит именно от
  этого. Доступная документация ответа не дала.
- **Не проверено:** поддерживает ли Яндекс PKCE. Это важно, потому что зашитый в npm-пакет `client_id`
  — публичный клиент, и обмен `code` → токен с `client_secret` для него небезопасен. Если PKCE нет,
  запасной вариант — implicit (`response_type=token`), который секрета не требует.

До ответа на эти два вопроса объём работ по мастеру не оценивается. Проверка дешёвая — регистрация
тестового приложения и два запроса; сделать её надо будет до планирования, а не внутри него.

Registry: выбрать canonical npm artifact, добавить `mcpName`, создать по одному `server.json`, описать
secret env vars, валидировать в CI, после первой ручной публикации подключить GitHub OIDC. Держать
отдельно от protocol validation — Registry в preview.

## Про code execution («MCP-инструменты внутри скриптов»)

Три разные вещи, которые часто смешивают:

1. **Programmatic tool calling** в Claude Developer Platform (`allowed_callers`) — модель пишет код,
   вызывающий tools внутри sandbox-контейнера. Документация прямо перечисляет ограничение:
   *«Tools provided by an MCP connector»* вызывать программно **нельзя**. К нашему stdio-серверу
   неприменимо, включить нечего.
2. **Паттерн code execution with MCP** (Anthropic engineering; Cloudflare Code Mode) — сервер
   представляется агенту как набор типизированных функций, агент пишет код. Реализуется **на стороне
   клиента/харнесса**; со стороны сервера нет переключателя.
3. **Что зависит от нас** — насколько наш сервер пригоден для такого режима. И вот здесь работа есть:
   - `outputSchema` + `structuredContent` — агент получает типизированный объект вместо строки,
     которую надо парсить регэкспами;
   - отсутствие рекурсивных `$ref` — иначе tool просто отвергается;
   - батч-эндпоинты и курсорная пагинация (**уже сделаны**) — скрипт крутит цикл, не вываливая
     промежуточные результаты в контекст.

Практический вывод: специально «включать» нечего, но `outputSchema` перестаёт быть косметикой и
становится входным билетом. Это аргумент за то, чтобы этап 2 не откладывался за этап 3.

## Что убрать или не развивать

- Hardcoded `2025-06-18` и три дублирующихся lifecycle.
- Утверждения «MCP использует draft-7» и «MCP не поддерживает `$ref`».
- Lazy discovery и пакет `search` (этап 1).
- Не добавлять: Roots, Sampling, MCP Logging, DCR, HTTP+SSE, remote HTTP.
- Оставить Pino/stderr — спека прямо рекомендует stderr как замену MCP Logging.
- Привести в актуальное состояние `ARCHITECTURE.md`, `DOCS.md`, `MCP_SERVER_CHECKLIST.md`: они описывают
  преимущественно один Tracker и старый lifecycle.

## Вердикт

Порядок: **дефекты → удаление lazy → контракты tools → dual-era → ценность**. Первые два этапа не
зависят ни от спеки, ни от SDK v2 и дают чистую базу; третий недорог именно потому, что к нему
поверхность уже сокращена. Наибольший продуктовый эффект даёт этап 4 через ResourceLink и Prompts —
они усиливают батч-работу, которая и так наше отличие.

### Открытые вопросы

1. **Внешний вид иконки** — согласовать начертание «FR» до реализации (само поле решено).
2. **Wiki-diff** — возвращаться ли к сценарию Вики в виде diff перед сохранением, или Вика вне
   Apps-трека совсем.
