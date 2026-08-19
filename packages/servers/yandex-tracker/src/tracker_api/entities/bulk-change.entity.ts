/**
 * Доменный тип: Bulk Change Operation в Яндекс.Трекере
 *
 * Соответствует API v2: /v2/bulkchange/*
 *
 * Bulk Change API позволяет выполнять массовые операции над задачами:
 * - Массовое обновление полей (_update)
 * - Массовая смена статусов (_transition)
 * - Массовое перемещение между очередями (_move)
 *
 * ВАЖНО: Операции выполняются асинхронно на сервере.
 * Сервер возвращает operationId, по которому можно проверить статус.
 */

import type { WithUnknownFields } from './types.js';
import type { UserRef } from './common/user-ref.entity.js';

/**
 * Статус bulk операции
 *
 * Union намеренно открытый. Перечень статусов не удалось снять живой пробой:
 * `GET /v2/bulkchange/{id}` требует уже существующей операции, а её создание — запись
 * в боевой сервис. Перечисленные три подтверждены документацией и референсным
 * клиентом (`collections.py:1573` ждёт `COMPLETE`/`FAILED`, фикстура заводится с
 * `CREATED`), но это подтверждённый минимум, а не гарантированно полный список —
 * промежуточный статус мог не попасть ни в доки, ни в клиент.
 *
 * Закрытый union уже подводил: прежние `PENDING`/`RUNNING`/`COMPLETED`/`CANCELLED`
 * не существуют, и из пяти объявленных совпадал только `FAILED`.
 */
export type BulkChangeStatus = 'CREATED' | 'COMPLETE' | 'FAILED' | (string & {});

/**
 * Терминальные статусы: операция дальше не изменится.
 *
 * Вынесено в предикат, чтобы литералы не растекались по коду: открытый union их
 * не проверяет, и опечатка в сравнении `status === 'COMPLETED'` не будет поймана
 * ни компилятором, ни тестом — именно так и появились прежние несуществующие
 * статусы.
 */
export const TERMINAL_BULK_CHANGE_STATUSES = ['COMPLETE', 'FAILED'] as const;

export function isTerminalBulkChangeStatus(status: BulkChangeStatus): boolean {
  return (TERMINAL_BULK_CHANGE_STATUSES as readonly string[]).includes(status);
}

/**
 * Результат выполнения bulk операции
 *
 * Форма — по официальной документации (раздел «Статус и детали массовой операции»).
 * Полей `type`, `progress`, `processedIssues`, `failedIssues`, `startedAt`,
 * `completedAt`, `errors`, `parameters` в ответе нет: они были объявлены здесь
 * умозрительно и убраны 2026-08-19.
 */
export interface BulkChangeOperation {
  /** Идентификатор операции (используется для проверки статуса) */
  readonly id: string;

  /** URL для проверки статуса операции */
  readonly self: string;

  /** Статус выполнения операции */
  readonly status: BulkChangeStatus;

  /** Человекочитаемое пояснение к статусу, например «Массовое изменение выполнено» */
  readonly statusText?: string;

  /** Автор операции */
  readonly createdBy?: UserRef;

  /** Дата создания операции (ISO 8601) */
  readonly createdAt?: string;

  /** Доля обработанных пачек задач, 0–100 */
  readonly executionChunkPercent?: number;

  /** Доля обработанных задач, 0–100 */
  readonly executionIssuePercent?: number;

  /**
   * Общее количество задач в операции
   *
   * Источник — официальная документация, раздел «Статус и детали массовой
   * операции» (yandex.ru/support/tracker, concepts/bulkchange/bulk-move-info):
   * поле есть в таблице ответа и в примере JSON. В референсном клиенте его нет —
   * клиент отстаёт, поэтому по нему одному поле удалять нельзя.
   */
  readonly totalIssues?: number;

  /** Количество задач, обработанных успешно. Источник — тот же, что у `totalIssues`. */
  readonly totalCompletedIssues?: number;
}

/**
 * Bulk Change Operation с возможными unknown полями из API.
 * Используется при получении данных от API Трекера.
 */
export type BulkChangeOperationWithUnknownFields = WithUnknownFields<BulkChangeOperation>;
