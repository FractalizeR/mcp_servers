/**
 * Доменный тип: Entity API Яндекс.Трекера (Goal/Project/Portfolio)
 *
 * Соответствует API v3: /v3/entities/{entityType}/{id}
 *
 * ВАЖНО — не путать с двумя другими "проектами" в этом сервере:
 * - `Project` (`project.entity.ts`) — LEGACY-коллекция `/v3/projects`, уже
 *   покрытая `get_project(s)`/`create_project`/... Отдельная сущность со
 *   своими числовыми ID. «LEGACY» здесь про более старый REST-ресурс, а не
 *   про версию пути в URL — обе коллекции лежат на v3.
 * - `EntityApiRecord` здесь (`entityType: 'project'`) — Project ВНУТРИ Entity
 *   API (`/v3/entities/project/{id}`), появившийся в Трекере отдельно и
 *   имеющий другое пространство идентификаторов (`shortId`/`id`).
 * Инструменты Entity API называются `*_entity` (не `*_project`) и в
 * description явно помечены как "Entity API", чтобы не смешивать эти две
 * сущности при выборе инструмента.
 *
 * ВАЖНО про происхождение типизации: официальная документация Трекера НЕ
 * описывает тело create/update Entity API (страниц `api-ref/entities/*` не
 * существует — см. отчёт задачи). Референсный клиент (`collections.py`,
 * класс `Entity`/`Goal`/`Project`/`Portfolio`) тоже не фиксирует список
 * полей: базовый `Collection.create()` шлёт `**kwargs` как есть, без
 * allowlist. Поэтому ниже типизированы только поля, которые ТОЧНО
 * присутствуют в ответе (`fields` базового класса `Entity` в клиенте:
 * id/self/version/shortId/entityType/createdBy/createdAt/updatedAt/
 * attachments) и общеупотребимое `name`/`description` (есть у Board/Sprint/
 * Queue/legacy-Project — обоснованное предположение, не подтверждённое
 * документацией для ИМЕННО Entity API). Всё остальное — через
 * `WithUnknownFields`/`extraFields` на входе (см. DTO).
 */

import type { WithUnknownFields } from './types.js';
import type { UserRef } from './common/user-ref.entity.js';

/**
 * Тип Entity API — различает три коллекции с общей формой запроса.
 */
export type EntityApiType = 'goal' | 'project' | 'portfolio';

/**
 * Дедлайн key result'а цели (Goal.keyResultItems[].deadline).
 */
export interface KeyResultDeadline {
  /** Дата в формате YYYY-MM-DD */
  readonly date: string;

  /** Тип дедлайна (клиент передаёт 'date' по умолчанию) */
  readonly deadlineType: string;
}

/**
 * Прогресс key result'а типа 'value' (измеряемый метрикой).
 */
export interface KeyResultProgress {
  readonly start: number;
  readonly end: number;
  readonly current?: number;
}

/**
 * Key Result — элемент `keyResultItems` цели (Goal, OKR-метрика).
 *
 * Форма подтверждена референсным клиентом (`Goal._build_key_result_item`/
 * `_normalize_key_result`, `collections.py`, добавлено 2026-08-10).
 */
export interface KeyResultItem {
  /** Идентификатор элемента (только в ответе; при `set` API перегенерирует id) */
  readonly id?: string;

  /** Тип key result'а: завершение (binary) или измеряемая метрика (value) */
  readonly type: 'binary' | 'value';

  /** Текст key result'а */
  readonly text: string;

  /** Исполнитель (в ответе — объект пользователя; на вход — login/uid) */
  readonly assignee?: UserRef | string;

  /** Дедлайн */
  readonly deadline?: KeyResultDeadline;

  /** Прогресс (для type='value') */
  readonly progress?: KeyResultProgress;

  /** Признак завершения (для type='binary') */
  readonly achieved?: boolean;
}

/**
 * Запись Entity API (Goal/Project/Portfolio) — общая часть.
 *
 * Обязательные поля — из `Entity.fields` референсного клиента (всегда
 * присутствуют в ответе). `name`/`description` — обоснованное предположение
 * по аналогии с остальными именованными сущностями Трекера, не подтверждено
 * официальной документацией именно для Entity API (см. заголовок файла).
 */
export interface EntityApiRecord {
  /** Идентификатор записи (всегда присутствует) */
  readonly id: string;

  /** URL ссылка на запись в API (всегда присутствует) */
  readonly self: string;

  /** Версия записи для оптимистичных блокировок (всегда присутствует) */
  readonly version: number;

  /**
   * Короткий отображаемый идентификатор (всегда присутствует).
   * API возвращает его ЧИСЛОМ (подтверждено живой пробой 2026-08-16).
   */
  readonly shortId: number;

  /** Тип записи — совпадает с entityType запроса (всегда присутствует) */
  readonly entityType: EntityApiType;

  /** Автор записи (всегда присутствует) */
  readonly createdBy: UserRef;

  /** Дата и время создания ISO 8601 (всегда присутствует) */
  readonly createdAt: string;

  /** Дата и время последнего обновления ISO 8601 (всегда присутствует) */
  readonly updatedAt?: string;

  /** Вложения (может отсутствовать/быть пустым) */
  readonly attachments?: unknown[];

  /**
   * Кастомные поля записи (всегда объект; содержимое зависит от entityType).
   * `summary` — обязательное поле при create (подтверждено живой пробой:
   * `name`/`description` в Entity API НЕ существуют, поле 422 «поля [name] не
   * существуют»). Отдаётся только при явном запросе поля через `fields=...`.
   */
  readonly fields?: Record<string, unknown>;

  /** Key Results цели — присутствуют только у entityType='goal' при явном fields=keyResultItems */
  readonly keyResultItems?: readonly KeyResultItem[];
}

/**
 * Запись Entity API с возможными unknown полями из API.
 */
export type EntityApiRecordWithUnknownFields = WithUnknownFields<EntityApiRecord>;

/**
 * Key Result с возможными unknown полями из API.
 */
export type KeyResultItemWithUnknownFields = WithUnknownFields<KeyResultItem>;
