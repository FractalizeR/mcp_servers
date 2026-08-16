/**
 * Режим ответа инструментов, возвращающих коллекции (пакет 5.1.B плана
 * модернизации MCP 2026-07-28).
 *
 * ПРОБЛЕМА: `find_issues` на 200 задач вываливает 200 полных объектов в
 * контекст модели — дорого и вытесняет всё остальное.
 *
 * РЕШЕНИЕ: инструмент отдаёт либо полные тела элементов (`full`), либо
 * компактную сводку + массив `resource_link` (`links`) — тело каждого
 * элемента агент подтягивает выборочно через `resources/read` (кешируется
 * по `ttlMs`). Режим — параметр САМОГО инструмента (см.
 * `collectionResponseModeParamSchema`), не глобальная настройка сервера:
 * агент сам знает, нужны ли ему тела прямо сейчас.
 *
 * ПОРОГ ПО УМОЛЧАНИЮ (режим `auto`): {@link DEFAULT_COLLECTION_LINKS_THRESHOLD}.
 * Для маленьких коллекций ссылки — чистый проигрыш (лишний круг
 * «список → resources/read» на то, что и так поместилось бы целиком),
 * поэтому `auto` считает элементы и переключается на `links` только когда
 * их больше порога.
 */

import { z } from 'zod';

/**
 * Порог количества элементов для режима `auto`: `itemsOnPage <= threshold`
 * ⇒ тела инлайном, `itemsOnPage > threshold` ⇒ `resource_link`.
 *
 * ОБОСНОВАНИЕ ЗНАЧЕНИЯ (20): типичная сводка одной сущности (issue/page/
 * task) в JSON — примерно 150–400 токенов в зависимости от набора полей.
 * При 20 элементах это ~3–8 тыс. токенов — заметная, но всё ещё разумная
 * часть контекстного окна. Именно к таким объёмам (десятки, не сотни)
 * относится типичный список из одного запроса без явной пагинации. Выше
 * этого порога (сотни элементов — ровно кейс `find_issues` на 200 задач из
 * плана) экономия от ссылок доминирует над стоимостью лишнего круга
 * `resources/read`. Значение — компромисс, не измеренный оптимум; инструмент
 * волен переопределить порог под свою предметную область, передав
 * `threshold` явно (тогда он ОБЯЗАН быть виден в описании инструмента —
 * `collectionResponseModeParamSchema` формирует описание автоматически).
 */
export const DEFAULT_COLLECTION_LINKS_THRESHOLD = 20;

/** Режим ответа: `auto` — по порогу, `links`/`full` — принудительно. */
export const CollectionResponseModeSchema = z.enum(['auto', 'links', 'full']);
export type CollectionResponseMode = z.infer<typeof CollectionResponseModeSchema>;

/** Фактически применённый режим ответа (после разрешения `auto`). */
export type ResolvedCollectionResponseMode = 'links' | 'full';

/**
 * Разрешить режим `auto` в фактический (`links`/`full`) по количеству
 * элементов и порогу. `links`/`full` проходят как есть (принудительный
 * выбор агента побеждает порог).
 */
export function resolveCollectionResponseMode(
  mode: CollectionResponseMode,
  itemCount: number,
  threshold: number = DEFAULT_COLLECTION_LINKS_THRESHOLD
): ResolvedCollectionResponseMode {
  if (mode === 'links' || mode === 'full') {
    return mode;
  }
  return itemCount > threshold ? 'links' : 'full';
}

/**
 * Построить Zod-схему параметра `responseMode` для инструмента,
 * возвращающего коллекцию. Описание ОБЯЗАНО называть порог явно (граничное
 * условие плана: «порог должен быть виден в описании инструмента») —
 * функция делает это автоматически, поэтому инструменту не нужно
 * дублировать число в своём собственном тексте.
 *
 * @param options.threshold - порог режима `auto` для ЭТОГО инструмента
 *   (по умолчанию {@link DEFAULT_COLLECTION_LINKS_THRESHOLD}); передавайте
 *   явно, если предметная область требует другого значения.
 * @param options.itemsNoun - существительное во множественном числе в
 *   родительном падеже для текста описания (например, «задач», «страниц»).
 */
export function collectionResponseModeParamSchema(options?: {
  threshold?: number;
  itemsNoun?: string;
}): z.ZodDefault<typeof CollectionResponseModeSchema> {
  const threshold = options?.threshold ?? DEFAULT_COLLECTION_LINKS_THRESHOLD;
  const itemsNoun = options?.itemsNoun ?? 'элементов';

  return CollectionResponseModeSchema.default('auto').describe(
    `Режим возврата коллекции. "auto" (по умолчанию): полные тела при ≤${threshold} ` +
      `${itemsNoun} в ответе, иначе — компактные ссылки resource_link (тело каждого ` +
      `элемента читается отдельно через resources/read, результат кешируется). ` +
      `"links": всегда только ссылки, даже для маленького результата — используйте, ` +
      `если тела точно не нужны. "full": всегда полные тела, даже для большого ` +
      `результата — используйте, если нужны данные всех элементов сразу.`
  );
}
