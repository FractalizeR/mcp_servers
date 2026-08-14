/**
 * Общий хелпер сериализации содержимого ресурса Трекера в текстовый
 * `McpResourceContents` (JSON). Все три провайдера (issue/queue/project)
 * отдают сущность целиком как JSON — единственное место, где решается ЧТО
 * значит «содержимое ресурса» для Трекера (полная сущность API, без
 * фильтрации по `fields` — в отличие от MCP tools, у ресурса нет параметра
 * `fields`: агент читает ресурс целиком, а решение «сколько токенов тратить»
 * остаётся за режимом `links`/`full` инструмента, который на этот ресурс
 * сослался).
 */

import type { McpResourceContents } from '@fractalizer/mcp-core';

export function buildJsonResourceContents(
  uri: string,
  data: unknown
): readonly McpResourceContents[] {
  return [
    {
      uri,
      mimeType: 'application/json',
      text: JSON.stringify(data, null, 2),
    },
  ];
}
