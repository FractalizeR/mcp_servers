# Находки — codex (внешний CLI-ревьюер)

Материал: диапазон `fe3bcbe4..HEAD` ветки `feat/tracker-v3-migration`, дифф целиком (168 файлов, `changes.diff`). Слайс не применялся (`slice` не передан). Все находки верифицированы фасилитатором дополнительным чтением кода поверх verification, присланного codex.

### codex-01

- **reviewer**: codex
- **severity**: HIGH
- **kind**: pattern
- **domain**: reliability
- **title**: Удалённые из схем параметры (`issueTypes`, `version`) молча игнорируются вместо отклонения запроса
- **mechanism**: `CreateQueueParamsSchema` и `UpdateBoardParamsSchema` — обычные `z.object()` без `.strict()`. Zod по умолчанию отбрасывает неизвестные ключи молча (это задокументировано в самом коде — см. evidence). Клиент, ещё присылающий старую форму (`issueTypes` у `create_queue`, `version` у `update_board`), получает успешный ответ без части своего намерения — воспроизводится тот же класс дефекта, что и повод всего ревью (`POST /v3/boards` игнорировал тело).
- **trigger**: воспроизводится в нормальной работе — клиент с закешированной старой схемой, ручной MCP-вызов или dev-client передаёт прежний `issueTypes`/`version`.
- **in_scope**: да
- **anchor**: `packages/servers/yandex-tracker/src/tools/api/queues/create-queue.schema.ts:11-15`, `packages/servers/yandex-tracker/tests/tools/api/boards/update-board.tool.test.ts:81-85`, `packages/framework/core/src/tools/base/unrecognized-params.ts:3-7`
- **evidence**:
  ```typescript
  // create-queue.schema.ts:11-15
  * Параметра `issueTypes` здесь нет намеренно: живая проба 2026-08-25 показала
  * `400 issueTypes: Incorrect data format`
  */
  export const CreateQueueParamsSchema = z.object({
  ```
  ```typescript
  // update-board.tool.test.ts:81-85
  await tool.execute({ boardId: '5', name: 'X', version: 6, fields: ['id'] });
  expect(mockTrackerFacade.updateBoard).toHaveBeenCalledWith(
    '5',
    expect.not.objectContaining({ version: expect.anything() })
  );
  ```
  ```typescript
  // unrecognized-params.ts:3-7
  * `additionalProperties: false` JSON Schema (протокольный уровень) сообщение
  * называет только НЕДОСТАЮЩИЙ параметр — Zod по умолчанию (`z.object()`, без
  * `.strict()`) молча отбрасывает лишние ключи и никак не отражает их в issues.
  ```
- **verification**: confirmed
- **verification_note**: Фасилитатор перепроверил цепочку: `base-tool.ts:224` (`validateParams`) вызывает `schema.safeParse(params)` без `.strict()` — совпадает с комментарием в `unrecognized-params.ts`. `additionalProperties: false` существует только в опубликованной JSON Schema (для клиентского discovery), а не как runtime-гейт перед вызовом `execute` в этом коде. Тест `update-board.tool.test.ts:81-85` прямо закрепляет, что вызов с `version` доходит до фасада без него — то есть ошибки не возникает, значение тихо съедено.
- **fix_direction**: На серверной границе (`validateParams`/`BaseTool`) отклонять неизвестные top-level параметры (`.strict()` или явная проверка через `describeValidationErrorWithUnrecognizedKeys`, но как обязательную ошибку, а не только текстовую подсказку), либо явно проверять снятые ключи (`issueTypes`, `version`) с миграционным сообщением.

### codex-02

- **reviewer**: codex
- **severity**: MEDIUM
- **kind**: pattern
- **domain**: reliability
- **title**: Сверка маршрутов (`sweep-doc-routes.ts`) успешно завершается на неполном наборе страниц
- **mechanism**: Страница, которую не удалось скачать/распарсить, безусловно пропускается (`catch` печатает предупреждение и продолжает), отчёт всё равно пишется, exit code остаётся 0. Проверки полноты (сверка числа полученных страниц с оглавлением, allowlist объяснимых пропусков) нет — временный сетевой сбой превращает «сплошную сверку» в частичную, внешне успешную.
- **trigger**: воспроизводится в нормальной работе — обрыв/ошибка при загрузке одной страницы (сетевые сбои реалистичны при VPN со split-tunnel, см. глобальные инструкции пользователя).
- **in_scope**: да
- **anchor**: `packages/servers/yandex-tracker/scripts/sweep-doc-routes.ts:396-403`
- **evidence**:
  ```typescript
  for (const page of toc) {
    try {
      pages.push(parsePage(page, await fetchPage(page)));
    } catch (error) {
      // Оглавление справочника содержит и битые ссылки — это не повод ронять сверку.
      process.stdout.write(`  пропущена ${page}: ${(error as Error).message}\n`);
    }
  }
  ```
