### codex-01

- **reviewer**: codex
- **severity**: HIGH
- **kind**: pattern
- **domain**: reliability
- **title**: Удалённые параметры молча игнорируются вместо отклонения запроса
- **mechanism**: `issueTypes` у `create_queue` и `version` у `update_board` удалены из опубликованных схем, но runtime-валидация использует обычный `z.object()`, который отбрасывает неизвестные ключи. Сервер принимает старую форму запроса и продолжает мутацию без параметра: очередь может быть создана без запрошенной настройки типов, а доска — обновлена без ожидаемой вызывающим проверки версии. Это воспроизводит исходный класс дефекта «операция успешна, часть намерения проигнорирована».
- **trigger**: воспроизводится в нормальной работе — клиент с закешированной старой схемой, ручной MCP-вызов или dev-client передаёт прежний `issueTypes`/`version`.
- **in_scope**: да
- **anchor**: `CreateQueueParamsSchema`, `UpdateBoardParamsSchema`, `BaseTool.validateParams`
- **evidence**:
  - `packages/servers/yandex-tracker/src/tools/api/queues/create-queue.schema.ts:11-15`
    ```typescript
    * Параметра `issueTypes` здесь нет намеренно: живая проба 2026-08-25 показала
    * `400 issueTypes: Incorrect data format`
    */
    export const CreateQueueParamsSchema = z.object({
    ```
  - `packages/servers/yandex-tracker/tests/tools/api/boards/update-board.tool.test.ts:81-85`
    ```typescript
    await tool.execute({ boardId: '5', name: 'X', version: 6, fields: ['id'] });

    expect(mockTrackerFacade.updateBoard).toHaveBeenCalledWith(
      '5',
      expect.not.objectContaining({ version: expect.anything() })
    ```
  - `packages/framework/core/src/tools/base/unrecognized-params.ts:3-7`
    ```typescript
    * `additionalProperties: false` JSON Schema (протокольный уровень) сообщение
    * называет только НЕДОСТАЮЩИЙ параметр — Zod по умолчанию (`z.object()`, без
    * `.strict()`) молча отбрасывает лишние ключи и никак не отражает их в issues.
    ```
- **verification**: confirmed
- **verification_note**: Изолированный вызов `safeParse` подтвердил обе ветки: схемы вернули `success: true`, удалив соответственно `issueTypes` и `version` из результата. Тест `update-board.tool.test.ts` также прямо закрепляет продолжение вызова фасада после передачи `version`.
- **fix_direction**: На серверной границе отклонять неизвестные параметры либо добавить адресную проверку снятых ключей с миграционным сообщением. Покрыть runtime-вызовы обоих инструментов прежней формой, а не только отсутствие свойств в JSON Schema.

### codex-02

- **reviewer**: codex
- **severity**: MEDIUM
- **kind**: pattern
- **domain**: reliability
- **title**: Сверка маршрутов успешно завершается на неполном наборе страниц
- **mechanism**: Страница, которую не удалось скачать, безусловно пропускается; отчёт всё равно записывается, а процесс завершается успешно. Проверки полноты оглавления или списка допустимых битых страниц нет. Временный сетевой сбой поэтому превращает «сплошную сверку» в частичную, внешне успешную.
- **trigger**: воспроизводится в нормальной работе — достаточно обрыва или ошибки при загрузке одной страницы документации; сетевые сбои особенно реалистичны при используемом VPN.
- **in_scope**: да
- **anchor**: `scripts/sweep-doc-routes.ts::main`, `review-route-sweep/BRIEF.md`, `doc-route-sweep.md`
- **evidence**:
  - `packages/servers/yandex-tracker/scripts/sweep-doc-routes.ts:398-403`
    ```typescript
    try {
      pages.push(parsePage(page, await fetchPage(page)));
    } catch (error) {
      process.stdout.write(`  пропущена ${page}: ${(error as Error).message}\n`);
    }
    ```
  - `review-route-sweep/BRIEF.md:13-15` заявляет загрузку 156 страниц.
  - `packages/servers/yandex-tracker/doc-route-sweep.md:3` фиксирует успешный результат только по 152 страницам.
