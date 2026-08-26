# Задание ревьюеру

Материал — незакоммиченные изменения в /Users/fractalizer/PhpstormProjects/github.com/FractalizeR/mcp_servers,
ветка main. Снимок диффа: `.agentic-planning/plan_tracker_sweep7_fixes/review/changes.diff`
(56 файлов). Читай и рабочее дерево тоже — дифф без контекста вокруг обманчив.

`depth`: thorough. Материал НЕ делить на слайсы — межфайловые дефекты видны только
тому, кто видит обе стороны шва.

## Что было сделано и зачем

Живой прогон по БОЕВОМУ API Яндекс.Трекера вскрыл, что несколько инструментов MCP-сервера
не работали никогда. Починка разбита на четыре пакета, исполненных последовательно
разными агентами. Контекст обязателен к прочтению:

- `.agentic-planning/plan_tracker_sweep7_fixes/0_LIVE_RUN_REPORT_2026-08-26.md` — факты живых проб
- `.agentic-planning/plan_tracker_sweep7_fixes/1_PLAN.md` — план и решения
- `.agentic-planning/plan_tracker_sweep7_fixes/2_REVIEW_RESOLUTION.md` — разбор ревью плана
- `.agentic-planning/plan_tracker_sweep7_fixes/inventory/queue-permissions-response-2026-08-26.json` — наблюдённая форма ответа
- `packages/servers/yandex-tracker/CLAUDE.md`, корневой `CLAUDE.md`, `packages/servers/yandex-tracker/tests/TESTING_STRATEGY.md`

Пакет A: сняты параметры, которые роняли запрос при любом значении —
`update_board.country`, `create_sprint`/`update_sprint`.`startDateTime`/`endDateTime`.
Пакет B: версия спринта переведена из тела в query (`?version=`) у `update_sprint` и
`manage_sprint_lifecycle` (`_start`/`_archive`; `delete` версии не требует), с дочитыванием
текущей версии; плюс `manage_sprint_lifecycle` научен применять `fields`.
Пакет C: контракт `manage_queue_access` переписан целиком — вход стал
`permission × subjectKind × action × subjects`, тело — `{ [permission]: { [subjectKind]: { [action]: subjects } } }`,
форма ответа — объект, ключёванный разрешением. Правился и рубеж живых прогонов
(`src/live_scope/`), включая `people-in-body.ts`.
Пакет D: белый список проверенных ключей сверки, регенерация артефактов, документация.

Полная `npm run validate:quiet` в корне зелёная. Живые пробы после починки описаны в отчёте.

## На что смотреть в первую очередь

1. **Швы между пакетами.** Общие файлы, которые правили разные агенты:
   `src/live_scope/organization-rules.ts` (A, B, C1), `src/tracker_api/dto/sprint/update-sprint.dto.ts` (A, B),
   `src/tracker_api/facade/yandex-tracker.facade.ts` (B, C2),
   `src/tools/api/queues/manage-queue-access.schema.ts` (C1 — вход, C2 — выход),
   `tests/integration/helpers/mock-server.ts`, `tests/live_scope/known-mutating-requests.ts`.
   Вопрос: какую форму входа не покрыл ни один пакет?
2. **Рубеж живых прогонов — единственная защита боевых данных.** Отдельной организации
   нет, песочница — очередь `TEST` в боевой организации. Ослабление рубежа = риск порчи
   чужих данных. Смотри `people-in-body.ts`: `personRefs` научили распаковывать обёртку
   `{add|remove}` — не открылась ли этим дыра, при которой ссылка на чужого человека
   перестала распознаваться. Проверь `organization-rules.ts`: новый белый список ключей
   тела доступов очереди — не стал ли он пропускать то, что раньше отклонял.
3. **Дублирование:** `readCurrentVersion` теперь существует в трёх операциях
   (`component`, `update-sprint`, `manage-sprint-lifecycle`) почти дословно.
4. **Совпадение кода с наблюдёнными фактами.** Типы и комментарии обязаны отражать то,
   что реально наблюдалось живьём, а не документацию. `deny` в ответе доступов живьём НЕ
   наблюдался; `PATCH .../permissions` отвечает только `{self, version}`. Найди места,
   где код или комментарий утверждает больше, чем было проверено.
5. **Тесты.** Проверяют ли они эффект, а не только код ответа? Классы дефектов —
   `tests/TESTING_STRATEGY.md` §3. Особое внимание: не осталось ли теста, который
   зафиксировал СТАРОЕ (неверное) поведение и потому зелёный.
6. Обычные предметы: корректность, типобезопасность (`any`/`unknown` запрещены),
   границы модулей, SRP, комментарии по правилам проекта (комментарий несёт только то,
   чего нет в коде).

## Формат

Пиши находки по `finding-schema.md`
(`/Users/fractalizer/PhpstormProjects/git.dvizh.io/ai-tools/dvizh-marketplace/vr/review/reference/finding-schema.md`)
в `.agentic-planning/plan_tracker_sweep7_fixes/review/<твоё-имя>.md`.
Поле `reviewer` — имя фактического исполнителя.
Каждая находка: severity, якорь `файл:строки`, evidence, статус проверки факта.
В конце — заявленное coverage: что успел просмотреть, что нет.
Ничего в рабочем дереве не меняй, только читай и пиши свой файл находок.
