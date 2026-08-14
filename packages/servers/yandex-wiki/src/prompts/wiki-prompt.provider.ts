/**
 * PromptProvider для Wiki (пакет 5.1.C.wiki, вторая часть — промпты).
 *
 * Два промпта, заданные планом (5.1_resources_prompts_parallel.md, раздел
 * "Пакеты 5.1.C"): сводка раздела и подготовка обновления документа. Сервер
 * НЕ исполняет промпт — `getPrompt` строит `messages`, инструменты по ним
 * вызывает клиент/модель (см. заголовок prompt-provider.ts во framework).
 *
 * ПОЧЕМУ "ПОДГОТОВКА ОБНОВЛЕНИЯ" НАСТАИВАЕТ НА yw_diff_page.
 *
 * `update_page` полностью заменяет `content` страницы (не патч) и не выдаёт
 * `recovery_token` (в отличие от `delete_page`) — обоснование того же риска
 * уже есть в описании параметра `content` `UpdatePageParamsSchema`
 * (`update-page.schema.ts`, этап 7.1.D) и в самом инструменте `yw_diff_page`.
 * Этот промпт — процедурная обвязка того же требования в виде слэш-команды:
 * ведёт модель через diff ДО записи, а не полагается, что она вспомнит
 * прочитать документацию параметра.
 */

import { ProtocolError } from '@modelcontextprotocol/server';
import { buildToolName } from '@fractalizer/mcp-core';
import type { PromptProvider, McpPrompt, PromptGetResult } from '@fractalizer/mcp-core';
import { MCP_TOOL_PREFIX } from '#constants';

const SECTION_SUMMARY = buildToolName('section_summary', MCP_TOOL_PREFIX);
const DOCUMENT_UPDATE_PREP = buildToolName('document_update_prep', MCP_TOOL_PREFIX);

const PROMPTS: readonly McpPrompt[] = [
  {
    name: SECTION_SUMMARY,
    title: 'Сводка раздела Wiki',
    description:
      'Сводка раздела Wiki по корневой странице: структура, содержимое, вложения/таблицы, ' +
      'замеченные проблемы. Только чтение — write-инструменты не вызываются.',
    arguments: [
      {
        name: 'slug',
        description: 'Slug корневой страницы раздела (например users/docs)',
        required: true,
      },
    ],
  },
  {
    name: DOCUMENT_UPDATE_PREP,
    title: 'Подготовка обновления документа Wiki',
    description:
      'Ведёт через безопасную подготовку обновления страницы Wiki: черновик изменений и ' +
      'ОБЯЗАТЕЛЬНАЯ сверка через yw_diff_page перед записью (update_page переписывает ' +
      'содержимое целиком и необратим).',
    arguments: [
      { name: 'slug', description: 'Slug страницы, которую нужно обновить', required: true },
      {
        name: 'instructions',
        description: 'Что именно нужно изменить в содержимом (свободный текст)',
        required: false,
      },
    ],
  },
];

/** Достать обязательный строковый аргумент промпта либо бросить `-32602` с внятным текстом. */
function requireArg(
  promptName: string,
  args: Readonly<Record<string, string>> | undefined,
  argName: string
): string {
  const value = args?.[argName];
  if (value === undefined || value.trim().length === 0) {
    throw new ProtocolError(
      -32602,
      `Промпт "${promptName}": обязательный аргумент "${argName}" не передан или пуст`
    );
  }
  return value;
}

