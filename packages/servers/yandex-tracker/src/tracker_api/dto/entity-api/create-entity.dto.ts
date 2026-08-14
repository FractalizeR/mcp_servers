/**
 * DTO для создания записи Entity API (Goal/Project/Portfolio)
 *
 * ВАЖНО: официальная документация НЕ описывает тело запроса Entity API (нет
 * страниц `api-ref/entities/*`), а референсный клиент шлёт `**kwargs` без
 * allowlist (`Collection.create`). `name` — обоснованное предположение по
 * аналогии с остальными именованными сущностями Трекера. `extraFields` —
 * открытый passthrough для полей, специфичных для конкретного entityType
 * (например, `parentEntity`/`teamUsers`/`author`/`deadline`), форма которых
 * не зафиксирована ни доком, ни клиентом — агент передаёт их как есть.
 */

import type { EntityApiType } from '#tracker_api/entities/index.js';

export interface CreateEntityDto {
  /** Тип создаваемой записи Entity API */
  entityType: EntityApiType;

  /** Название записи */
  name: string;

  /** Описание записи (опционально) */
  description?: string | undefined;

  /**
   * Дополнительные поля тела запроса, специфичные для entityType
   * (например `parentEntity`, `teamUsers`, `author`) — форма не
   * зафиксирована документацией, передаётся как есть.
   */
  extraFields?: Record<string, unknown> | undefined;
}
