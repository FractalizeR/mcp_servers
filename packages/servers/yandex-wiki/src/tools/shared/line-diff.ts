/**
 * Построчный diff (пакет 3.1.E) — сравнение текущего содержимого страницы
 * Wiki с предлагаемым новым содержимым, без побочных эффектов.
 *
 * Реализация — классический LCS-diff (аналог `diff -u` на уровне строк):
 * таблица длин наибольшей общей подпоследовательности + обратный проход,
 * восстанавливающий последовательность операций equal/remove/add. Внешняя
 * библиотека не подключалась: пакет изолирован в собственном рабочем дереве,
 * добавление npm-зависимости означало бы правку корневого package-lock.json
 * вне границ пакета (владеет им оркестратор), а сама задача — сравнение
 * текстов вики-страниц разумного размера — не требует более сложного
 * алгоритма (Myers diff и т.п.).
 */

export type LineDiffOp = 'equal' | 'remove' | 'add';

export interface LineDiffEntry {
  /** Тип операции над строкой */
  op: LineDiffOp;
  /** Текст строки */
  text: string;
  /** Номер строки в старом тексте (для op === 'equal' | 'remove') */
  oldLineNumber?: number;
  /** Номер строки в новом тексте (для op === 'equal' | 'add') */
  newLineNumber?: number;
}

export interface LineDiffSummary {
  linesAdded: number;
  linesRemoved: number;
  linesUnchanged: number;
}

/** lcsLength[i][j] = длина LCS(oldLines[i..n), newLines[j..m)) */
function buildLcsLengthTable(oldLines: string[], newLines: string[]): number[][] {
  const n = oldLines.length;
  const m = newLines.length;
  const table: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));

  for (let i = n - 1; i >= 0; i--) {
    const row = table[i];
    const nextRow = table[i + 1];
    if (!row || !nextRow) continue;

    for (let j = m - 1; j >= 0; j--) {
      const matches = oldLines[i] === newLines[j];
      const diagonal = nextRow[j + 1] ?? 0;
      const down = nextRow[j] ?? 0;
      const right = row[j + 1] ?? 0;
      row[j] = matches ? diagonal + 1 : Math.max(down, right);
    }
  }

  return table;
}

/**
 * Посчитать построчный diff между старым и новым текстом.
 *
 * Пустая строка на входе трактуется как текст из одной пустой строки
 * (`''.split('\n')` даёт `['']`) — соответствует поведению большинства
 * построчных diff-инструментов.
 */
export function computeLineDiff(oldText: string, newText: string): LineDiffEntry[] {
  const oldLines = oldText.split('\n');
  const newLines = newText.split('\n');
  const n = oldLines.length;
  const m = newLines.length;
  const lcsLength = buildLcsLengthTable(oldLines, newLines);

  const result: LineDiffEntry[] = [];
  let i = 0;
  let j = 0;
  let oldLineNumber = 1;
  let newLineNumber = 1;

  while (i < n && j < m) {
    const oldLine = oldLines[i];
    const newLine = newLines[j];

    if (oldLine === newLine && oldLine !== undefined) {
      result.push({ op: 'equal', text: oldLine, oldLineNumber, newLineNumber });
      i++;
      j++;
      oldLineNumber++;
      newLineNumber++;
      continue;
    }

    const scoreKeepingOld = lcsLength[i + 1]?.[j] ?? 0;
    const scoreKeepingNew = lcsLength[i]?.[j + 1] ?? 0;

    if (scoreKeepingOld >= scoreKeepingNew && oldLine !== undefined) {
      result.push({ op: 'remove', text: oldLine, oldLineNumber });
      i++;
      oldLineNumber++;
    } else if (newLine !== undefined) {
      result.push({ op: 'add', text: newLine, newLineNumber });
      j++;
      newLineNumber++;
    }
  }

  while (i < n) {
    const oldLine = oldLines[i];
    if (oldLine !== undefined) {
      result.push({ op: 'remove', text: oldLine, oldLineNumber });
    }
    i++;
    oldLineNumber++;
  }

  while (j < m) {
    const newLine = newLines[j];
    if (newLine !== undefined) {
      result.push({ op: 'add', text: newLine, newLineNumber });
    }
    j++;
    newLineNumber++;
  }

  return result;
}

/** Свести построчный diff к сводке (сколько строк добавлено/удалено/не изменилось) */
export function summarizeLineDiff(entries: readonly LineDiffEntry[]): LineDiffSummary {
  let linesAdded = 0;
  let linesRemoved = 0;
  let linesUnchanged = 0;

  for (const entry of entries) {
    if (entry.op === 'add') linesAdded++;
    else if (entry.op === 'remove') linesRemoved++;
    else linesUnchanged++;
  }

  return { linesAdded, linesRemoved, linesUnchanged };
}
