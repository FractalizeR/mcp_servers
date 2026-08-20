/**
 * Сборка query-строки для одиночных ручек Entity API.
 *
 * `fields` обязателен, чтобы API вернул объект `fields` записи: без него ответ
 * состоит из служебных полей, и содержательные до агента не доходят (живая
 * проба 2026-08-20, см. `tools/api/entities/entity-api-fields.util.ts`).
 * Параметр нужен всем четырём одиночным ручкам — get/create/update, — поэтому
 * живёт здесь, а не тремя копиями конкатенации по операциям.
 */

/**
 * @param opts.entityFields - имена полей записи для `?fields=`
 * @param opts.version - версия записи для optimistic locking (только update)
 * @returns query-строка с ведущим `?` либо пустая строка
 */
export function buildEntityQuery(opts: {
  readonly entityFields?: readonly string[] | undefined;
  readonly version?: number | undefined;
}): string {
  const query = new URLSearchParams();

  if (opts.version !== undefined) {
    query.set('version', String(opts.version));
  }
  if (opts.entityFields !== undefined && opts.entityFields.length > 0) {
    query.set('fields', opts.entityFields.join(','));
  }

  const queryString = query.toString();
  return queryString.length > 0 ? `?${queryString}` : '';
}
