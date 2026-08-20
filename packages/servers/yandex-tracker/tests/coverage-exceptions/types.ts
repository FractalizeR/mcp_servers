/**
 * Типы реестра сознательных исключений из покрытия (план
 * `.agentic-planning/plan_tracker_test_coverage/2.1.1_matrix_and_harness_sequential.md`
 * §C). Реестр — не Markdown: его читает `scripts/build-coverage-matrix.ts`, и рассинхрон
 * таблицы с кодом — тот самый класс дефекта, который весь этап 2.1 закрывает.
 */

/** Свойство исправного инструмента (`packages/servers/TESTING_STRATEGY.md` §1). */
export type CoverageProperty = 'С-1' | 'С-2' | 'С-3' | 'С-4' | 'С-5' | 'С-6' | 'С-7';

/** Единственный источник перечня `CoverageProperty` для рантайм-валидации (M-9). */
export const COVERAGE_PROPERTIES: readonly CoverageProperty[] = [
  'С-1',
  'С-2',
  'С-3',
  'С-4',
  'С-5',
  'С-6',
  'С-7',
];

export interface CoverageException {
  /** Базовое имя инструмента без префикса сервера (например, `create_queue`). */
  readonly tool: string;
  /** Свойство, которое сознательно не проверяется на уровне интеграционных тестов. */
  readonly property: CoverageProperty;
  /** Почему свойство не проверяется здесь — с точной ссылкой (файл, раздел). */
  readonly reason: string;
  /**
   * Чем свойство фактически подтверждается взамен (уровень + путь к тесту), либо
   * `null`, если сейчас ничем (в этом случае `reason` обязана объяснять, почему это
   * приемлемо, а не просто «пока не сделано»).
   */
  readonly replacedBy: string | null;
}
