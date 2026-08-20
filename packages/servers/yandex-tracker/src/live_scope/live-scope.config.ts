/**
 * Включение рубежа области действия.
 *
 * Модуль читает свои переменные сам, а не через `ServerConfig`: рубеж — предмет со
 * своим жизненным циклом, он появляется и исчезает вместе с живым прогоном и не
 * входит в конфигурацию сервера.
 *
 * Умолчание — выключено. Без явно заданной очереди песочницы guard не создаётся
 * вовсе, и обычная работа сервера идёт как прежде.
 */

import { LiveScopeGuard } from './live-scope.guard.js';
import { RunJournal } from './run-journal.js';

/** Очередь-песочница; задана — прогон считается живым и рубеж включается. */
const QUEUE_VAR = 'YANDEX_TRACKER_LIVE_SCOPE_QUEUE';

/** Файл журнала прогона; общий для всех процессов одного прогона. */
const JOURNAL_VAR = 'YANDEX_TRACKER_LIVE_SCOPE_JOURNAL';

export function createLiveScopeGuardFromEnv(
  env: NodeJS.ProcessEnv = process.env
): LiveScopeGuard | undefined {
  const sandboxQueue = env[QUEUE_VAR]?.trim();
  if (sandboxQueue === undefined || sandboxQueue === '') return undefined;

  const journalPath = env[JOURNAL_VAR]?.trim();
  if (journalPath === undefined || journalPath === '') {
    // Без журнала правка сущностей с непрозрачным идентификатором не имеет
    // основания, а уборка не имеет перечня. Молча включить половину рубежа хуже,
    // чем не включить его вовсе: прогон считал бы себя защищённым.
    throw new Error(
      `${QUEUE_VAR} задана (${sandboxQueue}), но ${JOURNAL_VAR} — нет. ` +
        'Журнал прогона обязателен: по нему решается, что можно править и что убирать.'
    );
  }

  return new LiveScopeGuard({ sandboxQueue, journal: new RunJournal(journalPath) });
}
