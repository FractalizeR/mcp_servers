/**
 * Сводит реестр исключений из покрытия по всем файлам категорий в этом каталоге.
 *
 * Владелец каждого `{категория}.ts` — пакет своей категории (план §C); этот файл
 * никто после 2.1.1 не правит, потому что новый `{категория}.ts` подхватывается
 * автоматически — обход каталога, а не статический список импортов. Единый файл
 * реестра был бы точкой конфликта минимум восьми параллельных пакетов из тринадцати
 * (`.agentic-planning/plan_tracker_test_coverage/2.1.1_matrix_and_harness_sequential.md`
 * §C).
 *
 * Валидация записей (M-9, найдено ревью пакета): пустой `reason`, несуществующий
 * `tool`, свойство вне `CoverageProperty` и `EXCEPTIONS` не-массив раньше принимались
 * молча — `coverage:check` зеленился дампом записей без реального содержания
 * («исключение без цены»). Теперь все четыре случая роняют загрузку. Устаревшая
 * запись (есть и рабочий тест, и исключение на то же свойство) валидацией здесь не
 * ловится — она зависит от наличия теста, а это знает только
 * `scripts/build-coverage-matrix.ts`; см. `collectStaleExceptions` там же.
 */

import { readdirSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { TOOL_CLASSES } from '#composition-root/definitions/tool-definitions.js';
import { MCP_TOOL_PREFIX } from '#constants';
import { COVERAGE_PROPERTIES } from './types.js';
import type { CoverageException } from './types.js';

const CURRENT_DIR = dirname(fileURLToPath(import.meta.url));
const VALID_PROPERTIES: ReadonlySet<string> = new Set(COVERAGE_PROPERTIES);

/** Файлы, не являющиеся категориями исключений — исключены из автообхода. */
const NON_CATEGORY_FILES = new Set([
  'index.ts',
  'types.ts',
  'live-observations.ts',
  'legacy-mock-tests.ts',
  'coverage-gate-baseline.ts',
]);

interface CategoryModule {
  readonly EXCEPTIONS?: readonly CoverageException[];
}

interface ToolMetadataLike {
  readonly name: string;
}

/**
 * Базовые имена всех зарегистрированных инструментов — источник валидации `tool` и
 * для этого реестра, и для реестра живых наблюдений (`live-observations.ts`), который
 * той же проверкой ловит опечатку в имени инструмента.
 */
export function knownToolBaseNames(): ReadonlySet<string> {
  return new Set(
    TOOL_CLASSES.map((ToolClass) => {
      const fullName = (ToolClass as unknown as { METADATA: ToolMetadataLike }).METADATA.name;
      return fullName.startsWith(MCP_TOOL_PREFIX)
        ? fullName.slice(MCP_TOOL_PREFIX.length)
        : fullName;
    })
  );
}

/**
 * Каталоги категорий: каждый `.ts`-файл в переданной директории (по умолчанию — эта
 * же, кроме файлов из `NON_CATEGORY_FILES` и
 * тестов самой оснастки) обязан экспортировать `EXCEPTIONS: CoverageException[]`.
 */
function listCategoryFiles(dir: string): string[] {
  return readdirSync(dir).filter(
    (file) => file.endsWith('.ts') && !file.endsWith('.test.ts') && !NON_CATEGORY_FILES.has(file)
  );
}

function validateException(
  exception: CoverageException,
  sourceFile: string,
  validTools: ReadonlySet<string>
): void {
  if (exception.reason.trim().length === 0) {
    throw new Error(
      `Запись исключения покрытия без причины: tool="${exception.tool}", property="${exception.property}" ` +
        `(файл ${sourceFile}) — reason не может быть пустым или состоять из пробелов`
    );
  }
  if (!validTools.has(exception.tool)) {
    throw new Error(
      `Запись исключения покрытия ссылается на несуществующий инструмент "${exception.tool}" ` +
        `(файл ${sourceFile}) — сверьте базовое имя (без префикса сервера) с TOOL_CLASSES`
    );
  }
  if (!VALID_PROPERTIES.has(exception.property)) {
    throw new Error(
      `Запись исключения покрытия ссылается на неизвестное свойство "${exception.property}" ` +
        `(tool="${exception.tool}", файл ${sourceFile}) — допустимы только ${COVERAGE_PROPERTIES.join(', ')}`
    );
  }
}

/**
 * Загружает и сводит исключения всех категорий. Асинхронно — файлы импортируются
 * динамически. `dir` параметризован (L-3, найдено ревью пакета): по умолчанию — этот
 * каталог, но самотест подставляет изолированную временную директорию вместо записи
 * в отслеживаемый git-каталог.
 */
export async function loadCoverageExceptions(
  dir: string = CURRENT_DIR
): Promise<CoverageException[]> {
  const files = listCategoryFiles(dir);
  const validTools = knownToolBaseNames();

  const modules = await Promise.all(
    files.map(async (file) => {
      // Cache-bust: без него повторный вызов в одном процессе (например,
      // самотест, переписывающий временный файл категории между кейсами) получил
      // бы закешированный ESM-модуль с прежним содержимым.
      const moduleUrl = `${pathToFileURL(join(dir, file)).href}?t=${String(Date.now())}-${Math.random().toString(36).slice(2)}`;
      const imported = (await import(moduleUrl)) as CategoryModule;
      if (imported.EXCEPTIONS === undefined) {
        throw new Error(
          `Файл исключений покрытия "${file}" не экспортирует EXCEPTIONS: CoverageException[]`
        );
      }
      if (!Array.isArray(imported.EXCEPTIONS)) {
        throw new Error(
          `Файл исключений покрытия "${file}" экспортирует EXCEPTIONS, но это не массив`
        );
      }
      for (const exception of imported.EXCEPTIONS) {
        validateException(exception, file, validTools);
      }
      return imported.EXCEPTIONS;
    })
  );

  return modules.flat();
}
