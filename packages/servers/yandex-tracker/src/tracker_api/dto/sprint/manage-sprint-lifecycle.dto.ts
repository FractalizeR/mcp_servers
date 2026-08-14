/**
 * DTO для управления жизненным циклом спринта (старт/архивация/удаление)
 *
 * ВАЖНО: все три действия имеют ОДИНАКОВУЮ форму запроса ({sprintId, action}),
 * без action-специфичных полей тела — поэтому, в отличие от Entity API
 * create/update/delete (разные тела запроса), безопасно объединены в один
 * MCP-инструмент с параметром `action` (аналог `manage_queue_access`).
 * Единая форма также означает, что автоматическая проверка достижимости
 * параметров (`tests/smoke/tool-params-reach-api.smoke.test.ts`) проходит
 * без исключений: каждое поле схемы реально уходит в HTTP-запрос независимо
 * от того, какое значение `action` сгенерировал тест.
 */

export type SprintLifecycleAction = 'start' | 'archive' | 'delete';

export interface ManageSprintLifecycleDto {
  /** Идентификатор спринта */
  sprintId: string;

  /** Действие: запустить / архивировать / удалить спринт */
  action: SprintLifecycleAction;
}
