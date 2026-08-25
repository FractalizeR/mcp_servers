/**
 * Прогон, от лица которого рубеж принимает решения в тестах: журнал со всеми
 * сущностями этого прогона плюс объявленные префикс, одноразовая очередь и владелец.
 *
 * Общая фикстура, а не копия в каждом файле: расхождение состава журнала между
 * файлами означало бы, что «своя сущность» в одном тесте и в другом — разные вещи.
 */

import { RunJournal } from '#live_scope';
import type { ScopeContext } from '#live_scope';
import {
  SANDBOX_ISSUE,
  SANDBOX_QUEUE,
  SANDBOX_COMPONENT,
  SANDBOX_LOCAL_FIELD,
  RUN_PREFIX,
  RUN_OWNER,
  DISPOSABLE_QUEUE,
  SANDBOX_PROJECT_ID,
  SANDBOX_PROJECT_KEY,
  SANDBOX_BOARD,
  SANDBOX_SPRINT,
  SANDBOX_GLOBAL_FIELD,
  SANDBOX_FILTER,
  SANDBOX_ENTITY_TYPE,
  SANDBOX_ENTITY_ID,
} from './known-mutating-requests.js';

export const RUN_ID = 'run-under-test';

export function createRunContext(journalPath: string): ScopeContext {
  const journal = new RunJournal(journalPath, RUN_ID);
  journal.register('issue', SANDBOX_ISSUE);
  journal.register('component', SANDBOX_COMPONENT);
  journal.register('queueLocalField', SANDBOX_LOCAL_FIELD);
  // Сущности организации этого прогона — обе формы адресации там, где API их даёт:
  // боевой ответ несёт и id, и key одновременно.
  journal.register('project', SANDBOX_PROJECT_ID);
  journal.register('project', SANDBOX_PROJECT_KEY);
  journal.register('board', SANDBOX_BOARD);
  journal.register('sprint', SANDBOX_SPRINT);
  journal.register('globalField', SANDBOX_GLOBAL_FIELD);
  journal.register('filter', SANDBOX_FILTER);
  journal.register('entity', `${SANDBOX_ENTITY_TYPE}/${SANDBOX_ENTITY_ID}`);
  // Одноразовая очередь прогона создана: без записи ссылки на неё незаконны.
  journal.register('queue', DISPOSABLE_QUEUE);
  return {
    sandboxQueue: SANDBOX_QUEUE,
    journal,
    runPrefix: RUN_PREFIX,
    disposableQueue: DISPOSABLE_QUEUE,
    runOwner: RUN_OWNER,
  };
}