- **verification**: confirmed
- **verification_note**: Фасилитатор перечитал `main()` целиком (строки 389-408) — пропуски нигде не агрегируются, exit code не меняется, число `pages.length` нигде не сверяется с `toc.length`. `doc-route-sweep.md:3` фиксирует факт «Страниц справочника: 152» без указания, что 156 из BRIEF было исходным намерением — расхождение реально присутствует в артефактах текущего диапазона.
- **fix_direction**: Ввести проверяемый инвариант полноты (сравнение фактически распарсенных страниц с оглавлением), отдельный allowlist действительно битых/deprecated ссылок и вывод всех пропусков в итоговом отчёте; необъяснённый пропуск должен завершать сверку ненулевым кодом.

### codex-03

- **reviewer**: codex
- **severity**: MEDIUM
- **kind**: point
- **domain**: reliability
- **title**: Проверка допустимости ключа тела ищет совпадение по всему тексту страницы, включая описание ответа
- **mechanism**: Для маршрута собирается `blob` — весь текст всех страниц, попавших в `hitPages` (`.map(page => page.text).join(' ')`), и ключ считается «известным документации», если слово встречается в этом blob где угодно — в разделе ответа, в примере, в примечании. Структурного выделения именно секции request body нет, поэтому параметр, который документирован только как поле ОТВЕТА (но отклоняется API при отправке в теле запроса), пройдёт эту проверку как «задокументированный».
- **trigger**: воспроизводится в нормальной работе — совпадение имени поля запроса с полем ответа/термином в тексте статьи.
- **in_scope**: да
- **anchor**: `packages/servers/yandex-tracker/scripts/sweep-doc-routes.ts:289-297`
- **evidence**:
  ```typescript
  const blob = pages
    .filter((page) => hitPages.includes(page.page))
    .map((page) => page.text)
    .join(' ');
  ...
  const absent = call.bodyKeys.filter(
    (key) =>
      !SAMPLE_ARTEFACT_KEYS.has(key) && !new RegExp(`(?<![\\w-])${key}(?![\\w-])`).test(blob)
  );
  ```
- **verification**: confirmed
- **verification_note**: Прочитан код целиком вокруг `judge()` (строки 281-300) — подтверждено, что `blob` не разделяет секции документа, а `absent` вычисляется простым текстовым совпадением по всему blob. Механизм подтверждён напрямую по коду, независимо от конкретного примера `update_board.version` из ответа codex.
- **fix_direction**: Извлекать структурно только секцию параметров request body при парсинге страницы (`parsePage`); текст ответа/ошибок/примечаний анализировать отдельно или не учитывать вовсе при проверке допустимости ключей запроса.

### codex-04

- **reviewer**: codex
- **severity**: MEDIUM
- **kind**: contract
- **domain**: reliability
- **title**: `orderBy` и `orderAsc` объявлены в `LIVE_VERIFIED_KEYS` как live-verified без фактического живого подтверждения
- **mechanism**: Контракт, зафиксированный в комментарии рядом с `LIVE_VERIFIED_KEYS`, разрешает запись в исключение ТОЛЬКО после живой пробы с чтением сохранённого результата. Приложенный журнал живого прогона (`2_LIVE_RUN_REPORT_2026-08-25c.md`) показывает, что `orderBy` без `filter` был отклонён СХЕМОЙ ДО ЗАПРОСА (не дошёл до API), а `orderAsc` вообще не упомянут ни в одной строке журнала. Тем не менее оба ключа занесены в исключение вместе с `filter` (который единственный реально проверен чтением).
- **trigger**: воспроизводится в нормальной работе — каждый следующий запуск `npm run sweep:doc-routes` подавляет потенциальный сигнал по этим двум ключам как «уже закрытый», даже если API их на самом деле отвергает или игнорирует.
- **in_scope**: да
- **anchor**: контракт `LIVE_VERIFIED_KEYS` — `packages/servers/yandex-tracker/scripts/sweep-doc-routes.ts:91-103`, журнал `.agentic-planning/plan_tracker_route_sweep_fixes/2_LIVE_RUN_REPORT_2026-08-25c.md:34-36`
- **evidence**:
  ```typescript
  // sweep-doc-routes.ts:93-98
  * Запись сюда добавляется ТОЛЬКО после живой пробы с чтением результата;
  ...
  const LIVE_VERIFIED_KEYS = new Map<string, Set<string>>([
    ['fr_yandex_tracker_create_queue', new Set(['description'])],
    ['fr_yandex_tracker_update_board', new Set(['filter', 'orderBy', 'orderAsc', 'query'])],
  ```
  ```markdown
  <!-- 2_LIVE_RUN_REPORT_2026-08-25c.md, таблица "Что доказано" -->
  | `update_board` с `orderBy` без `filter` | `422` от API | отказ схемы **до** запроса |
  ```
