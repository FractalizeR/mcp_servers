/**
 * Эвристический анализ description задачи (пилот MCP Apps №1).
 *
 * Сервер не вызывает внешнюю LLM для «анализа» — это детерминированная,
 * тестируемая проверка структуры текста (пустое/короткое описание,
 * отсутствие типовых разделов). Это осознанное упрощение пилота: цель пилота
 * — проверить механику (ui:// ресурс, postMessage-канал, tool-fallback), а не
 * качество текстовых предложений. Продакт всё равно правит предложенный текст
 * вручную в виджете (или в диалоге, в fallback-режиме) до применения — это НЕ
 * автоматическая правка задачи.
 *
 * ⚠️ Инвариант: `suggested` — это исходный текст ПЛЮС дописанные разделы, и
 * ничего кроме. Никакой нормализации (схлопывание пустых строк, trim, замена
 * переводов строк) в него не просачивается: этот текст уходит в `update_issue`
 * как новое description задачи — и всё, что здесь «причесано», в Трекере
 * будет затёрто безвозвратно. Нормализованная копия существует только внутри
 * анализа, для устойчивых проверок.
 */

const REQUIRED_SECTIONS = ['Контекст', 'Критерии приемки'] as const;
const MIN_MEANINGFUL_LENGTH = 20;

export interface DescriptionSuggestion {
  readonly suggested: string;
  readonly notes: readonly string[];
}

function buildEmptyTemplate(): string {
  return (
    '## Контекст\n' +
    '_опишите, зачем нужна задача и что стало поводом_\n\n' +
    '## Критерии приемки\n' +
    '_опишите, что считать выполнением задачи_'
  );
}

function buildSectionStubs(sections: readonly string[]): string {
  return sections.map((section) => `## ${section}\n_добавьте текст_`).join('\n\n');
}

/**
 * @param current - description задачи ровно в том виде, в каком его отдал
 *   Трекер. Функция не чистит и не переписывает вход (см. инвариант в
 *   заголовке файла).
 */
export function suggestDescriptionRewrite(current: string): DescriptionSuggestion {
  const normalized = current.replace(/\r\n/g, '\n').trim();
  const notes: string[] = [];

  if (normalized.length === 0) {
    return {
      suggested: buildEmptyTemplate(),
      notes: ['Описание пустое — предложен шаблон структуры (Контекст/Критерии приемки).'],
    };
  }

  if (normalized.length < MIN_MEANINGFUL_LENGTH) {
    notes.push('Описание очень короткое — постороннему человеку вряд ли понятна задача.');
  }

  const missingSections = REQUIRED_SECTIONS.filter((section) => !normalized.includes(section));
  let suggested = current;
  if (missingSections.length > 0) {
    notes.push(`Не хватает разделов: ${missingSections.join(', ')}.`);
    // Разделитель подбирается под хвост исходника, а не исправляет его: даже
    // хвостовые пробелы остаются на месте — инвариант побайтового префикса
    // (см. заголовок файла) не знает исключений.
    const separator = current.endsWith('\n\n') ? '' : current.endsWith('\n') ? '\n' : '\n\n';
    suggested = `${current}${separator}${buildSectionStubs(missingSections)}`;
  }

  if (notes.length === 0) {
    notes.push('Явных структурных проблем не найдено — описание оставлено без изменений.');
  }

  return { suggested, notes };
}
