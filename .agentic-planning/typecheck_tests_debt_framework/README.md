# Долг `typecheck:tests` во framework-пакетах — итог

**Результат: 0 ошибок во всех четырёх пакетах, гейт включён и проверен делом.**
Ниже — стартовый замер и разбор по причинам.

Дата замера: 2026-08-19. Конфиг: `packages/framework/*/tsconfig.tests.json`
(`extends ./tsconfig.json`, `include: src+tests`, `noEmit`), команда
`tsc --noEmit -p <пакет>/tsconfig.tests.json`.

**Важно про провижининг.** Первый замер в этом worktree дал у `dev-client` 10 ошибок
`TS2307` на `@modelcontextprotocol/client` — включая файлы `src/**`. Это был артефакт
непровизионированного дерева (у `dev-client` не было `node_modules`, пакет новее
последнего `npm install` здесь), а не долг типизации. После `npm install` `src`
чистый, а в тестах вскрылись настоящие 23 ошибки. Цифры ниже — после провижининга.

## Итог по пакетам

| Пакет | Ошибок | Файлов |
|---|---:|---:|
| `core` | 149 | 12 |
| `infrastructure` | 8 | 1 |
| `cli` | 0 | 0 |
| `dev-client` | 23 | 4 |
| **всего** | **180** | |

## Распределение по кодам (все пакеты)

| Код | Кол-во | Что означает |
|---|---:|---|
| TS4111 | 109 | поле из индексной сигнатуры читается через точку (`noPropertyAccessFromIndexSignature`) |
| TS2322 | 21 | тип не присваивается целевому |
| TS2417 | 16 | несовместимость статической стороны класса при `extends` |
| TS2353 | 14 | в объектном литерале поле, которого нет в целевом типе |
| TS2532 | 4 | объект возможно `undefined` (`noUncheckedIndexedAccess`) |
| TS2493 | 4 | индекс за пределами кортежа |
| TS2349 | 4 | выражение не вызывается (тип `never`) |
| TS6133 | 2 | объявлено, но не используется |
| TS2554 | 2 | неверное число аргументов |
| TS2416 | 2 | свойство класса не соответствует базовому типу |
| TS2578 | 1 | лишний `@ts-expect-error` |
| TS2352 | 1 | приведение между несопоставимыми типами |

## Пофайлово

### core — 149

| Файл (от корня пакета) | Код | Кол-во |
|---|---|---:|
| `tests/definition/schema-to-definition.test.ts` | TS4111 | 54 |
| `tests/definition/zod-json-schema-adapter.test.ts` | TS4111 | 38 |
| `tests/utils/zod-error-formatter.test.ts` | TS2353 | 14 |
| `tests/tool-registry.contract.test.ts` | TS2417 | 11 |
| `tests/tools/common/collection-result/format-collection-result.test.ts` | TS4111 | 9 |
| `tests/tools/base/base-tool.test.ts` | TS4111 | 8 |
| `tests/tool-registry.contract.test.ts` | TS2532 | 3 |
| `tests/tool-access-policy.test.ts` | TS2417 | 2 |
| `tests/tool-access-policy.test.ts` | TS2554 | 2 |
| `tests/definition/zod-json-schema-adapter.test.ts` | TS2578 | 1 |
| `tests/mcp-server-adapter/prompts.wire.test.ts` | TS6133 | 1 |
| `tests/mcp-server-adapter/resources.wire.test.ts` | TS6133 | 1 |
| `tests/params-redactor.test.ts` | TS2532 | 1 |
| `tests/tool-registry.logging.test.ts` | TS2352 | 1 |
| `tests/tool-registry.logging.test.ts` | TS2417 | 1 |
| `tests/tool-registry.redaction-allowlist.test.ts` | TS2417 | 1 |
| `tests/tools/common/collection-result/format-collection-result.test.ts` | TS2417 | 1 |

### infrastructure — 8

| Файл (от корня пакета) | Код | Кол-во |
|---|---|---:|
| `tests/http/client/http-client.test.ts` | TS2349 | 4 |
| `tests/http/client/http-client.test.ts` | TS2493 | 4 |

