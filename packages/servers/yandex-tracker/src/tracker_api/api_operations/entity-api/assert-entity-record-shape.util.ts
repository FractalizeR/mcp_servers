/**
 * Диагностический guard формы ответа для одиночной записи Entity API
 * (GET/POST/PATCH одной Goal/Project/Portfolio).
 *
 * ПОЧЕМУ ЭТО ЕСТЬ: `_search` живьём оказался конвертом `{hits, pages, values}`,
 * хотя референсный клиент предполагал голый массив (см. JSDoc
 * `find-entities.operation.ts`). Одиночные get/create/update НЕ были живьём
 * проверены отдельно — до сих пор они просто типизировали `response.data` как
 * `EntityApiOutput` без рантайм-проверки, то есть при похожей рассинхронизации
 * не упали бы явно, а тихо вернули бы агенту мусор (конверт поиска вместо
 * записи, либо любую другую форму). Раз один раз конверт уже подвёл голый
 * массив, для single-record веток стоит та же дисциплина: явная ошибка при
 * первом же несовпадении формы, а не тихая порча данных.
 *
 * Здесь НЕ угадывается альтернативная форма одиночной записи — есть только
 * положительная проверка «похоже на запись» (есть `id`) и отрицательная
 * проверка «это не конверт поиска» (сигнатура `values`/`hits`+`pages`).
 * Любое другое несовпадение — тоже explicit-ошибка с дампом формы.
 */

/** Похоже ли тело ответа на конверт поиска `_search` (`{hits, pages, values}`). */
function looksLikeSearchEnvelope(obj: Record<string, unknown>): boolean {
  return 'values' in obj || ('hits' in obj && 'pages' in obj);
}

/**
 * Проверить, что тело ответа похоже на одну запись Entity API (`id`
 * присутствует, это не конверт поиска), и вернуть его же с типом `T`.
 *
 * @param data - тело ответа (`response.data`/результат `httpClient.get/post/patch`)
 * @param context - для диагностики (например `'get_entity goal/123'`)
 * @throws {Error} при форме, не похожей на одиночную запись
 */
export function assertEntityRecordShape<T>(data: unknown, context: string): T {
  if (data !== null && typeof data === 'object' && !Array.isArray(data)) {
    const obj = data as Record<string, unknown>;

    if (looksLikeSearchEnvelope(obj)) {
      throw new Error(
        `Entity API (${context}) вернул конверт поиска {hits, pages, values} там, где ожидалась ` +
          'одна запись. Это означает расхождение формы ответа между одиночными и поисковыми ' +
          'операциями Entity API — нужна живая проверка сырого тела ответа для этой ветки.'
      );
    }

    const hasId = typeof obj['id'] === 'string' || typeof obj['id'] === 'number';
    if (hasId) {
      return data as T;
    }
  }

  const shapeHint =
    data !== null && typeof data === 'object'
      ? `объект с полями [${Object.keys(data as Record<string, unknown>).join(', ')}]`
      : typeof data;
  throw new Error(
    `Entity API (${context}) вернул неожиданную форму ответа для одиночной записи: ` +
      `получено — ${shapeHint} (нет поля 'id'). Нужна живая проверка сырого тела ответа, прежде ` +
      'чем предполагать иную форму.'
  );
}
