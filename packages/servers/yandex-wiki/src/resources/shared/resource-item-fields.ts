/**
 * Безопасное извлечение "имени" вложенного `item` ресурса Wiki
 * (`Resource.item` типизирован как `unknown` — форма зависит от `type`,
 * см. `#wiki_api/entities/resource.entity.ts`).
 *
 * Используется и на запись resource_link (`toResourceLink` в
 * `GetResourcesTool`), и на чтение (`WikiPageItemResourceProvider.readResource`)
 * — единственный источник истины по тому, как «имя» ресурса извлекается из
 * произвольного `item`, чтобы обе стороны URI (`wiki://page-resource/...`)
 * строили и разбирали его одинаково.
 */

/** Type guard: значение — объект (не `null`, не массив). */
function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Достать человекочитаемое имя элемента ресурса. Реальная форма `item` не
 * документирована в типах (см. заголовок файла), поэтому перебираем
 * правдоподобные поля в порядке приоритета: `name` (вложения), `title`
 * (таблицы/страницы), иначе — `undefined` (вызывающий код обязан обработать
 * это как «не удалось построить стабильный URI»).
 */
export function extractResourceItemName(item: unknown): string | undefined {
  if (!isPlainObject(item)) {
    return undefined;
  }

  const name = item['name'];
  if (typeof name === 'string' && name.length > 0) {
    return name;
  }

  const title = item['title'];
  if (typeof title === 'string' && title.length > 0) {
    return title;
  }

  return undefined;
}

/**
 * Достать размер элемента ресурса в байтах, если он присутствует (обычно —
 * только у вложений). Используется в `resource_link.size`, чтобы клиент мог
 * оценить объём тела до `resources/read`, не читая его.
 */
export function extractResourceItemSize(item: unknown): number | undefined {
  if (!isPlainObject(item)) {
    return undefined;
  }

  const size = item['size'];
  return typeof size === 'number' ? size : undefined;
}