### cli — 0

Долга нет.


### dev-client — 23

| Файл (от корня пакета) | Код | Кол-во |
|---|---|---:|
| `tests/cli/run-cli.test.ts` | TS2322 | 13 |
| `tests/unit/session/dev-session.test.ts` | TS2322 | 5 |
| `tests/unit/secrets/canary.test.ts` | TS2322 | 3 |
| `tests/unit/session/fake-transport.ts` | TS2416 | 2 |


## Что чинилось, по причинам

| Причина | Где | Снято |
|---|---|---:|
| Поле индексной сигнатуры читается через точку (TS4111) | core, 109 обращений в 4 файлах | 149 → 40 |
| `METADATA` тестовых tool-классов не удовлетворял `StaticToolMetadata`: нет `name`/`description`/`tags`/`isHelper`, в `category` строки вне `ToolCategory`. Наследники давали каскад TS2417 | core, 6 файлов | 40 → 25 |
| Индексный доступ без проверки (`noUncheckedIndexedAccess`) | core, 4 места | там же |
| Фикстуры `ZodIssue`: состав сверх обязательной тройки зависит от `code` и в `ZodIssueMinimal` намеренно не назван | core, 14 литералов | 25 → 11 |
| `AllowAllToolAccessPolicy` сужал сигнатуру `ToolAccessPolicy` до 0 аргументов — вызов через конкретный тип не компилировался | core, `src/` | 11 → … |
| Прочее в core: мёртвое поле `serverTransport` в двух wire-харнессах, лишний `@ts-expect-error`, приведение спаев логгера → `vi.mocked` | core, 4 файла | … → 0 |
| `vi.fn()` без типа у `interceptors.*.use`: `mock.calls[0]` вырождался в пустой кортеж, колбэк — `never` | infrastructure, 1 файл | 8 → 0 |
| `FakeTransport.onmessage`/`send` сужали сигнатуры `Transport`, из-за чего фейк не подходил под фабрику транспорта | dev-client, 4 файла (правка в одном) | 23 → 0 |

Две правки пришлись на `src/`, обе — исправление типа, расходящегося с
поведением, а не подгонка под тест:

- `AllowAllToolAccessPolicy.isVisible()/isCallable()` объявляли 0 параметров
  при интерфейсе с одним;
- (отклонено) индексная сигнатура в `ZodIssueMinimal` — она чинит тесты, но
  ломает приём настоящих `$ZodIssue[]` от Zod в `base-tool.ts`. Вместо неё
  расширена форма фикстуры в тесте.

## Non-null assertions и приведения

Требование «не глушить через `!` и `as`» выполнено: подавлений не добавлено,
общий счёт приведений снизился.

| Пакет | `!` до → после | `as X` до → после | `as unknown as` до → после |
|---|---|---|---|
| core | 3 → 3 | 133 → 132 | 69 → 69 |
| infrastructure | 0 → 0 | 24 → 24 | 3 → 3 |
| cli | 3 → 3 | 45 → 45 | 12 → 12 |
| dev-client | 0 → 0 | 19 → 19 | 1 → 1 |
| **всего** | **6 → 6** | **221 → 220** | **85 → 85** |

В `dev-client` число приведений то же, но одно из них стало правдивым:
было `response as JsonRpcRequest` на ответе сервера (ответ запросом не
является), стало `as JSONRPCMessage` на границе «сервер вернул что угодно».

## Проверка гейта делом

В `packages/framework/cli/tests/gate-probe.test.ts` внесена намеренная ошибка
(`const n: number = 'строка'`). `npm run validate:quiet` упал с
`ERROR @fractalizer/mcp-cli#typecheck:tests ... exited (2)` и текстом
`error TS2322`. После удаления пробы — 58 задач turbo, 0 ошибок.

`turbo run typecheck:tests` после подключения — 12 задач вместо 8: задача в
`turbo.json` и шаг в `scripts/validate.sh` уже были, новые пакеты подхватились
без правки этих файлов.
