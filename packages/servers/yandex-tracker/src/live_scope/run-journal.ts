/**
 * Журнал живого прогона: что именно создано этим прогоном.
 *
 * Половина мутирующих запросов Трекера адресует сущность непрозрачным
 * идентификатором (`DELETE /v2/components/{id}`), по которому принадлежность
 * к песочнице не восстанавливается ничем. Для них журнал — не дополнительная
 * мера, а единственный источник права на правку и удаление.
 */

import { appendFileSync, readFileSync, existsSync } from 'node:fs';

/** Род сущности; идентификаторы разных родов не взаимозаменяемы. */
export type EntityKind = 'issue' | 'component' | 'queueLocalField';

interface JournalEntry {
  kind: EntityKind;
  id: string;
}

export class RunJournal {
  private readonly entries = new Set<string>();

  /**
   * @param persistPath — файл журнала. Прогон идёт несколькими процессами
   *   (`tools:call` запускает сервер заново на каждый вызов), поэтому журнал
   *   живёт на диске: в памяти он был бы пуст к моменту уборки.
   */
  constructor(private readonly persistPath: string) {
    if (existsSync(persistPath)) {
      for (const line of readFileSync(persistPath, 'utf8').split('\n')) {
        if (line.trim() === '') continue;
        const entry = JSON.parse(line) as JournalEntry;
        this.entries.add(RunJournal.key(entry.kind, entry.id));
      }
    }
  }

  register(kind: EntityKind, id: string): void {
    const key = RunJournal.key(kind, id);
    if (this.entries.has(key)) return;
    this.entries.add(key);
    appendFileSync(this.persistPath, `${JSON.stringify({ kind, id })}\n`, 'utf8');
  }

  has(kind: EntityKind, id: string): boolean {
    return this.entries.has(RunJournal.key(kind, id));
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
