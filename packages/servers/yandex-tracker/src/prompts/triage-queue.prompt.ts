/**
 * Промпт «triage очереди» (пакет 5.1.C.tracker плана модернизации MCP
 * 2026-07-28) — слэш-команда для разбора незакрытых задач одной очереди по
 * приоритету/исполнителю/свежести.
 */

import { MCP_TOOL_PREFIX } from '#constants';
import type { TrackerPromptDefinition } from './tracker-prompt.types.js';
import { requireArgs } from './tracker-prompt.types.js';

const FIND_ISSUES_TOOL = `${MCP_TOOL_PREFIX}find_issues`;
const GET_QUEUE_TOOL = `${MCP_TOOL_PREFIX}get_queue`;

export const triageQueuePrompt: TrackerPromptDefinition = {
  prompt: {
    name: 'triage_queue',
    title: 'Triage очереди',
    description: '[Prompt] Разбор незакрытых задач очереди: приоритеты, зависшие, без исполнителя',
    arguments: [
      { name: 'queue', description: 'Ключ очереди (например, BACKEND)', required: true },
      {
        name: 'focus',
        description:
          'Необязательный акцент триажа — свободный текст (например, "критические баги", "задачи без исполнителя")',
        required: false,
      },
    ],
  },

  build(args) {
    requireArgs(triageQueuePrompt.prompt, args);
    const queue = args?.['queue'] ?? '';
    const focus = args?.['focus'];

    const text = [
      `Проведи triage очереди "${queue}" в Яндекс.Трекере.`,
      '',
      `1. Вызови ${FIND_ISSUES_TOOL} с queue="${queue}" и query, исключающим завершённые статусы ` +
        '(если не уверен, какие статусы в этой очереди считаются финальными — сначала вызови ' +
        `${GET_QUEUE_TOOL} с queueId="${queue}" и посмотри её workflow/типы задач). ` +
        'Обязательно укажи fields минимум ["key","summary","status","priority","assignee","updatedAt"].',
      '2. Сгруппируй результат по priority и status. Отдельно выпиши: ' +
        '(а) задачи без исполнителя (assignee отсутствует), ' +
        '(б) задачи с высоким приоритетом (critical/blocker), ' +
        '(в) задачи, которые не обновлялись дольше недели (сравни updatedAt с текущей датой).',
      focus ? `3. Особое внимание удели: ${focus}.` : undefined,
      '',
      'ВАЖНО про объём: если очередь активная и в ней может быть много задач, сначала посмотри ' +
        `totalCount в ответе ${FIND_ISSUES_TOOL} (режим ответа по умолчанию "auto" сам переключится ` +
        'на компактные resource_link выше 20 элементов). Работай со сводкой/ссылками, а не тяни ' +
        'полные тела всех задач сразу — открывай (через resources/read или повторный вызов с ' +
        'keys=[...] и responseMode="full") только те, что попали в интересующие группы.',
    ]
      .filter((line): line is string => line !== undefined)
      .join('\n');

    return {
      description: `Triage очереди ${queue}`,
      messages: [{ role: 'user', content: { type: 'text', text } }],
    };
  },
};
