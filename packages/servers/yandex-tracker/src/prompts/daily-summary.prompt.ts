/**
 * Промпт «дейли-сводка» (пакет 5.1.C.tracker плана модернизации MCP
 * 2026-07-28) — слэш-команда для быстрой сводки своих задач: что сделано,
 * что в работе, что зависло.
 */

import { MCP_TOOL_PREFIX } from '#constants';
import type { TrackerPromptDefinition } from './tracker-prompt.types.js';
import { requireArgs } from './tracker-prompt.types.js';

const FIND_ISSUES_TOOL = `${MCP_TOOL_PREFIX}find_issues`;
const GET_ISSUE_CHANGELOG_TOOL = `${MCP_TOOL_PREFIX}get_issue_changelog`;

export const dailySummaryPrompt: TrackerPromptDefinition = {
  prompt: {
    name: 'daily_summary',
    title: 'Дейли-сводка',
    description: '[Prompt] Сводка задач исполнителя: что сделано, что в работе, что зависло',
    arguments: [
      {
        name: 'assignee',
        description:
          'Логин исполнителя в языке запросов Трекера (например, "me()" или конкретный логин). По умолчанию — me()',
        required: false,
      },
      {
        name: 'queue',
        description: 'Необязательно: ограничить одной очередью (ключ очереди)',
        required: false,
      },
    ],
  },

  build(args) {
    requireArgs(dailySummaryPrompt.prompt, args);
    const assignee = args?.['assignee']?.trim() || 'me()';
    const queue = args?.['queue'];

    const text = [
      `Собери дейли-сводку по задачам исполнителя ${assignee} в Яндекс.Трекере.`,
      '',
      `1. Вызови ${FIND_ISSUES_TOOL} с query="Assignee: ${assignee}"` +
        (queue ? ` и queue="${queue}"` : '') +
        ', fields минимум ["key","summary","status","priority","updatedAt"]. ' +
        'Если не уверен, какие статусы в этой очереди/проекте считаются завершёнными — не ' +
        'фильтруй по статусу заранее, отфильтруй уже полученный список сам после ответа.',
      '2. Раздели результат на три группы: ' +
        '(а) обновлялись за последние 24 часа — что сделано; ' +
        '(б) в активной работе сейчас (статус вида "в работе"/"in progress") — фокус на сегодня; ' +
        '(в) не двигались дольше 3 дней при этом не завершены — потенциальные блокеры.',
      `3. Для задач из группы (в) при необходимости вызови ${GET_ISSUE_CHANGELOG_TOOL} по её ключу, ` +
        'чтобы понять, когда и что было последней активностью, и предположить причину затора.',
      '',
      'Выборка обычно небольшая (задачи одного человека) — режима по умолчанию ("auto", тела ' +
        'инлайном при itemsOnPage ≤ 20) должно хватить; переключайся на responseMode="links", только ' +
        'если задач оказалось неожиданно много.',
    ].join('\n');

    return {
      description: `Дейли-сводка для ${assignee}`,
      messages: [{ role: 'user', content: { type: 'text', text } }],
    };
  },
};
