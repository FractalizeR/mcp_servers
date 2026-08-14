/**
 * `PromptProvider` TickTick (оставшаяся часть пакета 5.1.C.ticktick плана
 * модернизации MCP 2026-07-28) — три слэш-команды из плана (раздел
 * «Пакеты 5.1.C»): дневной обзор, недельный обзор, GTD-разбор входящих.
 *
 * КОНТРАКТ: `getPrompt()` — ЧИСТАЯ функция построения сообщений, БЕЗ
 * обращения к `TickTickFacade`/HTTP (см. заголовок `prompt-provider.ts`
 * framework: "PromptProvider не содержит никакого движка исполнения").
 * Сервер промпт не исполняет — он лишь подсказывает МОДЕЛИ, какие
 * инструменты вызвать и в каком порядке; вызовы делает клиент/модель после
 * получения сообщений `prompts/get`.
 *
 * ИМЕНА ИНСТРУМЕНТОВ В ТЕКСТЕ — с префиксом `MCP_TOOL_PREFIX`
 * (`fr_ticktick_...`), тем же, что видит клиент в `tools/list` — иначе
 * модель не найдёт инструмент по имени без префикса.
 *
 * ПРО responseMode/ResourceLink (пакет 5.1.B/C): три инструмента, которые
 * промпты просят вызвать чаще всего (`get_overdue_tasks`,
 * `get_tasks_due_today`, `get_tasks_due_this_week`, `get_project_tasks`),
 * фильтруют результат НА НАШЕЙ стороне после `getAllTasks()`/`getProjectData()`
 * (см. пакет 7.1.E/F) — выборка может оказаться большой. Каждый промпт,
 * который такой инструмент вызывает, прямо говорит модели: если элементов
 * много, разумнее запросить `responseMode: "links"` и подтягивать тела
 * выборочно через `resources/read`, а не тащить все тела сразу.
 */

import { ProtocolError } from '@modelcontextprotocol/server';
import { buildToolName } from '@fractalizer/mcp-core';
import type { PromptProvider, McpPrompt, PromptGetResult } from '@fractalizer/mcp-core';
import { MCP_TOOL_PREFIX } from '#constants';

/** Полные (префиксованные) имена инструментов, упоминаемые в тексте промптов. */
const TOOL = {
  getOverdueTasks: buildToolName('get_overdue_tasks', MCP_TOOL_PREFIX),
  getTasksDueToday: buildToolName('get_tasks_due_today', MCP_TOOL_PREFIX),
  getTasksDueThisWeek: buildToolName('get_tasks_due_this_week', MCP_TOOL_PREFIX),
  getProjects: buildToolName('get_projects', MCP_TOOL_PREFIX),
  getProjectTasks: buildToolName('get_project_tasks', MCP_TOOL_PREFIX),
  updateTask: buildToolName('update_task', MCP_TOOL_PREFIX),
  completeTask: buildToolName('complete_task', MCP_TOOL_PREFIX),
  deleteTask: buildToolName('delete_task', MCP_TOOL_PREFIX),
  createProject: buildToolName('create_project', MCP_TOOL_PREFIX),
  getEngagedTasks: buildToolName('get_engaged_tasks', MCP_TOOL_PREFIX),
  getNextTasks: buildToolName('get_next_tasks', MCP_TOOL_PREFIX),
} as const;

/** Общая для всех трёх промптов подсказка про большие выборки (см. заголовок файла). */
const LARGE_COLLECTION_HINT =
  'Если задач окажется много (в ответе mode: "links" вместо "full"), НЕ пытайся ' +
  'вытащить все тела разом — сначала посмотри компактные resource_link (id/название), ' +
  'реши, какие задачи реально нужны в подробностях, и подтяни только их через ' +
  '`resources/read`. Это дешевле по контексту, чем responseMode: "full" на большой выборке.';

/** Имена промптов (полные, с префиксом сервера — тот же приём, что и у инструментов). */
export const TICKTICK_PROMPT_NAMES = {
  dailyReview: buildToolName('daily_review', MCP_TOOL_PREFIX),
  weeklyReview: buildToolName('weekly_review', MCP_TOOL_PREFIX),
  gtdInboxReview: buildToolName('gtd_inbox_review', MCP_TOOL_PREFIX),
} as const;

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Достать значение обязательного аргумента либо бросить внятную протокольную
 * ошибку (`-32602` — тот же код, что `PromptRegistry` использует для
 * "промпт не найден", это семантически верный код JSON-RPC "Invalid params").
 */
function requireArg(
  args: Readonly<Record<string, string>> | undefined,
  name: string,
  promptName: string
): string {
  const value = args?.[name];
  if (value === undefined || value.trim().length === 0) {
    throw new ProtocolError(
      -32602,
      `Аргумент "${name}" обязателен для промпта "${promptName}" и не может быть пустым.`
    );
  }
  return value;
}

