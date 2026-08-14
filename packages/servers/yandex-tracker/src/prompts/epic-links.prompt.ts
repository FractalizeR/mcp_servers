/**
 * Промпт «разбор связей эпика» (пакет 5.1.C.tracker плана модернизации MCP
 * 2026-07-28) — слэш-команда для сводки по дочерним/связанным задачам эпика:
 * сколько их, в каком они статусе, что заблокировано.
 */

import { MCP_TOOL_PREFIX } from '#constants';
import type { TrackerPromptDefinition } from './tracker-prompt.types.js';
import { requireArgs } from './tracker-prompt.types.js';

const GET_ISSUE_LINKS_TOOL = `${MCP_TOOL_PREFIX}get_issue_links`;
const GET_ISSUES_TOOL = `${MCP_TOOL_PREFIX}get_issues`;

export const epicLinksPrompt: TrackerPromptDefinition = {
  prompt: {
    name: 'epic_links',
    title: 'Разбор связей эпика',
    description:
      '[Prompt] Разбор связей эпика: дочерние/связанные задачи, их статус, что заблокировано',
    arguments: [
      { name: 'epic', description: 'Ключ эпика (например, BACKEND-100)', required: true },
    ],
  },

  build(args) {
    requireArgs(epicLinksPrompt.prompt, args);
    const epic = args?.['epic'] ?? '';

    const text = [
      `Разбери связи эпика "${epic}" в Яндекс.Трекере.`,
      '',
      `1. Вызови ${GET_ISSUE_LINKS_TOOL} с issueIds=["${epic}"], fields минимум ` +
        '["id","type","direction","object"] — это вернёт все связи эпика (дочерние задачи, ' +
        'подзадачи, "relates", "depends"/"blocks" и т.п.) с ключами связанных задач.',
      '2. Сгруппируй ключи связанных задач по типу связи (например: подзадачи/дочерние — отдельно, ' +
        '"blocks"/"depends" — отдельно, остальное — отдельно).',
      `3. Вызови ${GET_ISSUES_TOOL} с issueKeys=[все ключи из шага 1 одним batch-вызовом], fields ` +
        'минимум ["key","summary","status","assignee","priority"], чтобы получить их текущее ' +
        'состояние за один запрос вместо N отдельных.',
      '4. Построй сводку: сколько всего связанных задач, сколько завершено/в работе/не начато ' +
        '(в % и числом), какие задачи по связям "blocks"/"depends" ещё не закрыты (это блокеры ' +
        'эпика), кто исполнители незакрытых задач.',
      '',
      'Если у эпика много связей (десятки), это всё равно один batch-вызов get_issues — большого ' +
        'объёма в контексте это не создаст (в отличие от find_issues на сотнях задач), поэтому ' +
        'резюме можно строить сразу по всем.',
    ].join('\n');

    return {
      description: `Разбор связей эпика ${epic}`,
      messages: [{ role: 'user', content: { type: 'text', text } }],
    };
  },
};
