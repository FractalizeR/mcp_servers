/**
 * Эвристический анализ description задачи (пакет 6.1 — пилот MCP Apps №1).
 *
 * Сервер не вызывает внешнюю LLM для «анализа» — это детерминированная,
 * тестируемая проверка структуры текста (пустое/короткое описание,
 * отсутствие типовых разделов). Это осознанное упрощение пилота: цель пилота
 * — проверить механику (ui:// ресурс, postMessage-канал, tool-fallback,
 * санитайз), а не качество текстовых предложений. Продакт всё равно правит
 * предложенный текст вручную в виджете (или в диалоге, в fallback-режиме)
 * до применения — это НЕ автоматическая правка задачи.
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

/**
 * @param sanitizedCurrent - description задачи, УЖЕ пропущенный через
 *   {@link sanitizeTrackerText} (эта функция ничего не санитайзит сама —
 *   разделение ответственности: очистка входа и анализ текста — разные шаги).
 */
export function suggestDescriptionRewrite(sanitizedCurrent: string): DescriptionSuggestion {
  const working = sanitizedCurrent.replace(/\n{3,}/g, '\n\n').trim();
  const notes: string[] = [];

  if (working.length === 0) {
    return {
      suggested: buildEmptyTemplate(),
      notes: ['Описание пустое — предложен шаблон структуры (Контекст/Критерии приемки).'],
    };
  }

  if (working.length < MIN_MEANINGFUL_LENGTH) {
    notes.push('Описание очень короткое — постороннему человеку вряд ли понятна задача.');
  }

  const missingSections = REQUIRED_SECTIONS.filter((section) => !working.includes(section));
  let suggested = working;
  if (missingSections.length > 0) {
    notes.push(`Не хватает разделов: ${missingSections.join(', ')}.`);
    suggested = `${working}\n\n${missingSections
      .map((section) => `## ${section}\n_добавьте текст_`)
      .join('\n\n')}`;
  }

  if (notes.length === 0) {
    notes.push('Явных структурных проблем не найдено — описание оставлено без изменений.');
  }

  return { suggested, notes };
}
