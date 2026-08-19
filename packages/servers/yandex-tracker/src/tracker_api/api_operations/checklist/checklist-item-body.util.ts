/**
 * Сборка тела запроса для add/update операций над элементом чеклиста.
 *
 * Вынесено отдельно, т.к. используется и в `AddChecklistItemOperation`, и в
 * `UpdateChecklistItemOperation` — SRP: единая точка сборки формы, которую
 * ожидает API. Симметрично `key-result-body.util.ts` (Entity API, Goal).
 *
 * ПОЧЕМУ ОБЁРТКА deadline:
 * API v2/v3 `POST /issues/{id}/checklistItems` ожидает `deadline` объектом
 * `{date, deadlineType}`, а не голой строкой — подтверждено официальной
 * документацией (`yandex.ru/support/tracker/en/concepts/issues/add-checklist-item`,
 * JSON-пример с `"deadline": {"date": "...", "deadlineType": "date"}`).
 * Живой прогон подтверждает регрессию: при отправке `deadline` строкой запрос
 * падает целиком (`Tool execution failed`) — как при `YYYY-MM-DD`, так и при
 * полном ISO 8601. Референсный клиент (`yandex_tracker_client/collections.py`,
 * `checklistItems.create`/`add_checklist_item`) деадлайн НЕ оборачивает —
 * пробрасывает вызывающему коду ответственность собрать нужную форму, что и
 * делает эта функция на границе API-операции.
 *
 * Схема (Zod) агента остаётся строкой ISO 8601 — так удобнее вызывающей
 * стороне; строка оборачивается в объект здесь, без реформатирования самой
 * даты (симметрично `buildKeyResultItemBody`, где `date` тоже не
 * форматируется повторно).
 */

export interface ChecklistItemFields {
  text?: string | undefined;
  checked?: boolean | undefined;
  assignee?: string | undefined;
  deadline?: string | undefined;
}

export function buildChecklistItemBody(input: ChecklistItemFields): Record<string, unknown> {
  const body: Record<string, unknown> = {};

  if (input.text !== undefined) {
    body['text'] = input.text;
  }
  if (input.checked !== undefined) {
    body['checked'] = input.checked;
  }
  if (input.assignee !== undefined) {
    body['assignee'] = input.assignee;
  }
  if (input.deadline !== undefined) {
    body['deadline'] = { date: input.deadline, deadlineType: 'date' };
  }

  return body;
}