- **verification**: confirmed
- **verification_note**: Фасилитатор прочитал `2_LIVE_RUN_REPORT_2026-08-25c.md` целиком (52 строки) — `orderAsc` не встречается нигде в файле ни разу, а строка про `orderBy` прямо говорит «отказ схемы до запроса», то есть API не был вызван и результат не мог быть прочитан. Это прямое противоречие требованию «проба с чтением результата», сформулированному в соседнем комментарии кода.
- **fix_direction**: Убрать `orderBy` и `orderAsc` из `LIVE_VERIFIED_KEYS`, пока не проведена отдельная живая проба `filter + orderBy + orderAsc` с чтением сохранённого результата. Для каждой записи исключения хранить ссылку на конкретное доказательство (файл/строку журнала) и дату проверки, а не полагаться на комментарий-инвариант без перекрёстной ссылки.

### codex-05

- **reviewer**: codex
- **severity**: MEDIUM
- **kind**: judgement
- **domain**: architecture
- **title**: Prompt `project-summary` и resource `tracker://project/{id}` удалены вместе с legacy HTTP-семейством вместо миграции на Entity API
- **mechanism**: Обоснование удаления в коде — отсутствие гарантированных полей у Entity Project. Инвентаризация того же диапазона работ перечисляет документированные поля Entity Project (`summary`, `description`, `lead`, `start`, `end`, `entityStatus`, `teamUsers`, read-only `issueQueues`), которых, по мнению codex, достаточно для переноса основной read-функциональности prompt/resource на Entity API, даже если старый числовой project ID нельзя сохранить как есть.
- **trigger**: воспроизводится в нормальной работе — существующий клиент, ранее вызывавший prompt `project-summary` или читавший сохранённый `tracker://project/{id}` URI, теряет эту возможность после обновления без замены.
- **in_scope**: да
- **anchor**: решение удалить project-oriented MCP surface (`prompts/tracker-prompt-provider.ts`, `resources/project-resource-provider.ts` — удалён; `resources/tracker-resource-uri.ts`)
- **evidence**:
  - `packages/servers/yandex-tracker/src/prompts/tracker-prompt-provider.ts:5-9` — обоснование удаления отсутствием гарантированных полей.
  - `.agentic-planning/plan_tracker_route_sweep_fixes/inventory/projects-vs-entities.md:25-49` — перечень Entity-инструментов и документированных полей проекта.
- **verification**: unverifiable
- **verification_note**: Фасилитатор подтверждает факт удаления по diff (`project-resource-provider.ts` удалён целиком, 85 строк; промпт удалён, 61 строка) и наличие полей в инвентаризации. Сама находка — архитектурно-продуктовое суждение (достаточна ли Entity-семантика для замены, оправдан ли breaking change без миграционного пути) и в принципе не проверяется кодом — `kind: judgement` с `verification: unverifiable` присвоен корректно согласно правилу 2 схемы.
- **fix_direction**: Отделить решение «удалить legacy HTTP-инструменты `/v3/projects`» от решения «убрать presentation-слой (prompt/resource)»: либо предоставить Entity-ориентированные prompt/resource с каноническим Entity ID, либо явно оформить это как продуктовый breaking change с документированным миграционным путём для клиентов.

## Coverage

