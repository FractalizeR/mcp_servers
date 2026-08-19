/**
 * Жизненный цикл дочернего процесса сервера.
 *
 * Гигиена ожиданий: готовность сервера определяется по ОТВЕТУ на запрос,
 * завершение — по событию `exit`. Маркера готовности в логах не существует
 * (при `LOG_LEVEL=error` успешно стартовавший сервер молчит и в stdout, и в
 * stderr), поэтому «ждать строку старта» — не вариант. Фиксированной паузы
 * перед первым запросом тоже нет: запись в stdin буферизуется ОС-пайпом
 * независимо от того, успел ли дочерний процесс стартовать. Таймер здесь
 * остаётся ТОЛЬКО предельным таймаутом с внятной ошибкой.
 */

import type { ChildProcess } from 'node:child_process';

/** Запас перед SIGKILL после SIGTERM: событие `exit` обычно приходит почти мгновенно. */
export const SHUTDOWN_GRACE_MS = 2000;

/**
 * Останов процесса по событию `exit` вместо фиксированной паузы: SIGTERM →
 * ждём `exit` → SIGKILL по истечении `fallbackMs`, если процесс не
 * отреагировал. Возвращает `true`, если потребовался принудительный SIGKILL.
 */
export async function stopGracefully(
  proc: ChildProcess,
  fallbackMs: number = SHUTDOWN_GRACE_MS
): Promise<boolean> {
  if (proc.exitCode !== null || proc.signalCode !== null) {
    return false;
  }
  return new Promise<boolean>((resolve) => {
    let settled = false;
    const finish = (forcedKill: boolean): void => {
      if (settled) return;
      settled = true;
      proc.off('exit', onExit);
      clearTimeout(timer);
      resolve(forcedKill);
    };
    const onExit = (): void => finish(false);

    proc.on('exit', onExit);
    proc.kill('SIGTERM');
    const timer = setTimeout(() => {
      proc.kill('SIGKILL');
      finish(true);
    }, fallbackMs);
  });
}

/**
 * Событийное ожидание подстроки в stderr: резолвится сразу, как только строка
 * попала в поток, и падает раньше срока (со всем накопленным stderr), если
 * процесс закрылся первым — вместо однократной проверки буфера после паузы.
 *
 * `getStderr` читает буфер, который вызывающая сторона уже накапливает через
 * `collectUtf8` — данные могли прийти ещё до вызова этой функции.
 */
export async function waitForStderrSubstring(
  child: ChildProcess,
  pattern: string,
  getStderr: () => string,
  timeoutMs: number
): Promise<void> {
  if (getStderr().includes(pattern)) {
    return;
  }

  return new Promise<void>((resolve, reject) => {
    let settled = false;

    const finish = (fn: () => void): void => {
      if (settled) return;
      settled = true;
      child.stderr?.off('data', onData);
      child.off('close', onClose);
      child.off('error', onError);
      clearTimeout(timer);
      fn();
    };

    const onData = (): void => {
      if (getStderr().includes(pattern)) {
        finish(resolve);
      }
    };

    const onClose = (code: number | null, signal: NodeJS.Signals | null): void => {
      finish(() =>
        reject(
          new Error(
            `Процесс закрылся (code=${code}, signal=${signal}) до появления "${pattern}" в stderr.\n` +
              `stderr so far: ${getStderr()}`
          )
        )
      );
    };

    const onError = (error: Error): void => {
      finish(() =>
        reject(new Error(`Ошибка процесса до появления "${pattern}" в stderr: ${error.message}`))
      );
    };

    child.stderr?.on('data', onData);
    child.on('close', onClose);
    child.on('error', onError);

    const timer = setTimeout(() => {
      finish(() =>
        reject(
          new Error(
            `Таймаут (${timeoutMs}ms) ожидания "${pattern}" в stderr.\n` +
              `stderr so far: ${getStderr()}`
          )
        )
      );
    }, timeoutMs);
  });
}
