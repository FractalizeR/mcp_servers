/**
 * DTO для управления жизненным циклом спринта (старт/архивация/удаление)
 *
 * Все три действия ({sprintId, action}) — поэтому, в отличие от Entity API
 * create/update/delete (разные тела запроса), безопасно объединены в один
 * MCP-инструмент с параметром `action` (аналог `manage_queue_access`).
 *
 * `version` — не тело, а query-параметр `_start`/`_archive`: без него API отвечает
 * `428 Необходимо указать либо параметр 'версия', либо значение заголовка If-Match`
 * (живая проба 2026-08-26). У `delete` версии нет вовсе — эндпоинт её не требует, и
 * лишний GET для её чтения был бы платой ни за что.
 *
 * Автоматическая проверка достижимости параметров
 * (`tests/smoke/tool-params-reach-api.smoke.test.ts`) генерирует образец с первым
 * значением enum (`action: 'start'`), поэтому `version` доезжает до запроса и на
 * синтетическом образце — исключений не требуется.
 */

export type SprintLifecycleAction = 'start' | 'archive' | 'delete';

export interface ManageSprintLifecycleDto {
  /** Идентификатор спринта */
  sprintId: string;

  /** Действие: запустить / архивировать / удалить спринт */
  action: SprintLifecycleAction;

  /**
   * Версия спринта для оптимистичной блокировки — применима только к `start`/
   * `archive`. Не передана — операция читает текущую версию сама. У `delete`
   * версия не игнорируется, а отклоняется схемой (`.refine()` в
   * `manage-sprint-lifecycle.schema.ts`): эндпоинт удаления её не принимает вовсе.
   */
  version?: number | undefined;
}
