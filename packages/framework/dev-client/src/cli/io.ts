/**
 * Точка внедрения вывода CLI. Инъецируется во все команды вместо прямого
 * обращения к `process.stdout`/`process.stderr` — юнит-тесты перехватывают
 * вывод без монки-патчинга глобального `process`.
 */
export interface CliIo {
  /** stdout — только JSONL результатов вызовов (`call`/`batch`) либо машинный/текстовый список (`list`). */
  readonly stdout: (text: string) => void;
  /** stderr — человекочитаемые сообщения: ошибки, сводки, отказы. */
  readonly stderr: (text: string) => void;
}

/** Безопасно описать произвольное отловленное значение как текст (для печати в stderr). */
export function describeError(value: unknown): string {
  if (value instanceof Error) return value.stack ?? value.message;
  return String(value);
}

/** Дописать перевод строки, если строка ещё не оканчивается им. */
export function writeLine(write: (text: string) => void, text: string): void {
  write(text.endsWith('\n') ? text : `${text}\n`);
}
