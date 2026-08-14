/**
 * Сборка тела одного Key Result'а для PATCH-запросов Entity API.
 *
 * Вынесено отдельно, т.к. используется и в `add`, и в `set` операциях —
 * SRP: единая точка сборки формы, которую ожидает API (см. референсный
 * клиент, `Goal._build_key_result_item`).
 */

import type { KeyResultItemInputDto } from '#tracker_api/dto/entity-api/index.js';

export function buildKeyResultItemBody(item: KeyResultItemInputDto): Record<string, unknown> {
  const body: Record<string, unknown> = {
    type: item.type,
    text: item.text,
  };

  if (item.assignee !== undefined) {
    body['assignee'] = item.assignee;
  }
  if (item.deadline !== undefined) {
    body['deadline'] = { date: item.deadline, deadlineType: 'date' };
  }
  if (item.progress !== undefined) {
    body['progress'] = item.progress;
  }
  if (item.achieved !== undefined) {
    body['achieved'] = item.achieved;
  }

  return body;
}