- **verification**: confirmed
- **verification_note**: Код не накапливает пропуски, не выставляет ненулевой exit code и не сверяет полноту. Расхождение 156/152 уже присутствует в артефактах диапазона.
- **fix_direction**: Ввести проверяемый инвариант полноты, отдельный allowlist действительно битых ссылок и перечень всех пропусков в отчёте; необъяснённый пропуск должен завершать сверку ошибкой.

### codex-03

- **reviewer**: codex
- **severity**: MEDIUM
- **kind**: point
- **domain**: reliability
- **title**: Ключи request body ищутся по всей статье, включая описание ответа
- **mechanism**: Для маршрута склеивается полный текст всех совпавших страниц. Ключ считается допустимым при любом упоминании — в ответе, ошибке, старом примере или примечании. Неподдерживаемый параметр `update_board.version` уже прошёл бы такую проверку, поскольку `version` описан как поле ответа, хотя API возвращает `400` при его отправке.
- **trigger**: воспроизводится в нормальной работе — request-key совпадает с именем поля ответа или термином в пояснительном тексте страницы.
- **in_scope**: да
- **anchor**: `packages/servers/yandex-tracker/scripts/sweep-doc-routes.ts:289-297`
- **evidence**:
  ```typescript
  const blob = pages
    .filter((page) => hitPages.includes(page.page))
    .map((page) => page.text)
    .join(' ');
  ```
- **verification**: confirmed
- **verification_note**: `page.text` содержит всю статью, а последующая регулярка проверяет только наличие слова. Практическое ложное отрицание подтверждает описанный в BRIEF контракт `update_board.version`.
- **fix_direction**: Извлекать структурно только секцию параметров request body; ответ, ошибки, deprecated-примеры и прочий текст анализировать отдельно.

### codex-04

- **reviewer**: codex
- **severity**: MEDIUM
- **kind**: contract
- **domain**: reliability
- **title**: `orderBy` и `orderAsc` объявлены live-verified без чтения результата
- **mechanism**: Контракт `LIVE_VERIFIED_KEYS` разрешает исключение только после живой записи и чтения сохранённого результата. Однако `orderBy` и `orderAsc` добавлены в исключение, хотя отчёт подтверждает только фильтр; `orderBy` проверялся без фильтра и был отклонён схемой до HTTP, а `orderAsc` не проверялся. Следующие сверки скрывают оба расхождения как окончательно закрытые.
- **trigger**: воспроизводится в нормальной работе — каждый следующий запуск `sweep:doc-routes` подавляет сигналы по этим ключам, даже если API отвергает или игнорирует их с валидным фильтром.
- **in_scope**: да
- **anchor**: контракт `LIVE_VERIFIED_KEYS`
- **evidence**:
  - Правило, `packages/servers/yandex-tracker/scripts/sweep-doc-routes.ts:93-98`:
    ```typescript
    * Ключи, которых на странице маршрута нет, но живая проба показала, что API их
    * принимает и сохраняет
    *
    * Запись сюда добавляется ТОЛЬКО после живой пробы с чтением результата;
    ```
  - Исключение, `packages/servers/yandex-tracker/scripts/sweep-doc-routes.ts:100-103`:
    ```typescript
    const LIVE_VERIFIED_KEYS = new Map<string, Set<string>>([
      ['fr_yandex_tracker_create_queue', new Set(['description'])],
      ['fr_yandex_tracker_update_board', new Set(['filter', 'orderBy', 'orderAsc', 'query'])],
    ```
  - `.agentic-planning/plan_tracker_route_sweep_fixes/2_LIVE_RUN_REPORT_2026-08-25c.md:34-36` подтверждает чтением только `filter`; `orderBy` без фильтра отклонён до запроса.
- **verification**: confirmed
- **verification_note**: Состав исключения прямо противоречит сформулированному рядом инварианту и приложенному журналу живой проверки.
- **fix_direction**: До отдельной пробы `filter + orderBy + orderAsc` убрать неподтверждённые ключи из исключения. Для каждого исключения хранить ссылку на конкретное доказательство и дату проверки.

### codex-05

