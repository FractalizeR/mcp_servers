import { z } from 'zod';

/**
 * Schema для дополнительных полей ответа (sparse fieldset Wiki API).
 *
 * ГДЕ ИСПОЛЬЗУЕТСЯ И ПОЧЕМУ НЕ ВЕЗДЕ (L8, аудит REVIEW_MCP_SDK_FINDINGS.md).
 *
 * `fields` — это API-уровневый параметр Wiki API (`?fields=content,...`),
 * а не общий клиентский механизм проекции. По документации он существует
 * ТОЛЬКО у одиночных GET-эндпоинтов сущности — `GET /pages/{id}` и
 * `GET /grids/{id}` (см. `yw_get_page`/`yw_get_page_by_id`/`yw_get_grid`,
 * единственные потребители `WikiFieldsSchema`): без него ответ по умолчанию
 * не несёт дорогие поля (`content`, `attributes`, `breadcrumbs`, `redirect`),
 * `fields` явно включает нужные.
 *
 * У списочных/коллекционных эндпоинтов (`GET /pages/{id}/comments`,
 * `GET /pages/{id}/comments/{id}/thread`, `GET /pages/{id}/descendants`,
 * `GET /search`, `GET /pages/{id}/resources`) Wiki API sparse-fieldset НЕ
 * поддерживает вовсе — сервер всегда возвращает полный объект. Поэтому у
 * `yw_get_comments`/`yw_get_comment_thread`/`yw_get_descendants`/`yw_search`/
 * `yw_get_resources` параметра `fields` в схеме нет: это не упущение, а
 * отражение реального контракта API — добавление параметра, который ничего
 * не фильтрует на сервере, было бы вводящим в заблуждение.
 */
export const WikiFieldsSchema = z
  .string()
  .optional()
  .describe('Дополнительные поля через запятую: attributes, breadcrumbs, content, redirect');
