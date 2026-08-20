/**
 * Категории (папки `src/tools/api/*`), которые «Реестр исключений: что живьём не
 * проверяется» (`tests/TESTING_STRATEGY.md` §1) выводит за пределы очереди `TEST`
 * целиком: доски и колонки, спринты, проекты, глобальные поля, цели и Entity API,
 * сохранённые фильтры, очереди. Для них С-4 на моке — гипотеза, а не наблюдение
 * (канон §2), С-5 не наблюдается никогда.
 *
 * Вынесено в отдельный машинно-читаемый файл (M-10, найдено ревью пакета 2.1.1):
 * раньше список жил только внутри `scripts/build-coverage-matrix.ts` — второй
 * источник истины рядом с прозой `tests/TESTING_STRATEGY.md` §1, без общей точки с
 * реестром исключений. `tests/TESTING_STRATEGY.md` §1 остаётся источником ПРИЧИНЫ
 * (почему именно эти категории), этот файл — источником СПИСКА, который читает код.
 */

export const LIVE_EXEMPT_CATEGORY_FOLDERS: ReadonlySet<string> = new Set([
  'api/boards',
  'api/board-columns',
  'api/sprints',
  'api/projects',
  'api/fields',
  'api/entities',
  'api/filters',
  'api/queues',
]);
