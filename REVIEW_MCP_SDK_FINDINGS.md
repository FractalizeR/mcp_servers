# Ревью фичи «Поддержка нового MCP SDK» (dual-era транспорт, SDK v2)

Дата ревью: 2026-08-15. Объект: модернизация MCP-серверов под 2026-07-28 (план
`plan_mcp_2026_modernization`, этапы 3–5), ядро — миграция на MCP SDK v2, две
протокольные эпохи, вынос общего кода в `@fractalizer/mcp-core`.

Метод: оркестратор + 4 параллельных ревью-агента (framework / серверы /
контракты инструментов / тесты) с непересекающимися наборами файлов. Ключевые
находки перепроверены оркестратором чтением кода и установленного SDK
(`@modelcontextprotocol/server@2.0.0`).

## Резюме

Архитектура корректна, критических дефектов (поломка runtime у пользователей)
**не найдено**. Протокольная логика вынесена в framework полностью и
единообразно; три `server.ts` сведены к сборке DI-контейнера + вызову adapter.
Девять raw-wire сценариев покрыты на всех трёх серверах.

Главные претензии: не вынесены остатки общего кода (`getPackageVersion` ×3, DI
binding ×3), 12 модифицирующих инструментов без `requiresExplicitUserConsent`,
несогласованное имя wiki-сервера, сломанный `dev`-скрипт, и ряд мелких
неединообразий контрактов инструментов.

---

## Ответы на вопросы

### 1. Накосячили ли?

Критических багов нет. Есть 1 сломанный dev-скрипт, 1 несогласованность имени
сервера и 12 инструментов с неверным флагом согласия (последнее — известный
открытый пункт плана). Детали в «Находках».

### 2. Архитектура корректна?

Да. Вход `serveStdio(() => buildMcpServer(options), { legacy: 'serve' })`
корректен, собственного хендлера `initialize` и хардкода версии протокола нет;
`server/discover`, `resultType`, `serverInfo` в `_meta`, `ttlMs`/`cacheScope`,
коды `-32022`/`-32602` — встроенное поведение SDK, подтверждено чтением
исходников SDK. `cacheHints` согласованы с закрытым списком `CACHEABLE_RESULT_METHODS`;
`prompts/get` исключён намеренно и правильно. Обработка ошибок осознана и
единообразна (`tools/call` → `isError:true`, `resources/*`/`prompts/*` →
JSON-RPC ошибка). Единственная хрупкая точка — патч приватного `_ondiscover`
для `icons` (см. MEDIUM-1).

### 3. Все инструменты работают единообразно?

Не полностью. Все 153 tool имеют `METADATA`, `outputSchema`, annotations,
регистрацию и используют автогенерацию definition из schema — база единообразна.
Расхождения: `requiresExplicitUserConsent` у 12 write-инструментов,
`subcategory` у delete-операций, `destructiveHint` у update, язык `title`,
`fields` у read-инструментов wiki, `redactionAllowlist`. Детали в «Находках».

### 4. Общий код вынесен в общую библиотеку?

В основном да: вся протокольная логика — в
`packages/framework/core/src/mcp-server-adapter/`. НО остались три
продублированных куска: `getPackageVersion()` (×3), каркас `main()`/bootstrap
(×3), DI-логика `bindTools`/`bindOperations` (×3). См. MEDIUM-2, LOW-3.

---

## Находки

### HIGH

- **[H1]** 12 модифицирующих инструментов с `requiresExplicitUserConsent: false`.
  - tracker: `create-issue`, `create-project`, `create-component`, `create-queue`,
    `add-worklog`, `upload-attachment`;
  - wiki: `create-page`, `create-grid`, `clone-page`, `clone-grid`;
  - ticktick: `create-task`, `create-project`.
  - JSDoc SDK предписывает `true` для create/delete; внутри wiki есть
    непоследовательность: `create_comment` = `true`, `create_page` = `false`.
  - Эвристика `validate:tools` это не ловит — три разных списка
    `destructivePatterns`: tracker `['update','delete','transition_issue','execute','bulk','batch']`,
    wiki `['update','delete','append','bulk','batch']`,
    ticktick `['update','delete','complete','batch','bulk']` — нигде нет
    `create`/`clone`/`add`/`upload`/`remove`/`append`(у tracker).
  - Статус: задокументировано в README плана как открытый пункт №5 («решение
    владельца не принято») — это НЕ упущение, а нерешённое решение, но реальное
    отклонение от спеки и от единообразия.
  - Исправить: выставить `true` у 12 файлов и расширить `destructivePatterns`
    во всех трёх валидаторах.

