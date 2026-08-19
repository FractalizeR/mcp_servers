/**
 * Процессный уровень контура секретов.
 *
 * Без этого хука `uncaughtException`/`unhandledRejection` печатает стек ошибки
 * через встроенный обработчик Node.js напрямую в stderr, мимо любого
 * форматтера пакета — и потенциальный секрет в сообщении об ошибке (например,
 * в тексте исключения от `fs`/`child_process`, содержащем часть командной
 * строки) утекает немаскированным. Хук перехватывает оба события, маскирует
 * текст и уже потом пишет и завершает процесс.
 */

import type { Masker } from './masker.js';

/** Опции {@link installSecretGuard}. Инъекция write/exit — для тестируемости без реального `process.exit`. */
export interface SecretGuardOptions {
  /** Маскер, которым обрабатывается текст ошибки перед печатью. */
  masker: Masker;
  /** Запись в stderr. По умолчанию — `process.stderr.write`. */
  writeStderr?: (text: string) => void;
  /** Завершение процесса. По умолчанию — `process.exit`. Код всегда 1: необработанное исключение — не штатный отказ с кодом 2 (сессия не открылась) или 1 (есть провалы в батче), а внутренняя авария. */
  exit?: (code: number) => void;
}

/** Снять установленные хуком слушатели событий (для тестов и корректного shutdown). */
export type UninstallSecretGuard = () => void;

/**
 * Последний известный маскер процесса.
 *
 * Нужен последнему рубежу печати ошибок — `bin/mcp-dev.ts` и внешнему
 * `try/catch` в `runCli`: туда исключение может прилететь из места, у которого
 * ссылки на маскер нет (сессия ещё не открыта или уже закрыта), а печатать
 * стек немаскированным нельзя. Пока guard ни разу не установлен —
 * тождественная функция: до резолва секретов маскировать нечего.
 *
 * **Снятие guard его не сбрасывает.** `installSecretGuard` склеивал две разные
 * вещи: слушатели `process` (их снимать обязательно — иначе они копятся между
 * сессиями) и «чем маскировать аварийную печать» (сбрасывать не нужно).
 * Из-за склейки отказ из тела команды печатался немаскированным: `executeCalls`
 * зовёт `cleanup()` в `finally`, `cleanup` — `uninstallGuard()`, и только потом
 * исключение долетает до `catch` в `runCli`, где маскера уже не было.
 * Значение живёт до следующего `installSecretGuard`, который его заменит.
 */
let activeMasker: Masker | undefined;

/**
 * Маскер, установленный последним вызовом {@link installSecretGuard}
 * (или тождественная функция, если guard ни разу не устанавливался).
 * Снятие guard на результат не влияет — аварийная печать после `cleanup()`
 * обязана маскироваться.
 */
export function getActiveMasker(): Masker {
  return activeMasker ?? ((text: string): string => text);
}

function describeError(value: unknown): string {
  if (value instanceof Error) return value.stack ?? value.message;
  return String(value);
}

/**
 * Установить обработчики `uncaughtException`/`unhandledRejection`, которые
 * маскируют текст ошибки перед выводом и завершают процесс с кодом 1.
 *
 * @returns Функция снятия хука — вызывать перед штатным завершением, чтобы
 *   не оставлять слушателей на `process` (важно для повторного вызова в
 *   тестах и для CLI-адаптера, который может открывать несколько сессий).
 */
export function installSecretGuard(options: SecretGuardOptions): UninstallSecretGuard {
  const writeStderr =
    options.writeStderr ??
    ((text: string): void => {
      process.stderr.write(text);
    });
  const exit =
    options.exit ??
    ((code: number): void => {
      process.exit(code);
    });

  const handle = (value: unknown): void => {
    const masked = options.masker(describeError(value));
    writeStderr(`${masked}\n`);
    exit(1);
  };

  activeMasker = options.masker;

  const onUncaughtException = (error: unknown): void => handle(error);
  const onUnhandledRejection = (reason: unknown): void => handle(reason);

  process.on('uncaughtException', onUncaughtException);
  process.on('unhandledRejection', onUnhandledRejection);

  return (): void => {
    process.off('uncaughtException', onUncaughtException);
    process.off('unhandledRejection', onUnhandledRejection);
    // `activeMasker` намеренно не сбрасывается — см. комментарий к нему.
  };
}
