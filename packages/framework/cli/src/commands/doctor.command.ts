/**
 * Команда самодиагностики MCP подключений.
 *
 * @packageDocumentation
 */

import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import type { MCPConnector } from '../connectors/base/connector.interface.js';
import { resolveExecutablePath } from '../utils/launch-spec-helpers.js';
import { Logger } from '../utils/logger.js';
import type {
  DoctorCheck,
  DoctorCheckResult,
  DoctorCommandOptions,
  DoctorReport,
} from '../types/doctor.types.js';
import type { GetLaunchSpecResult } from '../types/launch.types.js';

/**
 * Internal: ключ группы для проверок без явной group (например, доменные
 * extraChecks без поля group).
 */
const UNGROUPED_GROUP_KEY = '_ungrouped';

/**
 * Internal: метка группы для рендера проверок без group.
 */
const UNGROUPED_GROUP_LABEL = 'Доменные проверки';

/**
 * Запустить диагностику MCP подключений.
 *
 * Собирает проверки в детерминированном порядке:
 *  1. Для каждого зарегистрированного и установленного клиента
 *     (`registry.findInstalled()` в порядке `registry.getAll()`):
 *     - `isInstalled` (фактически уже пройдена — отмечается как `ok`);
 *     - `getStatus` (запрос статуса через коннектор);
 *     - `command-exists` (проверка существования `command` из spec на диске).
 *  2. Доменные `extraChecks` в порядке передачи.
 *
 * Все проверки запускаются параллельно через `Promise.allSettled`. Рендеринг
 * результатов — после завершения всех проверок, чтобы избежать чересполосицы
 * вывода.
 *
 * **Robustness:** исключение внутри `check.run()` перехватывается и трактуется
 * как `fail` с сообщением `'Исключение при выполнении проверки: <message>'`.
 * Одна сломанная проверка не валит весь doctor.
 *
 * **Важно:** функция НЕ вызывает `process.exit`. Caller обязан проверить
 * `report.summary.fail` и при необходимости вызвать `process.exit(1)` — это
 * сохраняет тестируемость функции и оставляет policy решение на CLI entry point.
 *
 * @param options - Опции: `registry` + опциональные доменные `extraChecks`.
 * @returns Агрегированный {@link DoctorReport}.
 */
export async function doctorCommand(options: DoctorCommandOptions): Promise<DoctorReport> {
  const { registry, extraChecks = [] } = options;

  Logger.header('🩺 Диагностика MCP подключений');

  // Per-run cache для getLaunchSpec — connector.getLaunchSpec() читает файл
  // конфигурации (или вызывает CLI) — может быть дорогим. Внутри doctor мы
  // вызываем его для двух проверок (interpretConnectionStatus и
  // checkCommandExistsOnDisk), достаточно одного чтения.
  const launchSpecCache = new Map<MCPConnector, Promise<GetLaunchSpecResult>>();
  const getCachedLaunchSpec = (connector: MCPConnector): Promise<GetLaunchSpecResult> => {
    let p = launchSpecCache.get(connector);
    if (!p) {
      p = connector.getLaunchSpec();
      launchSpecCache.set(connector, p);
    }
    return p;
  };

  // 1. Сбор client-level проверок только для установленных клиентов.
  // Порядок — как в registry.getAll() (стабильный).
  const installed = await registry.findInstalled();
  const installedNames = new Set(installed.map((c) => c.getClientInfo().name));
  const clientChecks: DoctorCheck[] = [];
  for (const connector of registry.getAll()) {
    if (!installedNames.has(connector.getClientInfo().name)) continue;
    clientChecks.push(...buildClientChecks(connector, getCachedLaunchSpec));
  }

  const allChecks: DoctorCheck[] = [...clientChecks, ...extraChecks];

  // 2. Параллельное выполнение всех проверок через Promise.allSettled.
  //    Исключения внутри check.run() трактуем как fail (см. JSDoc).
  const settled = await Promise.allSettled(allChecks.map((c) => safeRun(c)));

  // 3. Сбор результатов в детерминированном порядке.
  const checks: Array<{ check: DoctorCheck; result: DoctorCheckResult }> = allChecks.map(
    (check, idx) => {
      const outcome = settled[idx];
      const result: DoctorCheckResult = settledToResult(outcome);
      return { check, result };
    }
  );

  const report = buildReport(checks);

  // 4. Рендер после завершения всех проверок.
  renderReport(report);

  return report;
}

/**
 * Собрать стандартные client-level проверки для одного коннектора.
 */
function buildClientChecks(
  connector: MCPConnector,
  getCachedLaunchSpec: (c: MCPConnector) => Promise<GetLaunchSpecResult>
): DoctorCheck[] {
  const group = connector.getClientInfo().displayName;
  return [
    buildIsInstalledCheck(connector, group),
    buildGetStatusCheck(connector, group),
    buildCommandExistsCheck(connector, group, getCachedLaunchSpec),
  ];
}

