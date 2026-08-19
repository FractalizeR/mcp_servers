/**
 * Прогон именованных сценариев с накоплением отказов и итоговым отчётом.
 *
 * Отказ одного сценария не прерывает прогон: остальные всё равно исполняются,
 * иначе первый же сбой скрывал бы состояние всех последующих проверок.
 */

/** Счётчик сценариев и отказов одного прогона. */
export class ScenarioRunner {
  private failures = 0;
  private total = 0;

  constructor(private readonly serverLabel: string) {}

  async run(name: string, fn: () => Promise<void>): Promise<void> {
    this.total += 1;
    try {
      await fn();
      console.log(`   ✓ ${name}`);
    } catch (error) {
      this.failures += 1;
      console.error(`   ✗ ${name}`);
      console.error(
        `     ${error instanceof Error ? (error.stack ?? error.message) : String(error)}`
      );
    }
  }

  /** Печатает итог и завершает процесс кодом 0/1. */
  finish(): never {
    console.log(
      `\n${this.failures === 0 ? '✅' : '❌'} Raw-wire тесты (${this.serverLabel}): ${
        this.failures === 0
          ? `все ${this.total} сценариев пройдены`
          : `${this.failures} из ${this.total} сценариев провалено`
      }`
    );
    process.exit(this.failures === 0 ? 0 : 1);
  }
}

export function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

/**
 * Убирает волатильные ISO-8601 таймстампы из content перед сравнением между
 * эпохами: некоторые tool включают текущее время выполнения в payload
 * (например, ping — метку последней попытки подключения), это ожидаемая
 * волатильность самого tool, не протокольное расхождение.
 */
export function normalizeVolatileContent(content: unknown): string {
  return JSON.stringify(content).replace(
    /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z/g,
    '<TIMESTAMP>'
  );
}
