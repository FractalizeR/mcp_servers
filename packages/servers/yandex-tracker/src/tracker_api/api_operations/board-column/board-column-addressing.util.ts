/**
 * Адресуемость колонки доски по `columnId` для `update_board_column`/
 * `delete_board_column` — отказ ДО мутации, если `columnId` не адресует
 * ровно одну колонку доски. Матчинг-предикат (`findColumnsSharingId`) —
 * общий с `create_board_column` (та же коллизия id, только предупреждение,
 * а не отказ — create не может "не создать", сервер уже назначил id) —
 * живёт в `entities/board.entity.ts`, а не здесь: инструментам (`src/tools/`)
 * запрещено импортировать из `api_operations` напрямую (depcruise
 * `server-tools-use-facade-only`), а `entities/` — в исключениях этого
 * правила. Здесь остаётся только то, что операциям и нужно как раз для
 * ИХ роли — I/O (`GET`) и отказ (`throw`) ДО мутации.
 *
 * `id` колонки НЕ уникален внутри доски (боевое наблюдение, D11 —
 * `.agentic-planning/plan_tracker_fix_create_tools/0_CONTRACTS.md`): на доске
 * с колонками `1,2,3` создание отдало четвёртую тоже с `id: 1`. `PATCH` по
 * `columnId: 1` после этого менял первую попавшуюся колонку с этим `id`
 * (чужую), а `DELETE` убивал сразу обе. Отказ вместо угадывания — решение
 * пользователя, не деталь реализации.
 */

import type { IHttpClient } from '@fractalizer/mcp-infrastructure';
import { findColumnsSharingId } from '#tracker_api/entities/index.js';
import type { BoardColumn } from '#tracker_api/entities/index.js';
import type { WithUnknownFields } from '#tracker_api/entities/types.js';

/**
 * Бросает `Error` с человекочитаемым объяснением отказа, если `columnId` не
 * адресует ровно одну колонку доски (нет / несколько кандидатов). Возвращает
 * `void` — обеим вызывающим операциям (update/delete) сама колонка не нужна,
 * им важен только факт однозначности перед PATCH/DELETE по `columnId`.
 */
function assertUnambiguous(
  matches: ReadonlyArray<WithUnknownFields<BoardColumn>>,
  boardId: string,
  columnId: string
): void {
  if (matches.length === 0) {
    throw new Error(`Колонка ${columnId} доски ${boardId} не найдена`);
  }

  if (matches.length > 1) {
    const candidateNames = matches.map((column) => `"${column.name}"`).join(', ');
    throw new Error(
      `Колонка ${columnId} доски ${boardId} адресована неоднозначно: на доске ` +
        `${String(matches.length)} колонки с id=${columnId} (${candidateNames}). ` +
        `id колонки не гарантированно уникален внутри доски — адресовать нужную ` +
        `колонку по одному только id нечем, а обратиться по другому признаку ` +
        `(например, названию) update_board_column/delete_board_column не умеют. ` +
        `Разрешить коллизию можно только вне этого набора инструментов — например, ` +
        `переименовав одну из колонок через веб-интерфейс Трекера, где колонки ` +
        `видны и различимы, — и повторить запрос.`
    );
  }
}

/**
 * Читает колонки доски и отказывает, если `columnId` не адресует ровно одну
 * из них — единственная точка чтения `GET /v3/boards/{boardId}/columns` для
 * `update_board_column`/`delete_board_column` (не через `GetBoardColumnsOperation`:
 * та возвращает `PaginatedResult` для tool-фасада списка, здесь нужен только
 * факт однозначности перед мутацией — разные потребители одного эндпоинта).
 */
export async function ensureColumnAddressable(
  httpClient: IHttpClient,
  boardId: string,
  columnId: string
): Promise<void> {
  const columns = await httpClient.get<Array<WithUnknownFields<BoardColumn>>>(
    `/v3/boards/${boardId}/columns`
  );
  assertUnambiguous(findColumnsSharingId(columns, columnId), boardId, columnId);
}