function buildIsInstalledCheck(connector: MCPConnector, group: string): DoctorCheck {
  return {
    name: 'isInstalled',
    description: 'Проверка установки клиента в системе',
    group,
    run: async (): Promise<DoctorCheckResult> => {
      // findInstalled() уже отфильтровал по этому критерию, но для полноты
      // явно отмечаем как ok.
      const ok = await connector.isInstalled();
      return ok
        ? { status: 'ok', message: 'Клиент установлен' }
        : { status: 'fail', message: 'Клиент не установлен' };
    },
  };
}

function buildGetStatusCheck(connector: MCPConnector, group: string): DoctorCheck {
  return {
    name: 'getStatus',
    description: 'Запрос статуса подключения через коннектор',
    group,
    run: async (): Promise<DoctorCheckResult> => {
      const status = await connector.getStatus();
      return interpretConnectionStatus(status);
    },
  };
}

function buildCommandExistsCheck(
  connector: MCPConnector,
  group: string,
  getCachedLaunchSpec: (c: MCPConnector) => Promise<GetLaunchSpecResult>
): DoctorCheck {
  return {
    name: 'command-exists',
    description: 'Существование исполняемого файла из конфигурации клиента',
    group,
    run: (): Promise<DoctorCheckResult> => checkCommandExistsOnDisk(connector, getCachedLaunchSpec),
  };
}

function interpretConnectionStatus(status: {
  connected: boolean;
  error?: string;
}): DoctorCheckResult {
  if (status.connected && !status.error) {
    return { status: 'ok', message: 'Сервер подключен и отвечает' };
  }
  if (status.connected && status.error) {
    return {
      status: 'warn',
      message: `Подключен, но с предупреждением: ${status.error}`,
    };
  }
  if (status.error) {
    return { status: 'fail', message: status.error };
  }
  return {
    status: 'warn',
    message: 'Сервер не подключен к этому клиенту',
    hint: 'Запустите команду `connect`, чтобы подключить сервер.',
  };
}

/**
 * Проверка существования `command` (или скрипта при `command === 'node'`)
 * на диске. Использует {@link resolveExecutablePath} — ту же логику, что и
 * `BaseConnector.validateLaunchSpec`/`ConfigurableConnector.commandExistsOnDisk`.
 *
 * Кейсы:
 *  - `outcome !== 'found'` (сервер не подключен / не stdio / вывод клиента не
 *    разобран / команда чтения записи упала) → `skip`/`warn` в зависимости от
 *    исхода, см. {@link describeMissingLaunchSpec}.
 *  - Команда — `npx`/`pipx`/`uvx` или относительная — `warn`.
 *  - Команда — абсолютный путь или `node` с абсолютным скриптом — `fs.access(R_OK)`.
 */
async function checkCommandExistsOnDisk(
  connector: MCPConnector,
  getCachedLaunchSpec: (c: MCPConnector) => Promise<GetLaunchSpecResult>
): Promise<DoctorCheckResult> {
  const result = await getCachedLaunchSpec(connector);
  if (result.outcome !== 'found') {
    return describeMissingLaunchSpec(result);
  }
  const spec = result.spec;

  const filePath = resolveExecutablePath(spec);

  if (filePath === null) {
    // относительная команда или `node` без скрипта в args
    if (path.isAbsolute(spec.command)) {
      // не должно случиться, resolveExecutablePath обрабатывает абсолютные.
      return {
        status: 'fail',
        message: `Не удалось определить путь к исполняемому файлу для команды: ${spec.command}`,
      };
    }
    return {
      status: 'warn',
      message: `Команда '${spec.command}' разрешается через PATH; не можем проверить на диске`,
      hint: 'Работа зависит от текущего PATH клиента. Рекомендуется указывать абсолютный путь.',
    };
  }

  try {
    await fs.access(filePath, fs.constants.R_OK);
    return {
      status: 'ok',
      message: `Файл найден и читаем: ${filePath}`,
    };
  } catch {
    return {
      status: 'fail',
      message: `Файл не найден или недоступен: ${filePath}`,
      hint: 'Переподключите сервер командой `connect` (путь к бандлу мог измениться при обновлении пакета).',
    };
  }
}

/**
 * Отрендерить исходы {@link GetLaunchSpecResult}, отличные от `found`, в
 * {@link DoctorCheckResult}.
 *
 * `notConnected` — ожидаемое штатное состояние (сервер просто не подключен к
 * этому клиенту) → `skip`. Остальные три исхода — признак проблемы с самим
 * механизмом чтения записи (не с диском) → `warn`, чтобы не молчать о них.
 */
