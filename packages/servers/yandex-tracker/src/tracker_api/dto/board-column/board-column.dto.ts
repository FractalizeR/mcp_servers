/**
 * DTO для операций с колонками доски (Board Columns)
 *
 * API: /v3/boards/{boardId}/columns
 *
 * ВАЖНО: имена намеренно НЕ совпадают с `CreateBoardColumnDto` из
 * `dto/board/create-board.dto.ts` — тот описывает НЕСТРОГО ту же форму, но
 * как вложенный объект при создании доски целиком (`CreateBoardDto.columns`),
 * а не как отдельный CRUD-эндпоинт `/v3/boards/{boardId}/columns`. Разные
 * DTO для разных операций, совпадение имён дало бы конфликт экспортов в
 * `dto/index.ts`.
 */

export interface GetBoardColumnsDto {
  /** Идентификатор доски */
  boardId: string;
}

export interface CreateStandaloneBoardColumnDto {
  /** Идентификатор доски */
  boardId: string;

  /** Название колонки */
  name: string;

  /** Ключи статусов, входящих в колонку */
  statuses: string[];
}

export interface UpdateBoardColumnDto {
  /** Идентификатор доски */
  boardId: string;

  /** Идентификатор колонки */
  columnId: string;

  /** Новое название колонки (опционально) */
  name?: string | undefined;

  /** Новый список ключей статусов (опционально) */
  statuses?: string[] | undefined;

  /** Лимит задач в колонке (WIP-лимит, опционально) */
  limit?: number | undefined;
}

export interface DeleteBoardColumnDto {
  /** Идентификатор доски */
  boardId: string;

  /** Идентификатор колонки */
  columnId: string;
}
