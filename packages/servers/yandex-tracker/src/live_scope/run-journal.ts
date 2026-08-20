/**
 * Журнал живого прогона: что именно создано этим прогоном.
 *
 * Половина мутирующих запросов Трекера адресует сущность непрозрачным
 * идентификатором (`DELETE /v2/components/{id}`), по которому принадлежность
 * к песочнице не восстанавливается ничем. Для них журнал — не дополнительная
 * мера, а единственный источник права на правку и удаление.
 *
 * Отсюда три свойства, каждое найдено ревью как отсутствовавшее:
 * - журнал принадлежит конкретному прогону и чужой не принимает: файл, забытый
 *   от прошлого запуска, иначе выдавал бы права на его сущности;
 * - повреждение журнала переводит рубеж в отказ, а не в доверие: неизвестное
 *   состояние учёта — это отсутствие оснований разрешать;
 * - сбой записи не бросает исключение наружу, но лишает журнал доверия: мутация
 *   к тому моменту уже произошла, и превращать её в ошибку вызывающему поздно.
 */

import { appendFileSync, readFileSync, existsSync } from 'node:fs';

/** Род сущности; идентификаторы разных родов не взаимозаменяемы. */
export type EntityKind = 'issue' | 'component' | 'queueLocalField';

interface JournalEntry {
  kind: EntityKind;
  id: string;
}

interface JournalHeader {
  runId: string;
}

export class RunJournal {
  private readonly entries = new Set<string>();

  /** Заполнена, если журнал потерял достоверность; тогда рубеж запрещает всё. */
  private brokenReason: string | undefined;

  /**
   * @param persistPath — файл журнала. Прогон идёт несколькими процессами
   *   (`tools:call` запускает сервер заново на каждый вызов), поэтому журнал
   *   живёт на диске: в памяти он был бы пуст к моменту уборки.
   * @param runId — метка прогона, которой journal подписан. Файл, подписанный
   *   другой меткой, не читается: это журнал чужого прогона.
   */
  constructor(
    private readonly persistPath: string,
    private readonly runId: string
  ) {
    if (existsSync(persistPath)) {
      this.load();
    } else {
      appendFileSync(persistPath, `${JSON.stringify({ runId } satisfies JournalHeader)}\n`, 'utf8');
    }
  }

  private load(): void {
    const lines = readFileSync(this.persistPath, 'utf8')
      .split('\n')
      .filter((line) => line.trim() !== '');

    const [headerLine, ...entryLines] = lines;
    if (headerLine === undefined) {
      throw new Error(
        `Журнал прогона ${this.persistPath} пуст: нет отметки прогона. ` +
          'Удалите файл или укажите другой путь.'
      );
    }

    let header: JournalHeader;
    try {
      header = JSON.parse(headerLine) as JournalHeader;
    } catch {
      throw new Error(
        `Журнал прогона ${this.persistPath} повреждён: первая строка не читается. ` +
          'Пока учёт созданного неизвестен, разрешать мутации нельзя.'
      );
    }

    if (header.runId !== this.runId) {
      throw new Error(
        `Журнал ${this.persistPath} принадлежит прогону ${header.runId}, а текущий — ${this.runId}. ` +
          'Чужой журнал выдал бы права на сущности прошлого запуска.'
      );
    }

    for (const line of entryLines) {
      let entry: JournalEntry;
      try {
        entry = JSON.parse(line) as JournalEntry;
      } catch {
        throw new Error(
          `Журнал прогона ${this.persistPath} повреждён на строке «${line.slice(0, 80)}». ` +
            'Часть созданного могла потеряться — уборка стала бы неполной.'
        );
      }
      this.entries.add(RunJournal.key(entry.kind, entry.id));
    }
  }

  /**
   * Записывает созданное. Не бросает: вызывается из наблюдения ответа, когда
   * мутация уже произошла. Вместо исключения журнал теряет доверие, и рубеж
   * перестаёт что-либо разрешать — потерянная запись означает, что уборка
   * неполна, а права на непрозрачные идентификаторы больше не обоснованы.
   */
  register(kind: EntityKind, id: string): void {
    const key = RunJournal.key(kind, id);
    if (this.entries.has(key)) return;
    try {
      appendFileSync(this.persistPath, `${JSON.stringify({ kind, id })}\n`, 'utf8');
      this.entries.add(key);
    } catch (error) {
      this.brokenReason =
        `не удалось записать в журнал ${kind} ${id}: ${(error as Error).message}. ` +
        `Сущность создана в Трекере, но учёта на неё нет — убрать её придётся вручную`;
    }
  }

  has(kind: EntityKind, id: string): boolean {
    if (this.brokenReason !== undefined) return false;
    return this.entries.has(RunJournal.key(kind, id));
  }

  /** Причина недоверия к журналу, если она есть, — попадает в текст отказа. */
  breakage(): string | undefined {
    return this.brokenReason;
  }

  /** Содержимое журнала — основание уборки: удаляется только перечисленное здесь. */
  list(): readonly JournalEntry[] {
    return [...this.entries].map((key) => {
      const separator = key.indexOf(':');
      return { kind: key.slice(0, separator) as EntityKind, id: key.slice(separator + 1) };
    });
  }

  private static key(kind: EntityKind, id: string): string {
    return `${kind}:${id}`;
  }
}
