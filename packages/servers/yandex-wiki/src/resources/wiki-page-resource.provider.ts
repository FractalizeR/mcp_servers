/**
 * ResourceProvider для страниц Wiki (пакет 5.1.C.wiki плана модернизации MCP
 * 2026-07-28) — схема URI `wiki://page/{slug}`, спроектированная в 5.1.B.
 *
 * ПОЧЕМУ ТОЛЬКО СТРАНИЦЫ, А НЕ ВСЁ ПОДРЯД.
 *
 * Плана прямо предупреждает: «соблазн сделать ресурсом всё подряд». Ресурс
 * оправдан там, где содержимое адресуемо и переиспользуемо — тело страницы
 * (YFM-контент) именно такое: оно большое относительно summary страницы
 * (id/slug/title), и агент осмысленно может захотеть прочитать его отдельно
 * от списка. Таблицы (grid) исключены сознательно — заморожены решением
 * этапа 7.1 (команда почти не использует динамические таблицы; то, что
 * выглядит таблицей на странице, обычно YFM-разметка внутри `content`).
 *
 * `listResources` НАМЕРЕННО ПУСТ.
 *
 * В реализованной части Wiki API (см. `#wiki_api/api_operations/page`) нет
 * эндпоинта «список всех страниц» — только точечные `getPage`/`getPageById`
 * по конкретному slug/id и `getResources` (вложения ОДНОЙ страницы, не
 * страницы вообще). Без него `listResources` нечем наполнить честно —
 * возврат пустой страницы БЕЗ `nextCursor` полностью соответствует контракту
 * `ResourceProvider` (см. resource-provider.ts во framework): `readResource`
 * обязан разрешать любой URI схемы напрямую НЕЗАВИСИМО от `listResources`,
 * и именно так используется этот провайдер — как цель `resource_link`,
 * построенных инструментами (см. `toResourceLink` в других tool'ах), а не
 * как источник обзора «какие страницы вообще есть».
 */

import { ApiErrorClass } from '@fractalizer/mcp-infrastructure';
import type {
  ResourceProvider,
  ResourceListPage,
  McpResourceContents,
  McpResourceTemplate,
} from '@fractalizer/mcp-core';
import type { YandexWikiFacade } from '#wiki_api/facade/index.js';

/** Префикс схемы URI страниц Wiki: `wiki://page/{slug}`. */
const PAGE_URI_PREFIX = 'wiki://page/';

/** HTTP-статус "не найдено" — API Wiki отдаёт его на несуществующий slug. */
const HTTP_NOT_FOUND = 404;

export class WikiPageResourceProvider implements ResourceProvider {
  public readonly id = 'wiki-pages';

  constructor(private readonly facade: YandexWikiFacade) {}

  listResources(): ResourceListPage {
    // См. заголовок файла — честно пусто, нет эндпоинта для полного обзора.
    return { resources: [] };
  }

  async readResource(uri: string): Promise<readonly McpResourceContents[] | undefined> {
    const slug = this.parseSlug(uri);
    if (slug === undefined) {
      return undefined;
    }

    try {
      const page = await this.facade.getPage({ slug, fields: 'content' });
      const text = this.renderPageContent(page.title, page.content);

      return [{ uri, mimeType: 'text/markdown', text }];
    } catch (error: unknown) {
      if (error instanceof ApiErrorClass && error.statusCode === HTTP_NOT_FOUND) {
        // Контракт ResourceProvider: URI своей схемы, но ресурс не
        // существует — undefined, а не проброс ошибки (см. resource-provider.ts).
        return undefined;
      }
      throw error;
    }
  }

  listTemplates(): readonly McpResourceTemplate[] {
    return [
      {
        uriTemplate: `${PAGE_URI_PREFIX}{slug}`,
        name: 'wiki-page',
        title: 'Страница Wiki',
        description:
          'Полное содержимое страницы Wiki (YFM) по её slug, например users/docs/readme.',
        mimeType: 'text/markdown',
      },
    ];
  }

  /** Распарсить `wiki://page/{slug}` → slug, либо `undefined`, если URI чужой. */
  private parseSlug(uri: string): string | undefined {
    if (!uri.startsWith(PAGE_URI_PREFIX)) {
      return undefined;
    }
    const slug = uri.slice(PAGE_URI_PREFIX.length);
    return slug.length > 0 ? slug : undefined;
  }

  /** Отрендерить содержимое ресурса: заголовок + тело (или пометка «пусто»). */
  private renderPageContent(title: string, content: unknown): string {
    const body =
      typeof content === 'string' && content.length > 0
        ? content
        : '_Содержимое страницы недоступно или пусто._';

    return `# ${title}\n\n${body}`;
  }
}
