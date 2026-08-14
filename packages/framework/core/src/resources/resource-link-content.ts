/**
 * `resource_link` content-block (пакет 5.1.B плана модернизации MCP
 * 2026-07-28) — облегчённая ссылка на ресурс внутри `content` результата
 * инструмента, в отличие от полноценного `resource` (со встроенным
 * содержимым). Инструменты, возвращающие коллекции, используют этот блок
 * вместо полных тел элементов, когда включён режим ссылок (см.
 * `../tools/common/collection-result/` — там же порог и переключение
 * режимов). Тело ресурса агент подтягивает отдельно через `resources/read`
 * (`ResourceRegistry.readResource()`), результат которого кешируется по
 * `ttlMs`.
 *
 * Форма полей зеркалит `McpResource` из resource-provider.ts (uri/name/
 * title/description/mimeType/size) — единственный источник истины по
 * составу полей ресурса один, `resource_link` — его проекция в content-блок.
 *
 * КОНТРАКТ URI: `uri`, попавший в этот блок, НЕ обязан фигурировать в
 * `resources/list` того же сервера — спека 2026-07-28 это прямо разрешает
 * (ресурс может быть вычисляемым/адресуемым без перечисления). Схемы URI
 * трёх серверов (`tracker://issue/{key}`, `tracker://queue/{key}`,
 * `tracker://project/{id}`, `wiki://page/{slug}`, `ticktick://task/{id}`,
 * `ticktick://project/{id}`) спроектированы планом (раздел 5.1.B) и будут
 * реализованы провайдерами следующей волны (пакет 5.1.C) — этот модуль
 * НЕ знает и не должен знать о конкретных схемах: `uri` — произвольная
 * строка, которую строит вызывающий инструмент через `toResourceLink()`.
 */

/**
 * Один content-блок `resource_link` результата инструмента.
 *
 * Индексная сигнатура `[key: string]: unknown` — структурное зеркало
 * `ToolResourceLinkContentBlock` из `@fractalizer/mcp-infrastructure`
 * (`ToolResult.content`), а не собственная потребность этого типа: без неё
 * `exactOptionalPropertyTypes` считает типы несовместимыми при присваивании
 * в `ToolResult.content`.
 */
export interface ResourceLinkContentBlock {
  readonly type: 'resource_link';
  readonly uri: string;
  readonly name: string;
  readonly title?: string;
  readonly description?: string;
  readonly mimeType?: string;
  readonly size?: number;
  readonly [key: string]: unknown;
}

/**
 * Данные, необходимые и достаточные для построения
 * {@link ResourceLinkContentBlock}, без дискриминатора `type` — то, что
 * строит вызывающий код (см. `toResourceLink` в `formatCollectionResult`).
 *
 * Объявлен отдельным интерфейсом, а не `Omit<ResourceLinkContentBlock,
 * 'type'>`: у `ResourceLinkContentBlock` есть индексная сигнатура (см. её
 * комментарий), а `Omit` над типом с индексной сигнатурой в TypeScript
 * теряет литеральные имена полей (`keyof` типа с индексной сигнатурой по
 * строке — это `string` целиком, а не объединение конкретных имён) —
 * `Omit` в этом случае вернул бы тип без `uri`/`name` как обязательных
 * полей. Проверено эмпирически при первой попытке — `tsc` терял `uri`/
 * `name` из результата.
 */
export interface ResourceLinkDescriptor {
  readonly uri: string;
  readonly name: string;
  readonly title?: string;
  readonly description?: string;
  readonly mimeType?: string;
  readonly size?: number;
}

/** Построить content-блок `resource_link` из дескриптора ресурса. */
export function buildResourceLinkContentBlock(
  descriptor: ResourceLinkDescriptor
): ResourceLinkContentBlock {
  return { type: 'resource_link', ...descriptor };
}
