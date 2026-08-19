/**
 * Преобразователь ошибок Axios в ApiErrorClass
 *
 * Ответственность (SRP):
 * - ТОЛЬКО преобразование AxiosError → ApiErrorClass
 * - ТОЛЬКО извлечение информации из ответа API
 * - Специальная обработка rate limiting (429)
 *
 * НЕ отвечает за:
 * - Retry логику (делегируется RetryHandler)
 * - Логирование (делегируется вызывающему коду)
 *
 * ОБНОВЛЕНО:
 * - Возвращает ApiErrorClass (extends Error) вместо plain ApiError
 * - Решает проблему потери деталей ошибки при передаче через Promise.reject()
 */

import type { AxiosError } from 'axios';
import { HttpStatusCode } from '../../types.js';
import { ApiErrorClass } from './api-error.class.js';
import type { JsonValue } from './api-error.class.js';

export class ErrorMapper {
  /**
   * Преобразует AxiosError в ApiErrorClass
   * @param error - ошибка Axios
   * @returns структурированная ошибка API (extends Error)
   */
  static mapAxiosError(error: AxiosError): ApiErrorClass {
    // Случай 1: Сервер вернул ответ с ошибкой
    if (error.response) {
      return this.mapResponseError(error);
    }

    // Случай 2: Запрос был отправлен, но нет ответа
    if (error.request) {
      return new ApiErrorClass(
        HttpStatusCode.NETWORK_ERROR,
        'Нет ответа от сервера. Проверьте подключение к интернету.'
      );
    }

    // Случай 3: Ошибка при настройке запроса
    return new ApiErrorClass(HttpStatusCode.NETWORK_ERROR, error.message || 'Неизвестная ошибка');
  }

  /**
   * Обрабатывает ошибку с ответом от сервера
   */
  private static mapResponseError(error: AxiosError): ApiErrorClass {
    const data = error.response?.data as Record<string, unknown> | undefined;

    if (!data || !error.response) {
      return new ApiErrorClass(error.response?.status ?? 0, error.message);
    }

    // Специальная обработка rate limiting (429 ошибка)

    if (error.response.status === HttpStatusCode.TOO_MANY_REQUESTS) {
      return this.mapRateLimitError(error);
    }

    // Извлекаем сообщение об ошибке из различных форматов ответа
    const errorMessages = data['errorMessages'] as string[] | undefined;
    const dataMessage = data['message'] as string | undefined;
    const rawMessage = errorMessages?.[0] ?? dataMessage ?? error.message;
    const message =
      error.response.status === HttpStatusCode.CONFLICT
        ? this.enrichConflictMessage(rawMessage)
        : rawMessage;
    // Форма значения по ключу не гарантирована API: референсный Python-клиент
    // (yandex_tracker_client/exceptions.py:84-87) форматирует его как скаляр, не массив —
    // тип и outputSchema (BatchErrorValueSchema) обязаны допускать обе формы.
    const errors = data['errors'] as Record<string, string[] | string> | undefined;
    // Недокументированное поле Трекера (референсный клиент сохраняет его как есть,
    // см. yandex_tracker_client/exceptions.py:76) — форма не гарантирована API.
    const errorsData = data['errorsData'] as JsonValue | undefined;

    return new ApiErrorClass(error.response.status, message, errors, undefined, errorsData);
  }

  /**
   * Дополняет исходное сообщение API об ошибке 409 действенной подсказкой
   * для вызывающего агента.
   *
   * Проблема: конкретные API (например, Трекер) отвечают на конфликт
   * состояния (409) дословным текстом вида «Задача: не удалось сохранить
   * изменения, попробуйте ещё раз». Агент читает это буквально и повторяет
   * тот же запрос с теми же устаревшими данными — конфликт воспроизводится
   * бесконечно.
   *
   * Решение: сохраняем исходное сообщение API без изменений (не подменяем!)
   * и дописываем к нему доменно-нейтральную констатацию причины — БЕЗ императива
   * «повторите операцию».
   *
   * ВАЖНО (находка 3 внешнего ревью фиксов): 409 у Трекера — это не только
   * «состояние изменилось с момента чтения» (классическая версионная коллизия),
   * но и «сущность с такими уникальными данными уже существует» (см.
   * `CreateIssueOperation` тракера, ветка `unique`: 409 на создание задачи с уже
   * занятым значением уникального поля). Прежний текст заканчивался прямым
   * призывом «перечитайте и повторите операцию» — для конфликта уникальности
   * это прямая подсказка создать дубликат. Универсального for-all-409 совета
   * «просто повторите» не существует, поэтому текст остаётся констатацией
   * (что произошло и почему слепой повтор не поможет), а конкретное действие
   * («перечитать состояние», «поискать существующую сущность», ...) читатель
   * должен определить сам по описанию конкретного MCP-инструмента/операции —
   * framework-слой не знает доменной семантики конкретного конфликта.
   *
   * Альтернатива (отвергнута): различать подтипы 409 (версионный конфликт vs.
   * конфликт уникальности) прямо здесь. Framework-слой (`ErrorMapper`) не имеет
   * доступа к телу ответа с достаточной семантикой, чтобы надёжно отличить
   * подтипы у разных API (Tracker/Wiki/TickTick) — эвристика на основе текста
   * сообщения хрупкая и доменно-специфичная. Разделение подтипов уместнее на
   * уровне конкретной операции (как уже сделано в `CreateIssueOperation`,
   * которая проверяет `statusCode === 409` и сама решает, что дальше).
   *
   * ВАЖНО: statusCode остаётся единственным контрактом для потребителей
   * (например, ветка `unique` в CreateIssueOperation тракера различает 409
   * только по `error.statusCode`, текст сообщения не разбирает) —
   * обогащение текста этот контракт не затрагивает.
   *
   * @param originalMessage - исходное сообщение об ошибке от API
   * @returns исходное сообщение + констатация причины конфликта (без императива «повторите»)
   */
  private static enrichConflictMessage(originalMessage: string): string {
    return (
      `${originalMessage} ` +
      'Это конфликт состояния (HTTP 409): либо сущность была изменена другим запросом с ' +
      'момента её последнего чтения, либо сущность с такими уникальными данными уже ' +
      'существует. Слепой повтор того же запроса с теми же данными не поможет — сначала ' +
      'проверьте актуальное состояние (или наличие существующей сущности) и только затем ' +
      'решайте, что делать дальше.'
    );
  }

  /**
   * Обрабатывает ошибку rate limiting (429)
   * Извлекает информацию о времени ожидания из заголовка Retry-After
   *
   * @param error - Axios ошибка с 429 статусом
   * @returns ApiErrorClass с обязательным retryAfter
   */
  private static mapRateLimitError(error: AxiosError): ApiErrorClass {
    const retryAfterHeader = error.response?.headers['retry-after'] as string | undefined;
    let retryAfter = 60; // Значение по умолчанию: 60 секунд

    if (retryAfterHeader && typeof retryAfterHeader === 'string') {
      const parsed = parseInt(retryAfterHeader, 10);
      if (!isNaN(parsed) && parsed > 0) {
        retryAfter = parsed;
      }
    }

    const data = error.response?.data as Record<string, unknown> | undefined;
    const errorsData = data?.['errorsData'] as JsonValue | undefined;

    return new ApiErrorClass(
      HttpStatusCode.TOO_MANY_REQUESTS,
      `Rate limit exceeded. Retry after ${retryAfter} seconds.`,
      undefined,
      retryAfter,
      errorsData
    );
  }
}
