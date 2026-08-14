/**
 * Подсчёт структурных маркеров YFM (пакет 7.1.D плана
 * .agentic-planning/plan_mcp_2026_modernization/7.1_api_defects_parallel.md).
 *
 * НЕ парсер YFM — намеренно. Задача не в том, чтобы понять синтаксис
 * (это была бы отдельная зависимость и источник собственных багов), а в том,
 * чтобы дёшево заметить симптом: агент переписывает `content` целиком
 * (`update_page`) и теряет таблицу/блок, которые были в старом тексте.
 * У update_page нет recovery_token — потеря необратима, поэтому ложное
 * срабатывание здесь дешевле пропуска: считаем маркеры как plain-текстовые
 * подстроки и сигнализируем при любом уменьшении числа любого из них.
 *
 * Маркеры:
 * - `#|` / `|#` — открытие/закрытие YFM-таблицы (`#| ... |#`).
 * - `{%` / `%}` — открытие/закрытие YFM-блока (note, cut, tabs и т.п.).
 */

export interface YfmMarkerCounts {
  tableOpen: number;
  tableClose: number;
  blockOpen: number;
  blockClose: number;
}

const MARKER_LABELS: Record<keyof YfmMarkerCounts, string> = {
  tableOpen: 'открывающих маркеров таблицы (#|)',
  tableClose: 'закрывающих маркеров таблицы (|#)',
  blockOpen: 'открывающих маркеров блока ({%)',
  blockClose: 'закрывающих маркеров блока (%})',
};

/** Подсчитать неперекрывающиеся вхождения подстроки */
function countOccurrences(text: string, marker: string): number {
  let count = 0;
  let index = text.indexOf(marker);
  while (index !== -1) {
    count++;
    index = text.indexOf(marker, index + marker.length);
  }
  return count;
}

export function countYfmMarkers(content: string): YfmMarkerCounts {
  return {
    tableOpen: countOccurrences(content, '#|'),
    tableClose: countOccurrences(content, '|#'),
    blockOpen: countOccurrences(content, '{%'),
    blockClose: countOccurrences(content, '%}'),
  };
}

/**
 * Сравнить старое и новое содержимое и вернуть предупреждения для каждого
 * типа маркера, число которого УМЕНЬШИЛОСЬ. Рост числа маркеров не считается
 * риском (агент мог добавить таблицу/блок) — сигнал только про потерю.
 */
export function detectYfmMarkerLoss(oldContent: string, newContent: string): string[] {
  const before = countYfmMarkers(oldContent);
  const after = countYfmMarkers(newContent);
  const warnings: string[] = [];

  for (const key of Object.keys(before) as Array<keyof YfmMarkerCounts>) {
    if (after[key] < before[key]) {
      warnings.push(
        `Число ${MARKER_LABELS[key]} уменьшилось: было ${before[key]}, стало ${after[key]}. ` +
          'Возможна потеря структурной разметки (таблица #| ... |# или блок {% ... %}). ' +
          'Сравните содержимое через yw_diff_page перед сохранением — у update_page нет recovery_token.'
      );
    }
  }

  return warnings;
}