function buildDailyReview(args?: Readonly<Record<string, string>>): PromptGetResult {
  const date = args?.['date']?.trim() || todayIso();

  return {
    description: 'Дневной обзор задач TickTick',
    messages: [
      {
        role: 'user',
        content: {
          type: 'text',
          text:
            `Проведи дневной обзор задач TickTick на ${date}.\n\n` +
            `1. Вызови \`${TOOL.getOverdueTasks}\` (fields: id, title, dueDate, priority, projectId) — это то, что горит.\n` +
            `2. Вызови \`${TOOL.getTasksDueToday}\` (те же поля) — план на сегодня.\n` +
            `3. ${LARGE_COLLECTION_HINT}\n` +
            `4. Сформируй сводку: сначала просроченные (что делать немедленно), ` +
            `затем сегодняшние — предложи порядок выполнения по приоритету и сроку. ` +
            `Если просроченных много, отдельно отметь, что стоит перенести или удалить, а не тащить дальше.`,
        },
      },
    ],
  };
}

function buildWeeklyReview(): PromptGetResult {
  return {
    description: 'Недельный обзор загрузки TickTick',
    messages: [
      {
        role: 'user',
        content: {
          type: 'text',
          text:
            'Проведи недельный обзор загрузки в TickTick.\n\n' +
            `1. Вызови \`${TOOL.getTasksDueThisWeek}\` (fields: id, title, dueDate, priority, projectId).\n` +
            `2. Вызови \`${TOOL.getOverdueTasks}\` (те же поля) — хвост с прошлых недель.\n` +
            `3. Вызови \`${TOOL.getProjects}\` (fields: id, name) — чтобы понимать, каким проектам принадлежат задачи.\n` +
            `4. ${LARGE_COLLECTION_HINT}\n` +
            '5. Сформируй сводку по дням недели и по проектам: какие дни перегружены, ' +
            'какой проект просел сильнее остальных, что стоит перенести на следующую неделю через ' +
            `\`${TOOL.updateTask}\` (поле dueDate).`,
        },
      },
    ],
  };
}

function buildGtdInboxReview(
  args: Readonly<Record<string, string>> | undefined,
  promptName: string
): PromptGetResult {
  const projectId = requireArg(args, 'project_id', promptName);

  return {
    description: 'GTD-разбор входящих задач TickTick',
    messages: [
      {
        role: 'user',
        content: {
          type: 'text',
          text:
            `Разбери задачи проекта Inbox TickTick (projectId: "${projectId}") по методологии GTD.\n\n` +
            `1. Вызови \`${TOOL.getProjectTasks}\` с projectId="${projectId}" ` +
            '(fields: id, title, content, priority, dueDate, status).\n' +
            `2. ${LARGE_COLLECTION_HINT}\n` +
            '3. Для каждой задачи ответь на классические GTD-вопросы и сразу действуй:\n' +
            `   - Это вообще нужно делать? Нет → удали через \`${TOOL.deleteTask}\`.\n` +
            `   - Можно сделать прямо сейчас за пару минут? Да → сделай и заверши через \`${TOOL.completeTask}\`.\n` +
            '   - Это конкретное следующее действие с понятным сроком/приоритетом? ' +
            `Да → назначь через \`${TOOL.updateTask}\` (priority/dueDate), убрав задачу из Inbox переносом ` +
            'в подходящий проект (поле projectId).\n' +
            '   - Это на самом деле проект из нескольких шагов, а не одна задача? ' +
            `Да → заведи отдельный проект через \`${TOOL.createProject}\` и перенеси туда.\n` +
            `4. По завершении вызови \`${TOOL.getEngagedTasks}\` и \`${TOOL.getNextTasks}\`, ` +
            'чтобы убедиться, что разобранные задачи корректно встали в общую картину, ' +
            `а \`${TOOL.getProjectTasks}\` по Inbox снова — чтобы подтвердить, что там пусто или почти пусто.`,
        },
      },
    ],
  };
}

const PROMPTS: readonly McpPrompt[] = [
  {
    name: TICKTICK_PROMPT_NAMES.dailyReview,
    title: 'Дневной обзор',
    description:
      'Обзор задач на сегодня: просроченные и запланированные, с предложенным порядком выполнения',
    arguments: [
      {
        name: 'date',
        description: 'Дата обзора в формате YYYY-MM-DD (по умолчанию — сегодняшняя дата сервера)',
        required: false,
      },
    ],
  },
  {
    name: TICKTICK_PROMPT_NAMES.weeklyReview,
    title: 'Недельный обзор',
    description: 'Обзор загрузки на неделю по дням и проектам, с учётом просроченных задач',
  },
  {
    name: TICKTICK_PROMPT_NAMES.gtdInboxReview,
    title: 'GTD-разбор входящих',
    description: 'Пошаговый разбор задач проекта Inbox по классической методологии GTD',
    arguments: [
      {
        name: 'project_id',
        description:
          'ID проекта Inbox (узнать через get_projects — обычно называется "Inbox"/"Входящие"). ' +
          'Промпт не обращается к API сам (строит только текст сообщения), поэтому id нужно передать явно.',
        required: true,
      },
    ],
  },
];

export class TickTickPromptProvider implements PromptProvider {
  public readonly id = 'ticktick-prompts';

  listPrompts(): readonly McpPrompt[] {
    return PROMPTS;
  }

  getPrompt(name: string, args?: Readonly<Record<string, string>>): PromptGetResult | undefined {
    switch (name) {
      case TICKTICK_PROMPT_NAMES.dailyReview:
        return buildDailyReview(args);
      case TICKTICK_PROMPT_NAMES.weeklyReview:
        return buildWeeklyReview();
      case TICKTICK_PROMPT_NAMES.gtdInboxReview:
        return buildGtdInboxReview(args, name);
      default:
        return undefined;
    }
  }
}
