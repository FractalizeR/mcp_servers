/**
 * `ResourceProvider` для задач Трекера — схема `tracker://issue/{key}`
 * (пакет 5.1.C.tracker плана модернизации MCP 2026-07-28).
 *
 * НЕ ПЕРЕЧИСЛЯЕТ задачи в `listResources()` — намеренно, а не недосмотр.
 * У Трекера нет естественного «списка всех задач»: в отличие от очередей и
 * проектов (ограниченные, обозримые множества — см. `queue-resource-
 * provider.ts`/`project-resource-provider.ts`), задачи считаются сотнями и
 * тысячами и требуют критериев поиска (`find_issues`). Перечислять их без
 * фильтра — ровно тот антипаттерн, о котором явно предупреждает план
 * («соблазн сделать ресурсом всё подряд»): реестр ресурсов — не замена
 * `find_issues`. `readResource()` при этом разрешает ЛЮБОЙ ключ задачи
 * напрямую (контракт `ResourceProvider` это прямо требует) — именно так
 * агент подтягивает тело задачи по `resource_link`, который `find_issues`
 * вернул в режиме `links` (см. `tools/api/issues/find/find-issues.tool.ts`).
 */

import { ApiErrorClass } from '@fractalizer/mcp-infrastructure';
import type {
  ResourceProvider,
  ResourceListPage,
  McpResourceContents,
  McpResourceTemplate,
} from '@fractalizer/mcp-core';
import type { YandexTrackerFacade } from '#tracker_api/facade/index.js';
import { parseIssueResourceUri, ISSUE_URI_TEMPLATE } from './tracker-resource-uri.js';
import { buildJsonResourceContents } from './json-resource-contents.util.js';

export class IssueResourceProvider implements ResourceProvider {
  public readonly id = 'tracker-issues';

  constructor(private readonly facade: YandexTrackerFacade) {}

  /** Всегда пустая страница без `nextCursor` — см. комментарий заголовка файла. */
  listResources(): ResourceListPage {
    return { resources: [] };
  }

  async readResource(uri: string): Promise<readonly McpResourceContents[] | undefined> {
    const issueKey = parseIssueResourceUri(uri);
    if (issueKey === undefined) {
      return undefined;
    }

    const [result] = await this.facade.getIssues([issueKey]);
    if (result === undefined) {
      return undefined;
    }

    if (result.status === 'fulfilled') {
      return buildJsonResourceContents(uri, result.value);
    }

    // Batch-результат: `reason` — Error, обычно ApiErrorClass с реальным
    // statusCode API. 404 → «такого URI нет», это НЕ ошибка уровня
    // провайдера (см. контракт readResource в resource-provider.ts).
    // Любая другая ошибка (сеть, 5xx) — пробрасываем: молча превращать
    // временный сбой API в «ресурс не найден» было бы неверно.
    if (result.reason instanceof ApiErrorClass && result.reason.statusCode === 404) {
      return undefined;
    }
    throw result.reason;
  }

  listTemplates(): readonly McpResourceTemplate[] {
    return [
      {
        uriTemplate: ISSUE_URI_TEMPLATE,
        name: 'tracker-issue',
        title: 'Задача Трекера',
        description:
          'Задача Яндекс.Трекера по ключу (например, PROJ-123), полное содержимое (JSON)',
        mimeType: 'application/json',
      },
    ];
  }
}