### MEDIUM

- **[M1]** `discover-server-info.ts:89-109` — патч приватного `_ondiscover`.
  Работает на SDK 2.0.0 (проверено), есть guard `isDiscoverBaseResult`, но
  опора на непубличный контракт: если SDK сделает метод `#private` или изменит
  правило «handler — более специфичный автор `_meta`», иконки тихо перестанут
  попадать в `server/discover`. Рекомендация: добавить в raw-wire сценарий 2
  негативный ассерт «icons отсутствуют в per-response `_meta`» (сейчас
  отсутствие иконки в обычных ответах держится только на чтении исходников SDK).

- **[M2]** `getPackageVersion()` продублирован 1-в-1 в трёх `server.ts`
  (tracker:34-44, wiki:34-44, ticktick:35-45). В framework хелпера нет.
  Рекомендация: экспортировать хелпер из `@fractalizer/mcp-core` (или отдать
  чтение версии самому adapter).

- **[M3]** `packages/servers/yandex-tracker/package.json:69` — сломан
  `dev`-скрипт: `node dist/yandex-tracker.bundle.js`, но tsup генерирует `.cjs`
  (`outExtension: { js: '.cjs' }`), файла `.js` нет. `bin` корректно указывает
  `.cjs`. `npm run dev` упадёт. Исправить на `.cjs`.

- **[M4]** `packages/servers/yandex-wiki/src/constants.ts:15` — `MCP_SERVER_NAME = 'yandex-wiki'`,
  выбивается из паттерна `fractalizer_mcp_*` (tracker/ticktick) и расходится с
  собственным `manifest.json:4` (`name: "fractalizer_mcp_yandex_wiki"`). Побочно:
  `normalizeToolName` снимает префикс `"yandex-wiki:"`, а клиент, скорее,
  добавит `"fractalizer_mcp_yandex_wiki:"`. Рекомендация: привести
  `PROJECT_BASE_NAME` к единому паттерну.

- **[M5]** `subcategory` у delete-операций не единообразна: `delete-page` = `'delete'`,
  `delete-grid` = `'write'` (wiki), `delete-project` = `'delete'` vs
  `delete-comment`/`delete-board` = `'write'` (tracker). Ломает рубильник
  `DISABLED_TOOL_GROUPS` по subcategory («отключить все delete» одним правилом
  нельзя).

- **[M6]** `destructiveHint` у update не единообразен: tracker `update-issue` =
  `false`, wiki `update-page` / ticktick `update-task` = `true`. Нет единого
  правила, считать ли update разрушительным. Нужно решить и выровнять.

- **[M7]** Сырые raw-wire тесты слабы в двух местах (см. M7/M8 из отчёта тестов):
  - сценарий 8 («главный тест» — одинаковый `tools/call` в обеих эпохах)
    вызывает `ping` с нулём аргументов и dummy-токеном → проверяет только путь
    ошибки (`isError:true`), а не успешный результат; сериализация/валидация
    аргументов между эпохами не покрыта;
  - сценарий 9 не доказывает, что отказ вызван именно policy: ассертится только
    `isError:true` + равенство между эпохами, а не текст отказа
    (`denialReason` из `tool-access-policy.ts:73`).
  - Доп.: `test:raw-wire` запускает `tsx scripts/raw-wire-test.ts`, который
    спавнит `node dist/*.bundle.cjs` как сервер под тестом — без предварительной
    сборки. Свежесть/наличие бандла гарантируется только turbo `dependsOn:
    build`; прямой прогон скрипта тестирует устаревший или отсутствующий бандл.

- **[M8]** У yandex-wiki нет wire-уровневых тестов resources/prompts (только
  unit-тесты провайдеров), тогда как tracker и ticktick их имеют. Маршрутизация
  URI, `-32602` на несуществующий ресурс/промпт, `ttlMs`/`cacheScope` на wire
  для wiki не проверены.

- **[M9]** 6 нарушений лимита description ≤80 символов: wiki `upload-attachment` (89),
  `delete-grid` (120), `remove-page-access` (91), `delete-comment` (82),
  `get-resources` (84); ticktick `get-projects` (98).

### LOW

- **[L1]** `build-mcp-server.ts:206,255,267,326` — избыточные касты `as
  ReadResourceRequestParams` / `as GetPromptRequestParams` / `as { cursor? }` /
  `args as Record<string,unknown>`: SDK типизирует `request.params` через
  `RequestTypeMap`, касты не нужны. Ослабляют сигнал типобезопасности.

