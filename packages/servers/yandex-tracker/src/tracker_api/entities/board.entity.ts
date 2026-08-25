/**
 * Доменный тип: Доска (Board) в Яндекс.Трекере
 *
 * Соответствует API v3: /v3/boards/{boardId}
 */

import type { WithUnknownFields } from './types.js';

/**
 * Колонка доски (упрощенная версия для вложенного объекта)
 */
export interface BoardColumn {
  /**
   * Идентификатор колонки
   *
   * Число, не строка: подтверждено боевым `GET` (§4.1 плана миграции v3,
   * `inventory/live-version-probe-2026-08-23.md`).
   */
  readonly id: number;

  /** Название колонки */
  readonly name: string;

  /** Статусы, относящиеся к этой колонке */
  readonly statuses?: ReadonlyArray<{
    readonly id: string;
    readonly key: string;
    readonly display: string;
  }>;
}

/**
 * Колонки, разделяющие данный `columnId` — общий предикат адресации колонки
 * доски. `id` колонки НЕ уникален внутри доски (боевое наблюдение, D11 —
 * `.agentic-planning/plan_tracker_fix_create_tools/0_CONTRACTS.md`), поэтому
 * и `create_board_column` (предупреждение о коллизии после создания), и
 * `update_board_column`/`delete_board_column` (отказ до мутации) матчат
 * колонки одним и тем же предикатом. Живёт при типе, а не в слое операций
 * (`api_operations/board-column/`), потому что инструменты (`src/tools/`)
 * не имеют права импортировать из `api_operations` напрямую
 * (depcruise: `server-tools-use-facade-only`) — `entities/` в исключениях
 * этого правила, как и в остальном сервере (см. `isTerminalBulkChangeStatus`
 * в `bulk-change.entity.ts` — тот же паттерн: чистый предикат над полем
 * сущности, доступный и tool-слою, и operations-слою).
 *
 * Сравнение строковое: `BoardColumn.id` — число, входной `columnId` — строка
 * (агент передаёт то же значение, что получил из ответа другого инструмента).
 */
export function findColumnsSharingId(
  columns: ReadonlyArray<WithUnknownFields<BoardColumn>>,
  columnId: string
): ReadonlyArray<WithUnknownFields<BoardColumn>> {
  return columns.filter((column) => String(column.id) === columnId);
}

/**
 * Фильтр доски (определяет какие задачи показываются на доске)
 */
export interface BoardFilter {
  /** Идентификатор фильтра */
  readonly id?: string;

  /** Название фильтра */
  readonly name?: string;

  /** Условия фильтра в виде query string */
  readonly query?: string;
}

/**
 * Референс на страну (для региональных настроек)
 */
export interface CountryRef {
  /** Идентификатор страны */
  readonly id: string;

  /** URL ссылка на страну в API */
  readonly self: string;

  /** Отображаемое название страны */
  readonly display: string;
}

/**
 * Доска в Яндекс.Трекере
 *
 * ВАЖНО: Типизация основана на официальном Python SDK и реальных ответах API v3.
 * Обязательные поля (без ?) всегда присутствуют в ответе GET /v3/boards/{boardId}.
 * Опциональные поля могут отсутствовать в зависимости от настроек доски.
 */
export interface Board {
  /**
   * Идентификатор доски (всегда присутствует)
   *
   * Число, не строка: подтверждено боевым `GET` (§4.1 плана миграции v3,
   * `inventory/live-version-probe-2026-08-23.md`).
   */
  readonly id: number;

  /** URL ссылка на доску в API (всегда присутствует) */
  readonly self: string;

  /** Версия доски (для оптимистичных блокировок) (всегда присутствует) */
  readonly version: number;

  /** Название доски (всегда присутствует) */
  readonly name: string;

  /** Колонки доски (может отсутствовать или быть пустым массивом) */
  readonly columns?: ReadonlyArray<BoardColumn>;

  /** Фильтр доски (может отсутствовать) */
  readonly filter?: BoardFilter;

  /** Поле для сортировки задач на доске (может отсутствовать) */
  readonly orderBy?: string;

  /** Порядок сортировки: true = по возрастанию, false = по убыванию (может отсутствовать) */
  readonly orderAsc?: boolean;

  /** Query string для фильтрации задач (может отсутствовать) */
  readonly query?: string;

  /** Выбранные параметры отображения (может отсутствовать) */
  readonly selected?: unknown;

  /** Использовать ранжирование задач (может отсутствовать) */
  readonly useRanking?: boolean;

  /** Страна для региональных настроек (может отсутствовать) */
  readonly country?: CountryRef;
}

/**
 * Доска с возможными unknown полями из API.
 * Используется при получении данных от API Трекера.
 */
export type BoardWithUnknownFields = WithUnknownFields<Board>;
