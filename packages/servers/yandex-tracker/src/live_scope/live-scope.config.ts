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

import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { LiveScopeGuard } from './live-scope.guard.js';
import { RunJournal } from './run-journal.js';

/** Очередь-песочница; задана — прогон считается живым и рубеж включается. */
const QUEUE_VAR = 'YANDEX_TRACKER_LIVE_SCOPE_QUEUE';

/**
 * Маркер `mcp-dev`: прогон запущен с `--dangerously-allow-write`.
 *
 * Пишущий прогон обязан объявить область действия. Без этого рубеж оставался бы
 * тем, что легко забыть включить, — то есть снова «аккуратностью ведущего
 * прогон», ровно тем, что он должен был заменить (найдено ревью 2026-08-20).
 */
const DEV_WRITE_DECLARED_VAR = 'MCP_DEV_WRITE_ALLOWED';

/**
 * Осознанный отказ от рубежа в пишущем прогоне. Значение выбрано так, чтобы его
 * нельзя было выставить машинально: правка своих реальных задач в боевом
 * Трекере — законный сценарий, но он должен быть заявлен, а не получен по умолчанию.
 */
const UNGUARDED_OPT_OUT_VAR = 'YANDEX_TRACKER_LIVE_SCOPE_OFF';
const UNGUARDED_OPT_OUT_VALUE = 'i-am-writing-to-production';

/** Файл журнала прогона; общий для всех процессов одного прогона. */
const JOURNAL_VAR = 'YANDEX_TRACKER_LIVE_SCOPE_JOURNAL';

/**
 * Префикс, обязательный в имени создаваемой сущности уровня организации (проект,
 * доска, спринт, глобальное поле, фильтр, задача Entity API). Не задана — мутации
 * этих сущностей отклоняются в правиле допуска, а не здесь: прогон уровня песочной
 * очереди организации может вовсе не касаться, и требовать от него префикс значило
 * бы ломать работающий сценарий.
 */
const RUN_PREFIX_VAR = 'YANDEX_TRACKER_LIVE_SCOPE_RUN_PREFIX';

/**
 * Ключ одноразовой очереди, которую прогону разрешено создать и удалить (`POST
 * /v3/queues`). Не задана — создание любой очереди отклоняется в правиле допуска:
 * значение нельзя получить машинально, только явным заданием переменной.
 */
const DISPOSABLE_QUEUE_VAR = 'YANDEX_TRACKER_LIVE_SCOPE_DISPOSABLE_QUEUE';

/**
 * Владелец прогона — единственный человек, на которого телу запроса разрешено
 * ссылаться (`lead` проекта и очереди, субъекты доступов очереди). Значение
 * сравнивается со ссылкой буквально: рубеж не разрешает логины в идентификаторы и
 * наоборот, поэтому задавать надо ровно ту форму, которую шлют инструменты. Не
 * задана — тело со ссылкой на человека отклоняется в правиле допуска, а не здесь:
 * прогон уровня песочной очереди людей организации не касается вовсе.
 */
const RUN_OWNER_VAR = 'YANDEX_TRACKER_LIVE_SCOPE_RUN_OWNER';

/**
 * Метка прогона. Ею подписан журнал, и файл с чужой меткой не принимается:
 * забытый журнал прошлого запуска иначе выдавал бы права на его сущности.
 */
const RUN_ID_VAR = 'YANDEX_TRACKER_LIVE_SCOPE_RUN_ID';

/**
 * Рубеж для пишущего прогона, не объявившего область действия: запрещает всё,
 * что меняет данные, и называет причину.
 *
 * Не падение на старте: stdio-транспорт не доносит stderr дочернего процесса, и
 * упавший сервер выглядит для `mcp-dev` как «Connection closed» — транспортный
 * сбой вместо названной причины. Проверено вживую при разработке; отказ на вызове
 * доезжает до пользователя текстом, а чтение при этом остаётся рабочим.
 */
function createUndeclaredWriteGuard(): LiveScopeGuard {
  return new LiveScopeGuard({
    sandboxQueue: '',
    journal: new RunJournal(devNullJournalPath(), 'undeclared'),
    refuseEverything:
      'прогон запущен с --dangerously-allow-write, но область действия не объявлена: ' +
      `не задана ${QUEUE_VAR}. Живые прогоны идут в боевой Трекер, и запись без ограничения ` +
      `области недопустима. Задайте ${QUEUE_VAR}, ${JOURNAL_VAR} и ${RUN_ID_VAR} — либо, если ` +
      `правка боевых данных именно и требуется, ${UNGUARDED_OPT_OUT_VAR}=${UNGUARDED_OPT_OUT_VALUE}`,
  });
}

/** Журнал такому рубежу не нужен: он всё равно ничего не разрешает. */
function devNullJournalPath(): string {
  return join(tmpdir(), `mcp-dev-undeclared-${process.pid}.jsonl`);
}

export function createLiveScopeGuardFromEnv(
  env: NodeJS.ProcessEnv = process.env
): LiveScopeGuard | undefined {
  const sandboxQueue = env[QUEUE_VAR]?.trim();
  if (sandboxQueue === undefined || sandboxQueue === '') {
    const writeDeclared = env[DEV_WRITE_DECLARED_VAR] === '1';
    const optedOut = env[UNGUARDED_OPT_OUT_VAR] === UNGUARDED_OPT_OUT_VALUE;
    return writeDeclared && !optedOut ? createUndeclaredWriteGuard() : undefined;
  }

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

  const runId = env[RUN_ID_VAR]?.trim();
  if (runId === undefined || runId === '') {
    throw new Error(
      `${QUEUE_VAR} задана (${sandboxQueue}), но ${RUN_ID_VAR} — нет. ` +
        'Без метки прогона журнал прошлого запуска считался бы своим.'
    );
  }

  return new LiveScopeGuard({
    sandboxQueue,
    journal: new RunJournal(journalPath, runId),
    runPrefix: nonEmpty(env[RUN_PREFIX_VAR]),
    disposableQueue: nonEmpty(env[DISPOSABLE_QUEUE_VAR]),
    runOwner: nonEmpty(env[RUN_OWNER_VAR]),
  });
}

/** Пустая и незаданная переменная равнозначны — обе кладутся в `undefined`. */
function nonEmpty(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed === undefined || trimmed === '' ? undefined : trimmed;
}