- **[L2]** `tool-sorter.ts:34,36,83` — хвостовые пробелы; `format:check` в
  `validate.sh` не входит, поэтому CI зелёный, но `prettier --check` упадёт.

- **[L3]** DI-логика `bindTools`/`bindOperations` (проверка `typeof X !== 'function'`,
  `.name`, `Symbol.for(className)`) продублирована в трёх `container.ts`.
  Кандидат на framework helper. Также разный подход к DI-токенам: tracker/wiki —
  автогенерация `TOOL_SYMBOLS`/`OPERATION_SYMBOLS`, ticktick — ручной перечень.

- **[L4]** `tool-access-policy.ts:11-13` + `tool-registry.ts:134-147` —
  документационный дрейф: шапка ещё ссылается на `getDefinitions(disabledFilter)`
  через `ToolFilterService`, хотя adapter зовёт `getVisibleDefinitions()` через
  `accessPolicy`. `getDefinitions` остаётся публичной второй точкой построения
  видимости. Обновить комментарий / пометить `getDefinitions` deprecated.

- **[L5]** Регистрация Resource/Prompt-реестров — три разных паттерна: tracker
  через фабрики-модули, wiki/ticktick инлайном; имена `bindResources`/`bindPrompts`
  (ticktick) vs `bindResourceRegistry`/`bindPromptRegistry` (tracker/wiki).

- **[L6]** `redactionAllowlist` непоследовательно: у `ping` tracker/wiki поле
  отсутствует, у ticktick — `[]`; `raw-api-request` — `[]` (ticktick) vs
  `['method','path','fields']` (tracker/wiki).

- **[L7]** Язык `title`: ticktick все 25 на английском, tracker/wiki на русском.
  `ping` title различается даже между RU-серверами.

- **[L8]** `fields` у read-инструментов wiki непоследовательно: `get-page`/
  `get-page-by-id`/`get-grid` требуют `fields`, а `get-comments`/`get-comment-thread`/
  `get-descendants`/`search`/`get-resources` — не имеют параметра `fields` вовсе.
  Возможно осознанно (Wiki API не поддерживает фильтрацию для комментариев), но
  договорённость не зафиксирована.

- **[L9]** `tsup.config.base.ts:23` — `target: 'node18'` при `engines.node >=22`.
  Мелкая несогласованность.

- **[L10]** `tracker/tests/smoke/mcp-server-lifecycle.smoke.test.ts:27-44` —
  впустую зелёные ассерты (проверяют SDK, а не наш код). Магический счётчик
  «ровно 25 инструментов» в ticktick smoke — хрупкий.

- **[L11]** `scripts/` и `tests/` исключены из `typecheck` (tsconfig:
  `include: ["src/**/*"]`), поэтому в тестах/скриптах есть реальные, но не
  пойманные CI ошибки типов: `raw-wire-test.ts:293`
  (`error.data.supported` при типе `data: {}` у всех трёх серверов) и
  smoke-тесты tracker с неполным `ServerConfig` (нет `logsDir`/`logMaxSize`/
  `logMaxFiles`). Работают из-за `tsx` (без typecheck), но сигнал
  типобезопасности в тестовом коде потерян.

---

## Что сделано хорошо (не находки)

- Протокольная логика вынесена в framework полностью: `setRequestHandler` /
  `new Server(` / `serveStdio` / `'2025-06-18'` в серверных пакетах отсутствуют
  (grep, ноль совпадений).
- `toolRegistry.getVisibleDefinitions()` и `execute()` используют один и тот же
  объект `accessPolicy` — структурное единство tools/list и tools/call.
- 9 raw-wire сценариев × 3 сервера покрыты; сценарии 3/4 корректны
  (версия валидируется один раз при открытии соединения — подтверждено SDK).
- JSON Schema 2020-12 + автогенерация definition: ручных `.definition.ts` нет.
- `outputSchema` и annotations проставлены у всех 153 инструментов.

---

## Приоритет исправлений (предложение)

1. H1 — флаг `requiresExplicitUserConsent` у 12 write-инструментов (решение
   владельца + правка 12 файлов + расширение `destructivePatterns`).
2. M3 — сломанный `dev`-скрипт tracker (одна строка).
3. M4 — имя wiki-сервера (согласовать `PROJECT_BASE_NAME` и `manifest.json`).
4. M2 — вынести `getPackageVersion` в framework.
5. M5/M6/M9 — выровнять контракты инструментов (subcategory, destructiveHint,
   длину description).
6. M7/M8 — усилить raw-wire сценарии 8/9, добавить wire-тесты resources/prompts
   для wiki.
