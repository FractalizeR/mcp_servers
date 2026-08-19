# Долг `typecheck:tests` во framework-пакетах — стартовый замер

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
