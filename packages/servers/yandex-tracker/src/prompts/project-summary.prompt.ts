/**
 * Промпт «сводка по проекту» (пакет 5.1.C.tracker плана модернизации MCP
 * 2026-07-28) — план допускал «спринт или проект»; в Трекере нет отдельных
 * MCP-инструментов для спринтов/бордов (только для очередей/проектов/задач),
 * поэтому выбран проект — то, что реально можно собрать из существующих
 * tools, не изобретая исполнение на сервере.
 */

import { MCP_TOOL_PREFIX } from '#constants';
import type { TrackerPromptDefinition } from './tracker-prompt.types.js';
import { requireArgs } from './tracker-prompt.types.js';

const GET_PROJECT_TOOL = `${MCP_TOOL_PREFIX}get_project`;
const FIND_ISSUES_TOOL = `${MCP_TOOL_PREFIX}find_issues`;

export const projectSummaryPrompt: TrackerPromptDefinition = {
  prompt: {
    name: 'project_summary',
    title: 'Сводка по проекту',
    description:
      '[Prompt] Сводка по проекту: статус, прогресс по задачам, приоритеты без исполнителя',
    arguments: [
      {
        name: 'project',
        description: 'ID или ключ проекта (см. fr_yandex_tracker_get_projects)',
        required: true,
      },
    ],
  },

  build(args) {
    requireArgs(projectSummaryPrompt.prompt, args);
    const project = args?.['project'] ?? '';

    const text = [
      `Составь сводку по проекту "${project}" в Яндекс.Трекере.`,
      '',
      `1. Вызови ${GET_PROJECT_TOOL} с projectId="${project}" и получи название, статус, ` +
        'руководителя, связанные очереди — это контекст сводки.',
      `2. Вызови ${FIND_ISSUES_TOOL} с filter={"project": "${project}"}, fields минимум ` +
        '["key","summary","status","priority","assignee"]. Если filter по project не вернёт ' +
        'ожидаемых задач (поле может называться иначе в конкретной организации), уточни у ' +
        'get_project связанные очереди (queues) и повтори поиск через queue для каждой из них.',
      '',
      'ВАЖНО про объём: у проекта может быть от единиц до сотен задач. Сначала посмотри itemsOnPage ' +
        `в ответе ${FIND_ISSUES_TOOL} (по умолчанию режим "auto" сам переключится на компактные ` +
        'resource_link выше 20 элементов) — работай со сводкой, а не тяни все тела разом. ' +
        'Полные тела конкретных интересующих задач подтягивай точечно: через resources/read по ' +
        'ссылке tracker://issue/{key} или повторным find_issues с keys=[...] и responseMode="full".',
      '',
      '3. Построй сводку: доля задач по статусам (в % от общего числа), задачи с высоким ' +
        'приоритетом без исполнителя, и общий вывод — проект идёт по плану/отстаёт (используй ' +
        'startDate/endDate проекта как ориентир, если они заданы).',
    ].join('\n');

    return {
      description: `Сводка по проекту ${project}`,
      messages: [{ role: 'user', content: { type: 'text', text } }],
    };
  },
};