function describeMissingLaunchSpec(
  result: Exclude<GetLaunchSpecResult, { outcome: 'found' }>
): DoctorCheckResult {
  switch (result.outcome) {
    case 'notConnected':
      return { status: 'skip', message: 'Сервер не подключен к этому клиенту' };
    case 'notStdio':
      return {
        status: 'skip',
        message: `Транспорт сервера не stdio (${result.transport}) — проверка файла на диске неприменима`,
      };
    case 'unparsable':
      return {
        status: 'warn',
        message: `Не удалось разобрать данные о подключении сервера: ${result.reason}`,
      };
    case 'commandFailed':
      // Текст ошибки команды намеренно не подставляется: `result.message` несёт
      // до 200 символов stderr упавшей команды (`utils/command-executor.ts`), а
      // он может содержать фрагмент `env` записи клиента — то есть токен. Вывод
      // doctor идёт в тот же терминал, откуда попадает в контекст ИИ-агента.
      return {
        status: 'warn',
        message:
          'Команда получения конфигурации клиента завершилась ошибкой. Текст не печатается: он может содержать env записи. Проверьте вручную: claude mcp get <имя сервера>.',
      };
  }
}

/**
 * Безопасно запустить проверку, перехватывая исключения.
 */
async function safeRun(check: DoctorCheck): Promise<DoctorCheckResult> {
  try {
    return await check.run();
  } catch (err) {
    return {
      status: 'fail',
      message: `Исключение при выполнении проверки: ${stringifyError(err)}`,
    };
  }
}

function stringifyError(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}

/**
 * Преобразование одного исхода `Promise.allSettled` в `DoctorCheckResult`.
 * `safeRun` уже перехватывает исключения внутри проверки, поэтому ветка
 * `rejected` — defence-in-depth (например, если safeRun сам кинет).
 */
function settledToResult(
  outcome: PromiseSettledResult<DoctorCheckResult> | undefined
): DoctorCheckResult {
  if (!outcome) {
    return {
      status: 'fail',
      message: 'Внутренняя ошибка: отсутствует результат проверки',
    };
  }
  if (outcome.status === 'fulfilled') {
    return outcome.value;
  }
  return {
    status: 'fail',
    message: `Исключение при выполнении проверки: ${stringifyError(outcome.reason)}`,
  };
}

function buildReport(
  checks: Array<{ check: DoctorCheck; result: DoctorCheckResult }>
): DoctorReport {
  const summary = { ok: 0, warn: 0, fail: 0, skip: 0 };
  for (const { result } of checks) {
    summary[result.status] += 1;
  }
  return { checks, summary };
}

/**
 * Отрендерить отчёт через {@link Logger}. Группирует проверки по `group`
 * (если задано) в порядке появления группы.
 */
function renderReport(report: DoctorReport): void {
  // Группировка с сохранением порядка появления group.
  const groups = new Map<string, Array<{ check: DoctorCheck; result: DoctorCheckResult }>>();
  for (const item of report.checks) {
    const group = item.check.group ?? UNGROUPED_GROUP_KEY;
    let arr = groups.get(group);
    if (!arr) {
      arr = [];
      groups.set(group, arr);
    }
    arr.push(item);
  }

  for (const [group, items] of groups) {
    if (group !== UNGROUPED_GROUP_KEY) {
      Logger.info(`\nГруппа: ${group}`);
    } else {
      Logger.info(`\n${UNGROUPED_GROUP_LABEL}:`);
    }
    for (const { check, result } of items) {
      renderCheck(check, result);
    }
  }

  Logger.newLine();
  const { ok, warn, fail, skip } = report.summary;
  const summaryLine = `Сводка: ${ok} ok · ${warn} warn · ${fail} fail · ${skip} skip`;
  if (fail > 0) {
    Logger.error(summaryLine);
  } else if (warn > 0) {
    Logger.warn(summaryLine);
  } else {
    Logger.success(summaryLine);
  }
}

function renderCheck(check: DoctorCheck, result: DoctorCheckResult): void {
  renderCheckLine(check, result);
  renderCheckDetails(result);
  renderCheckHint(result);
}

function renderCheckLine(check: DoctorCheck, result: DoctorCheckResult): void {
  const message = `[${check.name}] ${result.message}`;
  switch (result.status) {
    case 'ok':
      Logger.success(message);
      return;
    case 'warn':
      Logger.warn(message);
      return;
    case 'fail':
      Logger.error(message);
      return;
    case 'skip':
      Logger.info(`${message} (пропущено)`);
      return;
  }
}

function renderCheckDetails(result: DoctorCheckResult): void {
  if (!result.details || result.details.length === 0) return;
  for (const line of result.details) {
    Logger.info(`  ${line}`);
  }
}

function renderCheckHint(result: DoctorCheckResult): void {
  if (!result.hint) return;
  if (result.status !== 'warn' && result.status !== 'fail') return;
  Logger.info(`  Подсказка: ${result.hint}`);
}
