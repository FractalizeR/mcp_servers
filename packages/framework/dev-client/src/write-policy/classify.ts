/**
 * Классификация инструментов: read / write / local-side-effect.
 *
 * Третий класс заведён не умозрительно: у `download_attachment` в wiki стоит
 * `readOnlyHint: true`, но инструмент пишет файл на диск разработчика
 * (`saveToPath`). `readOnlyHint` по спецификации MCP означает «не меняет своё
 * окружение» и ничего не говорит про локальные побочные эффекты — опираться
 * только на него нельзя (см. README плана, раздел «Политика записи»).
 */

/** Минимальное описание инструмента, достаточное для классификации. */
export interface ToolSummary {
  readonly name: string;
  readonly title?: string;
  /** `annotations?.readOnlyHint === true` */
  readonly readOnly: boolean;
  /** `annotations?.destructiveHint === true` */
  readonly destructive: boolean;
  /** Схема аргументов содержит свойство — путь на локальной ФС (см. {@link hasPathLikeProperty}) */
  readonly hasPathArgs: boolean;
}

export type ToolClass = 'read' | 'write' | 'local-side-effect';

/**
 * Имя свойства, означающее путь **на локальной ФС** для сохранения файла.
 *
 * Требуется квалификатор перед `path` (`saveToPath`, `filePath`, `outputPath`,
 * `destPath`, snake_case-варианты). Голое `path` намеренно НЕ подходит: это
 * имя пути **API** у `raw_api_request` (`packages/framework/core/src/tools/raw/
 * raw-api.schema.ts`) — read-only escape hatch, запертый на `z.literal('GET')`.
 * Классифицировать его как `local-side-effect` значило бы требовать
 * `--dangerously-allow-write` ради чтения и приучать ставить флаг «опасной
 * записи» без нужды — после чего флаг перестаёт что-либо значить для
 * остальных строк батча.
 *
 * Эмпирическое основание конвенции: во всех трёх серверах путь для сохранения
 * на диск называется `saveToPath` (`download_attachment` в tracker/wiki,
 * `get_thumbnail` в tracker).
 *
 * Границы эвристики (осознанные, расширять без повода не нужно): она смотрит
 * только на свойства верхнего уровня схемы и только на имена, оканчивающиеся на
 * `path`, — `outputDir`, `saveAs`, `filename` и вложенные схемы она не ловит.
 * Обратной ошибки сегодня нет: все инструменты трёх серверов, реально пишущие
 * на ФС, размечены `readOnlyHint: false` и попадают в `write` независимо от
 * эвристики; она страхует ровно противоположный случай — `readOnlyHint: true`
 * при записи на диск. Расширять список имён имеет смысл, когда появится
 * инструмент с `readOnlyHint: true`, пишущий по аргументу с другим именем.
 */
const LOCAL_PATH_PROPERTY_PATTERN = /(?:to|file|output|dest|save|local)_?path$/i;

/**
 * Признак «инструмент принимает путь для локальной записи» определяется по
 * схеме аргументов, а не по списку имён инструментов: список имён разъедется
 * с кодом при первом же новом инструменте (см. README плана).
 */
export function hasPathLikeProperty(inputSchema: unknown): boolean {
  if (!inputSchema || typeof inputSchema !== 'object') return false;
  const properties = (inputSchema as { properties?: unknown }).properties;
  if (!properties || typeof properties !== 'object') return false;
  return Object.keys(properties).some((key) => LOCAL_PATH_PROPERTY_PATTERN.test(key));
}

/**
 * Классифицировать инструмент.
 *
 * - `read` — `readOnly === true`, не `destructive`, и нет пути локальной записи.
 * - `local-side-effect` — `readOnly === true`, но в схеме есть путь локальной записи.
 * - `write` — `readOnly !== true` (именно `!== true`: отсутствие аннотации
 *   означает «считаем записью» — консервативный дефолт) **или**
 *   `destructiveHint === true`.
 *
 * `destructiveHint` участвует осознанно: комбинация `readOnlyHint: true` +
 * `destructiveHint: true` противоречива, и разрешать по ней вызов без флага —
 * значит выбрать более опасную сторону противоречия. На текущих серверах
 * такой комбинации нет, правило работает как страховка от будущей разметки.
 */
export function classify(tool: ToolSummary): ToolClass {
  if (!tool.readOnly || tool.destructive) return 'write';
  return tool.hasPathArgs ? 'local-side-effect' : 'read';
}