- **reviewer**: codex
- **severity**: MEDIUM
- **kind**: judgement
- **domain**: architecture
- **title**: Project-oriented prompt и resource удалены вместо миграции на Entity API
- **mechanism**: После обновления клиенты теряют `project_summary` и `tracker://project/{id}`. Обоснование говорит об отсутствии гарантированных полей Entity Project, но инвентаризация того же диапазона перечисляет документированные `summary`, `description`, `lead`, `start`, `end`, `entityStatus`, `teamUsers` и read-only `issueQueues`. Этого достаточно для переноса основной read-функциональности, даже если старый числовой идентификатор нельзя сохранить.
- **trigger**: воспроизводится в нормальной работе — существующий клиент вызывает ранее опубликованный prompt или читает сохранённый project URI после обновления.
- **in_scope**: да
- **anchor**: решение удалить project-oriented MCP surface вместе с legacy HTTP-семейством
- **evidence**:
  - `packages/servers/yandex-tracker/src/prompts/tracker-prompt-provider.ts:5-9` объясняет удаление отсутствием гарантированных полей.
  - `.agentic-planning/plan_tracker_route_sweep_fixes/inventory/projects-vs-entities.md:25-49` перечисляет Entity-инструменты и документированные поля проекта.
  - `packages/servers/yandex-tracker/src/tracker_api/entities/entity-api.entity.ts:128-134` закрепляет `fields.summary` как подтверждённое обязательное поле.
- **verification**: unverifiable
- **verification_note**: Исчезновение публичных возможностей подтверждено кодом; допустимость breaking change и достаточность отличающейся Entity-семантики требуют продуктового решения.
- **fix_direction**: Отделить удаление legacy HTTP-инструментов от presentation layer: предоставить Entity-ориентированные prompt/resource с каноническим Entity ID либо явно оформить breaking change и миграционный путь.

## Coverage

- Полностью проверены все 11 809 строк `changes.diff`, 168 путей из `diff_files.txt`, оба `CLAUDE.md` и `BRIEF.md`.
- HTTP-контракты `update_component`, `update_board` и `create_queue` сверены от схемы через tool/facade до операции.
- GET текущей версии перед `PATCH update_component` признан корректным: прямой GET не загрязняет кеш, а конкурентное изменение приводит к optimistic-lock конфликту, не к lost update.
- Удалённый `update_project` отсутствует в финальном публичном surface, поэтому его промежуточная реализация с GET версии не создаёт остаточного runtime-дефекта.
- `live_scope` после снятия `/v3/projects` остаётся fail-closed: raw API строго GET-only, неизвестные мутации не совпадают ни с одним правилом и отклоняются.
- Переписанные тесты сохраняют общие механики fail-closed, ID/key, рекурсивной проверки ссылок на людей, ownership/journal и canonical path. Отдельного регрессионного теста именно для мутирующего `/v3/projects` больше нет.
- Проверены composition root, facade, barrel exports, счётчик 85 инструментов и отсутствие живых ссылок на удалённые tools/operations/providers.
- Изолированный runtime-прогон подтвердил молчаливое удаление `issueTypes` и `version` Zod-схемами.
- `tests/tools/api/components/update-component.tool.test.ts`: 18 тестов прошли. При этом отдельного tool-level кейса передачи явной `version` нет; ветка покрыта на уровне operation.
- Не проверялись живым API: пустой `filter`, комбинация `filter + orderBy + orderAsc`, полный набор полей Entity Project и отсутствующая `version` в ответе компонента. Мутирующие сетевые пробы не выполнялись.

## Отклонённые находки

codex-R01 | Снятие `/v3/projects` позволяет мутирующий raw-запрос | Raw-инструмент допускает только GET, остальные неизвестные мутации отклоняются fail-closed.

codex-R02 | GET текущей версии создаёт lost update | Версия передаётся в PATCH; конкурентная запись вызывает конфликт оптимистичной блокировки.

codex-R03 | Переписанные тесты потеряли ID/key и проверку людей | Эти механики сохранены на queue/globalField и общей рекурсивной проверке тела.

codex-R04 | `manifest.json` продолжает отключать Entity API | Это игнорируемый производный артефакт, генерируемый из исправленного `manifest.template.json`.

codex-R05 | Пустой `filter: {}` гарантированно обходит контракт API | Схема принимает пустую карту, но предоставленные данные не доказывают, что API её запрещещает.
