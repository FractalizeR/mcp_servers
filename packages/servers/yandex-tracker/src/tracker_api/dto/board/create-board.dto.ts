/**
 * DTO для создания доски в Яндекс.Трекере
 *
 * Форма соответствует `POST /v3/liveBoards/` (0_CONTRACTS.md, D9): устаревший
 * `POST /v3/boards` создаёт доску с параметрами по умолчанию и молча игнорирует тело.
 */

/**
 * Колонка доски при создании
 */
export interface CreateBoardColumnDto {
  /** Название колонки */
  name: string;

  /** Массив ключей статусов для этой колонки */
  statuses: string[];

  /** Ограничение количества задач в колонке (WIP-лимит) */
  limit?: number | undefined;
}

/**
 * Бэклог-/непараметризованная колонка при создании (без привязки к статусам)
 */
export interface CreateBoardBacklogColumnDto {
  /** Название колонки */
  name: string;

  /** Ограничение количества задач в колонке (WIP-лимит) */
  limit?: number | undefined;
}

/**
 * Значение поля `queue` внутри `autoFilters.addFilter.liveFilter.fieldValues` —
 * ссылка на очередь по фиксированному значению. `enabled` сюда не входит: он —
 * брат `liveFilter` внутри `addFilter`, а не ключ элемента массива значений
 * (документация Трекера, `api-ref/boards/post-board`).
 */
export interface CreateBoardQueueFilterValueDto {
  /** Ключ очереди */
  fixed: string;
}

/**
 * Автофильтры доски при создании. Здесь, а не полем верхнего уровня, задаётся
 * привязка доски к очереди (0_CONTRACTS.md, D9).
 */
export interface CreateBoardAutoFiltersDto {
  addFilter?:
    | {
        liveFilter?:
          | {
              fieldValues?: Record<string, unknown> | undefined;
            }
          | undefined;

        /** Включён ли фильтр (брат `liveFilter`, а не элемента `fieldValues`) */
        enabled?: boolean | undefined;
      }
    | undefined;

  removeFilter?: Record<string, unknown> | undefined;

  /** Дополнительные поля */
  [key: string]: unknown;
}

export interface CreateBoardDto {
  /** Название доски */
  name: string;

  /** Логин/uid владельца доски */
  owner?: string | undefined;

  /** Шаблон прав доступа: приватная или публичная доска (по умолчанию `public`) */
  boardPermissionsTemplate?: 'private' | 'public' | undefined;

  /** Доступность бэклога на доске */
  backlogAvailable?: boolean | undefined;

  /** Доступность спринтов на доске (без него на доске нельзя завести спринт) */
  sprintsAvailable?: boolean | undefined;

  /** Колонки доски, привязанные к статусам */
  columns?: CreateBoardColumnDto[] | undefined;

  /** Колонки бэклога */
  backlogColumns?: CreateBoardBacklogColumnDto[] | undefined;

  /** Непараметризованные колонки */
  nonParametrizedColumns?: CreateBoardBacklogColumnDto[] | undefined;

  /** Автофильтры доски — здесь же задаётся привязка к очереди */
  autoFilters?: CreateBoardAutoFiltersDto | undefined;

  /** Дополнительные поля */
  [key: string]: unknown;
}