function buildSectionSummary(args: Readonly<Record<string, string>> | undefined): PromptGetResult {
  const slug = requireArg(SECTION_SUMMARY, args, 'slug');

  const text = [
    `Подготовь сводку раздела Wiki с корневой страницей "${slug}".`,
    '',
    'Шаги:',
    `1. Вызови yw_get_page(slug: "${slug}", fields: "content,attributes,breadcrumbs") — ` +
      'получи заголовок, метаданные (дата изменения, число комментариев) и содержимое ' +
      'корневой страницы.',
    '2. Вызови yw_get_resources(idx: <id страницы из шага 1>) — узнай, какие вложения, ' +
      'таблицы и SharePoint-ресурсы прикреплены к странице.',
    '3. Списочного API "дочерние страницы раздела" в этом сервере нет. Если он нужен для ' +
      'полноты сводки — используй yw_raw_api_request (GET-only) по документированным ' +
      'эндпоинтам Wiki API; не изобретай данные, которых не получил от API.',
    '4. Это read-only сводка: НЕ вызывай yw_create_page/yw_update_page/yw_delete_page/' +
      'yw_clone_page/yw_append_content и любые write-инструменты таблиц.',
    '',
    'Собери результат:',
    '- Заголовок и slug раздела',
    '- Дата последнего изменения (modified_at), число комментариев',
    '- Краткое содержание (2-4 предложения) на основе content',
    '- Список вложений/таблиц, если есть (имена/типы из yw_get_resources)',
    '- Замеченные проблемы: пустые секции, TODO/FIXME в тексте, давно не обновлявшиеся страницы',
  ].join('\n');

  return {
    description: `Сводка раздела Wiki: ${slug}`,
    messages: [{ role: 'user', content: { type: 'text', text } }],
  };
}

function buildDocumentUpdatePrep(
  args: Readonly<Record<string, string>> | undefined
): PromptGetResult {
  const slug = requireArg(DOCUMENT_UPDATE_PREP, args, 'slug');
  const instructions = args?.['instructions'];

  const text = [
    `Подготовь безопасное обновление страницы Wiki "${slug}".`,
    ...(instructions !== undefined && instructions.trim().length > 0
      ? [`Требуемые изменения: ${instructions}`]
      : []),
    '',
    'КРИТИЧЕСКИ ВАЖНО: yw_update_page ПОЛНОСТЬЮ заменяет content страницы (это НЕ патч) и не ' +
      'выдаёт recovery_token (в отличие от yw_delete_page) — потерянная YFM-разметка (таблицы ' +
      '#| ... |#, блоки {% ... %}, списки) НЕВОССТАНОВИМА.',
    '',
    'Шаги (строго по порядку):',
    `1. Вызови yw_get_page(slug: "${slug}", fields: "content,attributes") — прочитай ` +
      'ТЕКУЩЕЕ содержимое страницы целиком.',
    '2. Составь ЧЕРНОВИК нового content с учётом требуемых изменений, сохранив ВСЮ ' +
      'структурную YFM-разметку, которая не должна быть удалена.',
    '3. ОБЯЗАТЕЛЬНО вызови yw_diff_page, сравнив черновик с текущим содержимым, ПРЕЖДЕ чем ' +
      'вызывать yw_update_page. Внимательно изучи diff: не потерялись ли таблицы, блоки или ' +
      'другая структура, которую менять не планировалось.',
    '4. Если diff показывает нежелательные потери — исправь черновик и повтори шаг 3.',
    '5. Только после того, как diff подтверждает, что изменения соответствуют намерению и ' +
      'ничего лишнего не потеряно, вызови yw_update_page с готовым content.',
    '',
    'Не пропускай шаг 3 (yw_diff_page) ни при каких обстоятельствах — это единственный способ ' +
      'увидеть, что теряется при перезаписи.',
  ].join('\n');

  return {
    description: `Подготовка обновления страницы Wiki: ${slug}`,
    messages: [{ role: 'user', content: { type: 'text', text } }],
  };
}

export class WikiPromptProvider implements PromptProvider {
  public readonly id = 'wiki-prompts';

  listPrompts(): readonly McpPrompt[] {
    return PROMPTS;
  }

  getPrompt(name: string, args?: Readonly<Record<string, string>>): PromptGetResult | undefined {
    switch (name) {
      case SECTION_SUMMARY:
        return buildSectionSummary(args);
      case DOCUMENT_UPDATE_PREP:
        return buildDocumentUpdatePrep(args);
      default:
        return undefined;
    }
  }
}

export { SECTION_SUMMARY, DOCUMENT_UPDATE_PREP };
