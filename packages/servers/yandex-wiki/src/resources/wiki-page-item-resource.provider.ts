/**
 * ResourceProvider для НЕ-табличных ресурсов страницы Wiki — вложений
 * (`attachment`) и внешних SharePoint-ресурсов (`sharepoint_resource`),
 * пакет 5.1.C.wiki. Схема URI: `wiki://page-resource/{pageId}/{type}/{name}`.
 *
 * ПОЧЕМУ ОТДЕЛЬНЫЙ ПРОВАЙДЕР, А НЕ РАСШИРЕНИЕ `wiki://page/{slug}`.
 *
 * Вложение — не страница: у него нет slug, и `facade.getPage()` его не
 * прочитает. URI `wiki://page/{slug}` планом закреплён именно за телом
 * страницы (5.1.B); вкладывать в него ещё и вложения значило бы, что один
 * URI неоднозначен по смыслу. Схема `wiki://page-resource/...` — самостоятельная
 * (и НЕ распространяется на `grid`, см. ниже), но использует тот же
 * механизм регистрации через `ResourceRegistry`.
 *
 * `type` СТРОГО ИСКЛЮЧАЕТ `grid`.
 *
 * Динамические таблицы заморожены решением этапа 7.1 — план прямо требует
 * не расширять на них ни Resources, ни ResourceLink. `GetResourcesTool`
 * (см. `#tools/api/resources/get/get-resources.tool.ts`) поэтому никогда не
 * строит `resource_link` для `type: 'grid'`, и этот провайдер сознательно не
 * умеет резолвить такой URI (даже если бы кто-то его сконструировал вручную).
 *
 * ЧТЕНИЕ ПО ИМЕНИ, А НЕ ПО ID.
 *
 * `Resource.item` типизирован как `unknown` (форма зависит от `type` и не
 * документирована в этом кодовой базе, см. resource.entity.ts) — устойчивого
 * идентификатора, кроме имени, нет. `GET /v1/pages/{idx}/resources` уже
 * поддерживает поиск по имени (`q` — «Поиск по названию»), поэтому
 * `readResource` переиспользует ЭТОТ ЖЕ эндпоинт с фильтром по `type`+`q`,
 * а не изобретает отдельный API вызова «получить один ресурс по id»,
 * которого в реализованной части клиента нет.
 */

import { ApiErrorClass } from '@fractalizer/mcp-infrastructure';
import type {
  ResourceProvider,
  ResourceListPage,
  McpResourceContents,
  McpResourceTemplate,
} from '@fractalizer/mcp-core';
import type { YandexWikiFacade } from '#wiki_api/facade/index.js';
import { extractResourceItemName } from './shared/resource-item-fields.js';

/** Типы ресурсов, которые этот провайдер умеет резолвить (НЕ `grid` — см. заголовок). */
const LINKABLE_TYPES = ['attachment', 'sharepoint_resource'] as const;
type LinkableResourceType = (typeof LINKABLE_TYPES)[number];

const URI_PREFIX = 'wiki://page-resource/';
const URI_PATTERN = /^wiki:\/\/page-resource\/(\d+)\/(attachment|sharepoint_resource)\/(.+)$/;
const HTTP_NOT_FOUND = 404;
/** Разумный верхний предел выдачи одного поиска по имени (максимум API — 50). */
const SEARCH_PAGE_SIZE = 50;

/** Построить URI ресурса из идентифицирующих его частей (обратная сторона парсинга). */
export function buildPageItemResourceUri(
  pageId: number,
  type: LinkableResourceType,
  name: string
): string {
  return `${URI_PREFIX}${pageId}/${type}/${encodeURIComponent(name)}`;
}

export { LINKABLE_TYPES };
export type { LinkableResourceType };

export class WikiPageItemResourceProvider implements ResourceProvider {
  public readonly id = 'wiki-page-resources';

  constructor(private readonly facade: YandexWikiFacade) {}

  listResources(): ResourceListPage {
    // Провайдер по конструкции привязан к конкретной странице (pageId в
    // URI) — без неё честного глобального обзора нет, см. заголовок файла
    // и симметричное решение в WikiPageResourceProvider.
    return { resources: [] };
  }

  async readResource(uri: string): Promise<readonly McpResourceContents[] | undefined> {
    const parsed = this.parseUri(uri);
    if (parsed === undefined) {
      return undefined;
    }

    try {
      const response = await this.facade.getResources({
        idx: parsed.pageId,
        types: [parsed.type],
        q: parsed.name,
        page_size: SEARCH_PAGE_SIZE,
      });

      const match = response.results.find(
        (resource) =>
          resource.type === parsed.type && extractResourceItemName(resource.item) === parsed.name
      );

      if (match === undefined) {
        return undefined;
      }

      return [
        {
          uri,
          mimeType: 'application/json',
          text: JSON.stringify(match, null, 2),
        },
      ];
    } catch (error: unknown) {
      if (error instanceof ApiErrorClass && error.statusCode === HTTP_NOT_FOUND) {
        return undefined;
      }
      throw error;
    }
  }

  listTemplates(): readonly McpResourceTemplate[] {
    return [
      {
        uriTemplate: `${URI_PREFIX}{pageId}/{type}/{name}`,
        name: 'wiki-page-resource',
        title: 'Ресурс страницы Wiki (вложение или внешний ресурс)',
        description:
          'Вложение (attachment) или SharePoint-ресурс страницы Wiki по имени. ' +
          'НЕ распространяется на таблицы (grid) — они вне Resources/ResourceLink ' +
          '(заморожены решением этапа 7.1).',
        mimeType: 'application/json',
      },
    ];
  }

  private parseUri(
    uri: string
  ): { pageId: number; type: LinkableResourceType; name: string } | undefined {
    const match = URI_PATTERN.exec(uri);
    if (match === null) {
      return undefined;
    }

    const pageIdRaw = match[1];
    const typeRaw = match[2];
    const encodedName = match[3];
    if (pageIdRaw === undefined || typeRaw === undefined || encodedName === undefined) {
      return undefined;
    }
    if (typeRaw !== 'attachment' && typeRaw !== 'sharepoint_resource') {
      return undefined;
    }

    return {
      pageId: Number(pageIdRaw),
      type: typeRaw,
      name: decodeURIComponent(encodedName),
    };
  }
}
