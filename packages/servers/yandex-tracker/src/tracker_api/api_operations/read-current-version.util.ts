/**
 * Чтение текущей версии сущности для оптимистичной блокировки на PATCH/POST, у
 * которых версия обязательна и не передана вызывающим (`428` без неё — живая проба
 * 2026-08-26). Продублирована почти дословно в `UpdateComponentOperation`,
 * `UpdateSprintOperation` и `ManageSprintLifecycleOperation` — вынесена сюда, к
 * `base-operation.ts`, а не в семейство одной сущности: три независимых предмета
 * (компонент, спринт дважды) читают версию одним и тем же способом, и общий код не
 * несёт бизнес-логики ни одного из них.
 *
 * Лишний GET осознан: передавшему версию явно этот запрос не делается — там
 * работает настоящая оптимистичная блокировка.
 */

import type { IHttpClient } from '@fractalizer/mcp-infrastructure';

/**
 * @param httpClient - клиент, которым читается сущность
 * @param path - путь чтения сущности (`GET`), например `/v3/sprints/{id}`
 * @param entityId - id сущности — только для текста исключения
 * @param entityLabel - название сущности в родительном падеже («компонента»,
 *   «спринта») — только для текста исключения
 * @throws {Error} ответ не несёт числовую версию — в URL иначе уехало бы
 *   `?version=undefined`, и API отверг бы запрос сообщением про формат, а не про
 *   причину
 */
export async function readCurrentVersion(
  httpClient: IHttpClient,
  path: string,
  entityId: string,
  entityLabel: string
): Promise<number> {
  const entity = await httpClient.get<{ version?: unknown }>(path);
  const version = entity.version;
  if (typeof version !== 'number') {
    throw new Error(
      `Не удалось прочитать версию ${entityLabel} ${entityId}: ответ API её не содержит. ` +
        'Передай version параметром инструмента.'
    );
  }
  return version;
}
