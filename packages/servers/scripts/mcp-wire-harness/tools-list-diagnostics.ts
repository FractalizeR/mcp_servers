/**
 * Отчёт о расхождении двух ответов `tools/list`.
 *
 * Единственный источник данных о падениях релиза — лог GitHub Actions,
 * поэтому отчёт должен быть самодостаточным: по нему решают, что именно
 * разошлось, без повторного прогона (который локально не воспроизводится).
 */

import { MISMATCH_CONTEXT_CHARS } from './utf8-stream.js';

function toolNamesForDiagnostics(tools: unknown): string[] {
  if (!Array.isArray(tools)) {
    return [];
  }
  return tools.map((tool, index) => {
    const name = (tool as { name?: unknown } | null)?.name;
    return typeof name === 'string' ? name : `<no-name@${index}>`;
  });
}

function duplicatedNames(names: string[]): string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const name of names) {
    if (seen.has(name)) {
      duplicates.add(name);
    }
    seen.add(name);
  }
  return [...duplicates];
}

function describeFirstDifference(firstJson: string, secondJson: string): string[] {
  let diffAt = 0;
  while (
    diffAt < firstJson.length &&
    diffAt < secondJson.length &&
    firstJson[diffAt] === secondJson[diffAt]
  ) {
    diffAt += 1;
  }
  const from = Math.max(0, diffAt - MISMATCH_CONTEXT_CHARS);
  const to = diffAt + MISMATCH_CONTEXT_CHARS;
  return [
    `first difference at index ${diffAt}; window [${from}, ${to}):`,
    `  first : ${JSON.stringify(firstJson.slice(from, to))}`,
    `  second: ${JSON.stringify(secondJson.slice(from, to))}`,
  ];
}

function describeNameOrder(firstNames: string[], secondNames: string[]): string {
  const reordered = firstNames
    .map((name, index) =>
      secondNames[index] === name
        ? undefined
        : `#${index}: ${name} -> ${secondNames[index] ?? '<missing>'}`
    )
    .filter((entry): entry is string => entry !== undefined);
  return reordered.length === 0
    ? 'name order: identical (names and order match, so the difference is inside tool definitions - see the window above)'
    : `name order differs at ${reordered.length} position(s), first 20: ${reordered.slice(0, 20).join('; ')}`;
}

/** `undefined`, когда списки побайтово совпадают. */
export function describeToolsListMismatch(first: unknown, second: unknown): string | undefined {
  const firstJson = JSON.stringify(first ?? []);
  const secondJson = JSON.stringify(second ?? []);
  if (firstJson === secondJson) {
    return undefined;
  }

  const lines: string[] = ['===== tools/list mismatch diagnostics ====='];
  lines.push(`json length: first=${firstJson.length}, second=${secondJson.length} (UTF-16 units)`);
  lines.push(...describeFirstDifference(firstJson, secondJson));

  const firstNames = toolNamesForDiagnostics(first);
  const secondNames = toolNamesForDiagnostics(second);
  lines.push(`tool count: first=${firstNames.length}, second=${secondNames.length}`);
  if (firstJson.includes('\uFFFD') || secondJson.includes('\uFFFD')) {
    lines.push(
      'ВЕРДИКТ: в ответе есть U+FFFD — это дефект ЧТЕНИЯ на стороне теста ' +
        '(многобайтный UTF-8 порван на границе чанка), а не расхождение на стороне сервера.'
    );
  }

  const firstSet = new Set(firstNames);
  const secondSet = new Set(secondNames);
  const onlyInFirst = [...firstSet].filter((name) => !secondSet.has(name));
  const onlyInSecond = [...secondSet].filter((name) => !firstSet.has(name));
  lines.push(`only in first (${onlyInFirst.length}): ${onlyInFirst.join(', ') || '-'}`);
  lines.push(`only in second (${onlyInSecond.length}): ${onlyInSecond.join(', ') || '-'}`);

  const firstDuplicates = duplicatedNames(firstNames);
  const secondDuplicates = duplicatedNames(secondNames);
  if (firstDuplicates.length > 0 || secondDuplicates.length > 0) {
    lines.push(
      `duplicate names: first=[${firstDuplicates.join(', ')}], second=[${secondDuplicates.join(', ')}]`
    );
  }

  if (onlyInFirst.length === 0 && onlyInSecond.length === 0) {
    lines.push(describeNameOrder(firstNames, secondNames));
  }

  return lines.join('\n');
}
