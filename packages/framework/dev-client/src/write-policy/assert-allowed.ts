/**
 * Допуск батча к выполнению: запись (и `local-side-effect`) блокируется по
 * умолчанию, разблокируется только явным флагом `--dangerously-allow-write`
 * командной строки (переменная окружения не действует — см. README плана,
 * раздел «Тестовый план»). Проверка выполняется **до** первого `tools/call`
 * батча целиком: частичное исполнение до отказа недопустимо (иначе write-вызов
 * в начале файла успеет выполниться прежде, чем блокировка сработает на
 * write-вызове в конце).
 *
 * Неизвестный инструмент (не найден среди `listTools()`) — deny by default,
 * тот же механизм: без этого батч с опечаткой в имени инструмента либо тихо
 * пропускает вызов, либо падает на середине уже начатого исполнения.
 */

import { classify, type ToolSummary } from './classify.js';

/** Ошибка политики записи — отличима от прочих сбоев (`instanceof WritePolicyError`). */
export class WritePolicyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'WritePolicyError';
  }
}

/** Минимальное описание вызова батча, достаточное для проверки политики. */
export interface BatchCallLike {
  readonly tool: string;
}

/**
 * Проверить весь батч целиком: каждый инструмент существует, и если он не
 * класса `read` — `allowWrite === true`.
 *
 * @throws {WritePolicyError} На первом нарушении — неизвестный инструмент
 *   или запрещённый класс без флага.
 */
export function assertAllowed(
  tools: readonly ToolSummary[],
  calls: readonly BatchCallLike[],
  allowWrite: boolean
): void {
  const byName = new Map(tools.map((tool) => [tool.name, tool]));

  for (const call of calls) {
    const tool = byName.get(call.tool);
    if (!tool) {
      const known = [...byName.keys()].join(', ') || '(нет доступных инструментов)';
      throw new WritePolicyError(
        `Неизвестный инструмент "${call.tool}". Доступные инструменты: ${known}`
      );
    }

    const toolClass = classify(tool);
    if (toolClass !== 'read' && !allowWrite) {
      throw new WritePolicyError(
        `Инструмент "${call.tool}" класса "${toolClass}" требует флаг --dangerously-allow-write`
      );
    }
  }
}
