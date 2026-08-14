/**
 * ResourceProvider для комментариев страницы Wiki (пакет 7.2.D плана
 * модернизации MCP 2026-07-28). Схема URI:
 * `wiki://page-comment/{pageId}/{commentId}`.
 *
 * ПОЧЕМУ ОТДЕЛЬНЫЙ ПРОВАЙДЕР, А НЕ `wiki://page/{slug}` ИЛИ
 * `wiki://page-resource/...`.
 *
 * Комментарий — не страница (нет slug) и не Resource в смысле
 * `GET /pages/{id}/resources` (вложение/grid/sharepoint) — отдельная API-
 * область (`/pages/{id}/comments`). Нужен собственный URI, иначе
 * `GetCommentsTool`/`GetCommentThreadTool` в режиме `links`
 * (`BaseTool.formatCollectionResult`) не смогут построить осмысленную
 * ссылку: `wiki://page/{slug}` вернул бы ВСЮ страницу, а не текст
 * конкретного комментария.
 *
 * ЧТЕНИЕ ЧЕРЕЗ ПОВТОРНЫЙ ЗАПРОС СПИСКА, А НЕ "GET ОДНОГО КОММЕНТАРИЯ".
 *
 * В документированной части API нет эндпоинта «получить один комментарий по
 * id» — только список (`GET /pages/{id}/comments`, до 100 на страницу) и
 * тред (`GET /pages/{id}/comments/{id}/thread`). `readResource` поэтому
 * запрашивает ПЕРВУЮ страницу списка (page_size=100, без курсора) и ищет
 * совпадение по id — тот же паттерн упрощения, что уже применён в
 * `WikiPageItemResourceProvider` (поиск вложения по имени через `q`, без
 * прохода по всем страницам). Комментарий за пределами первых 100 (по
 * `created_at asc`) этим провайдером не резолвится — задокументированное
 * ограничение, не скрытый баг.
 */

import { ApiErrorClass } from '@fractalizer/mcp-infrastructure';
import type {
  ResourceProvider,
  ResourceListPage,
  McpResourceContents,
  McpResourceTemplate,
} from '@fractalizer/mcp-core';
import type { YandexWikiFacade } from '#wiki_api/facade/index.js';

const URI_PREFIX = 'wiki://page-comment/';
const URI_PATTERN = /^wiki:\/\/page-comment\/(\d+)\/(\d+)$/;
const HTTP_NOT_FOUND = 404;
/** Верхний предел выдачи одного запроса списка (максимум API — 100). */
const LIST_PAGE_SIZE = 100;

/** Построить URI комментария из идентифицирующих его частей. */
export function buildPageCommentResourceUri(pageId: number, commentId: number): string {
  return `${URI_PREFIX}${pageId}/${commentId}`;
}

export class WikiPageCommentResourceProvider implements ResourceProvider {
  public readonly id = 'wiki-page-comments';

  constructor(private readonly facade: YandexWikiFacade) {}

  listResources(): ResourceListPage {
    // См. заголовок файла и симметричные решения в
    // WikiPageResourceProvider/WikiPageItemResourceProvider — провайдер
    // привязан к конкретной странице через URI, честного глобального обзора
    // без такого параметра нет.
    return { resources: [] };
  }

  async readResource(uri: string): Promise<readonly McpResourceContents[] | undefined> {
    const parsed = this.parseUri(uri);
    if (parsed === undefined) {
      return undefined;
    }

    try {
      const response = await this.facade.getComments({
        idx: parsed.pageId,
        page_size: LIST_PAGE_SIZE,
      });

      const match = response.results.find((comment) => comment.id === parsed.commentId);
      if (match === undefined) {
        return undefined;
      }

      return [{ uri, mimeType: 'application/json', text: JSON.stringify(match, null, 2) }];
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
        uriTemplate: `${URI_PREFIX}{pageId}/{commentId}`,
        name: 'wiki-page-comment',
        title: 'Комментарий к странице Wiki',
        description:
          'Один комментарий страницы Wiki по id. Резолвится только среди первых ' +
          `${LIST_PAGE_SIZE} комментариев страницы (по created_at asc) — см. заголовок ` +
          'wiki-page-comment-resource.provider.ts.',
        mimeType: 'application/json',
      },
    ];
  }

  private parseUri(uri: string): { pageId: number; commentId: number } | undefined {
    const match = URI_PATTERN.exec(uri);
    if (match === null) {
      return undefined;
    }
    const pageIdRaw = match[1];
    const commentIdRaw = match[2];
    if (pageIdRaw === undefined || commentIdRaw === undefined) {
      return undefined;
    }
    return { pageId: Number(pageIdRaw), commentId: Number(commentIdRaw) };
  }
}