- Полностью прочитан `changes.diff` (11 809 строк, 168 файлов) и `diff_files.txt`; прочитаны `BRIEF.md`, `CLAUDE.md` (корень и `packages/servers/yandex-tracker/`).
- HTTP-контракты `update_component`, `update_board`, `create_queue` сверены от Zod-схемы через tool/facade до operation — фасилитатор дополнительно перепроверил `base-tool.ts:validateParams` (`schema.safeParse` без `.strict()`), подтвердив механизм codex-01 независимо от примера codex.
- `live_scope` после снятия правила `/v3/projects`: фасилитатор независимо подтвердил `RAW_API_METHODS = ['GET'] as const'` (`packages/framework/core/src/tools/raw/raw-api.types.ts:16`) — рубеж остаётся fail-closed для raw-инструмента, других путей мутации к `/v3/projects` в текущем surface нет (согласовано с отклонённой находкой codex-R01).
- Скрипт сверки `scripts/sweep-doc-routes.ts` — механизмы пропуска страниц (codex-02) и текстового поиска ключей по всему blob (codex-03) перепроверены фасилитатором прямым чтением исходного кода вне зависимости от формулировок codex.
- `LIVE_VERIFIED_KEYS` (codex-04) — расхождение между декларацией и журналом живого прогона перепроверено фасилитатором построчным чтением `2_LIVE_RUN_REPORT_2026-08-25c.md` целиком; `orderAsc` там действительно не упоминается ни разу.
- Удаление project-oriented prompt/resource (codex-05) подтверждено по diff как факт; оценочная часть находки оставлена как `judgement`.
- Composition root, facade (`yandex-tracker.facade.ts`), barrel-exports, счётчик инструментов 92→85 — проверено codex, фасилитатор точечно не перепроверял (доверился отчёту coverage codex ввиду большого объёма материала и совпадения с diff_files.txt по составу удалённых файлов).
- Переписанные тесты рубежа (12 файлов live_scope) — codex заявляет сохранение механик fail-closed/ID-key/people-refs; фасилитатор не перечитывал все 12 файлов построчно (не хватило бюджета в рамках этого захода), считать зоной неполного покрытия.

## Не покрыто (фасилитатором и/или codex)

- Мутирующие живые вызовы против боевого API фасилитатором не выполнялись (как и codex) — верификация опирается на статический код и приложенные журналы прошлых живых прогонов.
- Полное построчное перечитывание всех 12 переписанных тестов `tests/live_scope/*` фасилитатором не проводилось — доверие к coverage-заявлению codex здесь ниже, чем к точечно перепроверенным находкам.
- Поведение MCP SDK/транспорта относительно `additionalProperties: false` (действительно ли клиентская сторона протокола где-то отбрасывает лишние поля ДО вызова `execute`) не проверялось — находка codex-01 верифицирована на уровне серверного кода этого репозитория, а не всего стека MCP.
- Пустой `filter: {}`, комбинация `filter + orderBy + orderAsc` одновременно, полный набор полей ответа Entity Project при реальном вызове API, поведение при отсутствии `version` в ответе компонента — не проверялись ни codex, ни фасилитатором (нет доступа к боевому API в этом заходе).
- Скрипт `enumerate-outgoing-requests.ts` и `build-coverage-matrix.ts` (изменены в diff) не рассматривались отдельно ни codex, ни фасилитатором.

## Отклонённые находки

- codex-R01 | Снятие правила `/v3/projects` из рубежа живого прогона открывает мутирующий raw-запрос | Независимо подтверждено: `RAW_API_METHODS = ['GET'] as const` (`packages/framework/core/src/tools/raw/raw-api.types.ts:16`) — raw-инструмент физически не может отправить не-GET, остальные мутации отклоняются fail-closed за отсутствием совпадающего правила.
- codex-R02 | GET текущей версии перед `PATCH` создаёт lost update | Версия читается и передаётся в PATCH; конкурентная запись между GET и PATCH вызывает конфликт оптимистичной блокировки API (428/409-подобный), а не молчаливую потерю записи.
- codex-R03 | Переписанные тесты live_scope потеряли проверку дуальной адресации ID/key и рекурсивного поиска ссылок на людей | По утверждению codex эти механики сохранены на материале queue/globalField и общей рекурсивной проверке тела; фасилитатор точечно не перепроверял (см. «Не покрыто» выше) — отклонение принимается на основании отчёта codex, не независимо подтверждено.
- codex-R04 | `manifest.json` продолжает отключать категорию `projects` по умолчанию | Это производный сгенерированный артефакт из уже исправленного `manifest.template.json` — не самостоятельный дефект.
- codex-R05 | Пустой `filter: {}` у `update_board` гарантированно обходит контракт API | Схема формально принимает пустую карту, но данных, что API её отвергает или ведёт себя некорректно, в материале ревью нет — не доказано ни в одну, ни в другую сторону.
