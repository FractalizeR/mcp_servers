/**
 * `ResourceProvider` для виджета MCP Apps пилота №1 — схема `ui://`
 * («анализ задачи и правка description»). В отличие от `IssueResourceProvider`/`QueueResourceProvider`
 * и т.д. этот провайдер не читает Трекер — отдаёт один и тот же статический
 * HTML-бандл (`issue-description-editor.widget.ts`) по фиксированному URI, у
 * ресурса нет переменной части и не нужен facade.
 *
 * `_meta.ui.csp` на содержимом ресурса — декларация CSP по SEP-1865
 * (https://github.com/modelcontextprotocol/ext-apps/blob/main/specification/draft/apps.mdx,
 * секция про `_meta.ui.csp`/`connectDomains`/`resourceDomains`/`frameDomains`/
 * `baseUriDomains`): пустые списки — виджет не запрашивает НИ ОДИН внешний
 * origin (весь CSS/JS инлайн, см. заголовок widget-файла), поэтому декларация
 * сознательно ничего не разрешает сверх сендбокса хоста.
 *
 * Спека разрешает объявлять `_meta.ui` на записи `resources/list`, на
 * содержимом `resources/read` или на обоих (при конфликте выигрывает
 * содержимое), и рекомендует именно содержимое. Здесь только оно: дублировать
 * декларацию в листинге пришлось бы через расширение `McpResource` во
 * фреймворке, а поведение хоста от этого не меняется.
 *
 * `_meta` на содержимом `resources/read` доходит до wire без потерь —
 * `registerResourceHandlers()` (`packages/framework/core/.../build-mcp-server.ts`)
 * прокидывает результат `ResourceRegistry.readResource()` как есть, без
 * проекции по whitelist полей. У `_meta` на `ToolDefinition` (см.
 * `analyze-issue-description.tool.ts`) путь на wire устроен иначе:
 * `tools/list` строит ответ через `projectToolDefinitionForList()`
 * (whitelist полей) — и `_meta.ui.resourceUri` там тоже доезжает до клиента,
 * но потому, что whitelist явно пропускает `_meta`, а не потому, что
 * `tools/list` вовсе не проецирует объект.
 */

import type {
  ResourceProvider,
  ResourceListPage,
  McpResourceContents,
  McpResourceTemplate,
} from '@fractalizer/mcp-core';
import { ISSUE_DESCRIPTION_EDITOR_URI } from './apps-ui-uri.js';
import { buildIssueDescriptionEditorHtml } from './issue-description-editor.widget.js';
import type { IssueDescriptionEditorToolNames } from './issue-description-editor.widget.js';

/** SEP-1865: единственный поддерживаемый MIME-тип UI-ресурсов MVP. */
const MCP_APP_MIME_TYPE = 'text/html;profile=mcp-app';

/** Форма `_meta.ui.csp` по SEP-1865 — см. заголовок файла. */
interface UiCspMeta {
  readonly ui: {
    readonly csp: {
      readonly connectDomains: readonly string[];
      readonly resourceDomains: readonly string[];
      readonly frameDomains: readonly string[];
      readonly baseUriDomains: readonly string[];
    };
  };
}

const EMPTY_CSP: UiCspMeta = {
  ui: {
    csp: {
      connectDomains: [],
      resourceDomains: [],
      frameDomains: [],
      baseUriDomains: [],
    },
  },
};

export class IssueDescriptionEditorResourceProvider implements ResourceProvider {
  public readonly id = 'tracker-apps-issue-description-editor';

  /**
   * Бандл собирается один раз на провайдер: содержимое статично. Имя
   * инструмента правки приходит снаружи (composition root берёт его из
   * метаданных инструмента) — расхождение с реестром и было тем дефектом,
   * из-за которого кнопка «применить» молча не работала. Модуль `resources`
   * при этом не знает про `tools`: обратное ребро уже есть
   * (`analyze-issue-description.tool.ts` → `apps-ui-uri.ts`), и вторая грань
   * замкнула бы слои друг на друга.
   */
  private readonly widgetHtml: string;

  constructor(toolNames: IssueDescriptionEditorToolNames) {
    this.widgetHtml = buildIssueDescriptionEditorHtml(toolNames);
  }

  /** Единственный статический ресурс — бессмысленно перечислять постранично. */
  listResources(): ResourceListPage {
    return {
      resources: [
        {
          uri: ISSUE_DESCRIPTION_EDITOR_URI,
          name: 'issue-description-editor',
          title: 'Редактор описания задачи (MCP Apps, пилот)',
          description:
            'Виджет пилота №1: текущее description задачи и предложенная правка рядом, ' +
            'применение — вызовом update_issue из самого виджета.',
          mimeType: MCP_APP_MIME_TYPE,
        },
      ],
    };
  }

  readResource(uri: string): readonly McpResourceContents[] | undefined {
    if (uri !== ISSUE_DESCRIPTION_EDITOR_URI) {
      return undefined;
    }

    const content: McpResourceContents & { _meta: UiCspMeta } = {
      uri,
      mimeType: MCP_APP_MIME_TYPE,
      text: this.widgetHtml,
      _meta: EMPTY_CSP,
    };
    return [content];
  }

  /** Нет переменной части URI — шаблон (RFC 6570) неприменим, см. заголовок файла. */
  listTemplates(): readonly McpResourceTemplate[] {
    return [];
  }
}
