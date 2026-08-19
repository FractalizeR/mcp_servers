/**
 * Операция выполнения перехода статуса задачи
 *
 * Ответственность (SRP):
 * - Выполнение перехода статуса (POST /v3/issues/{issueKey}/transitions/{transitionId}/_execute)
 * - Дочитывание актуального состояния задачи после перехода (GET /v3/issues/{issueKey}) —
 *   ответ `_execute` содержит список переходов из НОВОГО статуса, а не саму задачу
 * - НЕТ получения списка переходов (см. GetIssueTransitionsOperation)
 * - НЕТ других операций с задачами
 *
 * Документация Python SDK:
 * - yandex_tracker_client/collections.py:938 - IssueTransitions collection (fields: id/self/to/screen)
 * - yandex_tracker_client/collections.py:949 - execute method
 * - yandex_tracker_client/tests/smoke/issues/test_issues_transition.py:34 -
 *   test_issue_transition_execute мокает ответ `_execute` списком переходов
 *
 * API v3: POST /v3/issues/{issueKey}/transitions/{transitionId}/_execute
 *         GET  /v3/issues/{issueKey}
 */

import { BaseOperation } from '#tracker_api/api_operations/base-operation.js';
import { EntityCacheKey, EntityType } from '@fractalizer/mcp-infrastructure';
import type { IssueWithUnknownFields } from '#tracker_api/entities/index.js';
import type { ExecuteTransitionDto } from '#tracker_api/dto/index.js';

/**
 * Переход УЖЕ выполнен на сервере (POST `_execute` отработал), но последующее
 * дочитывание задачи (GET `/v3/issues/{key}`) провалилось — сеть/таймаут/429/etc.
 *
 * Дефект-находка №1 (BLOCKER, внешнее ревью 2026-08): раньше ошибка GET
 * улетала наверх неотличимой от ошибки самого перехода, и `TransitionIssueTool`
 * возвращал агенту `success:false`. Переход НЕ идемпотентен — агент, поверив
 * в отказ, либо повторял переход (риск двойного перехода), либо получал 4xx
 * "переход недоступен из текущего статуса" и оставался в убеждении, что
 * запись не прошла. Отдельный класс ошибки позволяет `TransitionIssueTool`
 * различить "переход не выполнен" (обычная ошибка) от "переход выполнен,
 * но актуальное состояние не удалось получить" (успех с оговоркой) — и
 * вернуть `success:true` с явной пометкой в data, а не ошибку.
 */
export class IssueRefetchAfterTransitionError extends Error {
  constructor(
    public readonly issueKey: string,
    public readonly transitionId: string,
    public override readonly cause: unknown
  ) {
    super(
      `Переход ${transitionId} для задачи ${issueKey} выполнен успешно, но не удалось получить актуальное состояние задачи после перехода`
    );
    this.name = 'IssueRefetchAfterTransitionError';
  }
}

export class TransitionIssueOperation extends BaseOperation {
  /**
   * Выполняет переход задачи в другой статус
   *
   * @param issueKey - ключ задачи (например, 'QUEUE-123')
   * @param transitionId - идентификатор перехода (из GetIssueTransitionsOperation)
   * @param transitionData - данные для заполнения при переходе (опционально)
   * @returns актуальное состояние задачи ПОСЛЕ перехода (дочитано отдельным GET,
   *          т.к. ответ `_execute` — список переходов, а не задача)
   * @throws {Error} если переход недоступен, или произошла ошибка API при переходе
   *   либо при последующем дочитывании задачи
   *
   * ВАЖНО:
   * - Переход должен быть доступен из текущего статуса (проверяй через GetIssueTransitionsOperation)
   * - После выполнения кеш задачи инвалидируется, актуальные данные читаются напрямую (без кеша)
   * - Можно передать дополнительные данные (например, комментарий)
   * - Стоимость: 1 дополнительный HTTP-запрос (GET) на каждый вызов — цена за то, что
   *   `fields`/`issue` в ответе tool'а действительно отражают состояние задачи
   */
  async execute(
    issueKey: string,
    transitionId: string,
    transitionData?: ExecuteTransitionDto
  ): Promise<IssueWithUnknownFields> {
    this.logger.info(`Выполнение перехода ${transitionId} для задачи ${issueKey}`, {
      hasData: !!transitionData,
    });

    // API v3: POST /v3/issues/{issueKey}/transitions/{transitionId}/_execute
    //
    // ВАЖНО: тело ответа этого эндпоинта — НЕ задача, а список переходов,
    // доступных из НОВОГО статуса (объекты { id, self, to, screen }). Это
    // задокументировано в референсной реализации: коллекция IssueTransitions
    // (yandex_tracker_client/collections.py, класс IssueTransitions, поля
    // id/self/to/screen) и smoke-тест test_issue_transition_execute
    // (yandex_tracker_client/tests/smoke/issues/test_issues_transition.py),
    // где мок ответа `_execute` — это `fake_issue.transitions` (список).
    // Поэтому применять проекцию `fields` к ответу `_execute` бессмысленно —
    // там нет полей задачи. Чтобы вернуть агенту актуальное состояние задачи
    // (и чтобы работал параметр `fields`), после успешного перехода дочитываем
    // задачу отдельным GET-запросом.
    await this.httpClient.post<unknown>(
      `/v3/issues/${issueKey}/transitions/${transitionId}/_execute`,
      transitionData ?? {}
    );

    // Инвалидируем кеш задачи после изменения статуса, затем дочитываем
    // актуальное состояние напрямую (в обход withCache — нужен гарантированно
    // свежий ответ, а не то, что могло попасть в кеш параллельно).
    const cacheKey = EntityCacheKey.createKey(EntityType.ISSUE, issueKey);
    await this.cacheManager.delete(cacheKey);

    // ВАЖНО (находка №1): к этому моменту переход УЖЕ зафиксирован сервером —
    // POST `_execute` выше отработал без ошибки. Провал дочитывания НЕ должен
    // читаться как провал перехода, поэтому GET оборачивается отдельно и его
    // ошибка перекладывается в специализированный класс
    // (`IssueRefetchAfterTransitionError`), а не пробрасывается как есть.
    let updatedIssue: IssueWithUnknownFields;
    try {
      updatedIssue = await this.httpClient.get<IssueWithUnknownFields>(`/v3/issues/${issueKey}`);
    } catch (error: unknown) {
      this.logger.warn(
        `Переход ${transitionId} для задачи ${issueKey} выполнен успешно, но дочитывание актуального состояния задачи провалилось`,
        { error }
      );
      throw new IssueRefetchAfterTransitionError(issueKey, transitionId, error);
    }

    this.logger.info(
      `Переход выполнен успешно: ${issueKey} → ${updatedIssue.status?.key ?? 'unknown'}`
    );
    return updatedIssue;
  }
}
