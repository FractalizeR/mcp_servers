/**
 * Smoke-тест собранного бандла сервера — единственное место, где контур
 * проверяется end-to-end на РЕАЛЬНОМ бандле, а не через мок ServerConfig:
 *   1. сервер успешно запускается;
 *   2. отвечает на tools/list;
 *   3. возвращает валидный полный список инструментов;
 *   4. два последовательных tools/list дают побайтово одинаковый список;
 *   5. устаревшая переменная окружения не роняет сервер и печатает
 *      предупреждение в stderr;
 *   6. сервер корректно завершается.
 *
 * Более детальные проверки — в vitest smoke-тестах пакета сервера
 * (`tests/smoke/`), запуск: `npm run test:smoke`.
 *
 * В отличие от raw-wire тестов, здесь проверяется НАШ сервер, а не поведение
 * SDK, — поэтому шаги 1-4 говорят с сервером через официальный `Client` из
 * `@modelcontextprotocol/client`, как настоящий MCP-клиент. Побочный выигрыш:
 * чтением stdout занимается SDK, и класс дефектов «многобайтный UTF-8 порван
 * на границе чанка» для этого пути исчезает как таковой.
 *
 * Шаг 5 (устаревшая переменная окружения) остаётся на процессном уровне
 * ({@link ServerHarness}): его предмет — поведение процесса НА СТАРТЕ
 * (предупреждение в stderr, отсутствие падения), а не протокол.
 *
 * Готовность сервера — завершённый handshake `initialize`, останов — событие
 * `exit`. Фиксированных пауз нет ни там, ни там; таймеры остаются только
 * предельными таймаутами с внятной ошибкой.
 */

import { Client } from '@modelcontextprotocol/client';
import { StdioClientTransport } from '@modelcontextprotocol/client/stdio';
import type { Tool } from '@modelcontextprotocol/client';
import { assertNoDecodingDamage } from './utf8-stream.js';
import { describeToolsListMismatch } from './tools-list-diagnostics.js';
import { ServerHarness, type WireServerConfig } from './wire-session.js';

/** Общий предельный таймаут прогона. */
const TIMEOUT_MS = 55000;
/** Событийное ожидание handshake/ответа. */
const RESPONSE_WAIT_TIMEOUT_MS = 10000;
/** Событийное ожидание подстроки в stderr. */
const STDERR_PATTERN_TIMEOUT_MS = 10000;

/**
 * Строки отчёта задаются сервером (у yandex-* — на русском), и прогон
 * не должен молча менять свой вывод.
 */
export interface SmokeMessages {
  readonly header: string;
  readonly startingServer: string;
  readonly sendingRequest: string;
  readonly awaitingResponse: string;
  readonly validating: string;
  readonly responseValid: string;
  /** Получает число инструментов. */
  readonly toolsFound: (count: number) => string;
  readonly determinism: string;
  readonly listIdentical: string;
  readonly deprecatedEnvVar: string;
  readonly warningPresent: string;
  /** Получает число инструментов. */
  readonly stillWorking: (count: number) => string;
  readonly passed: string;
  readonly failed: string;
  readonly stoppingServer: string;
}

export interface SmokeConfig extends WireServerConfig {
  readonly messages: SmokeMessages;
  /** Устаревшая переменная окружения, которая должна давать warning, а не падение. */
  readonly deprecatedEnvVar: { readonly name: string; readonly value: string };
  /** Нижняя граница числа инструментов: защита от «сервер отдал огрызок списка». */
  readonly minExpectedTools: number;
  /** Инструменты, без которых список считается сломанным. */
  readonly requiredTools: readonly string[];
  /** Имена, которых в списке быть НЕ должно (наследие удалённого mcp-search). */
  readonly forbiddenTools: readonly string[];
}

function validateTools(tools: Tool[], config: SmokeConfig): void {
  if (!Array.isArray(tools)) {
    throw new Error('Отсутствует или невалидное поле tools в result');
  }
  if (tools.length === 0) {
    throw new Error('Список инструментов пустой');
  }
  if (tools.length < config.minExpectedTools) {
    throw new Error(
      `Ожидалось минимум ${config.minExpectedTools} инструментов, получено ${tools.length}. ` +
        `Инструменты: ${tools.map((t) => t.name).join(', ')}`
    );
  }

  const firstTool = tools[0];
  if (!firstTool || typeof firstTool.name !== 'string') {
    throw new Error('Невалидная структура инструмента (отсутствует name)');
  }

  const toolNames = tools.map((t) => t.name);
  for (const requiredTool of config.requiredTools) {
    if (!toolNames.includes(requiredTool)) {
      throw new Error(
        `Критический инструмент "${requiredTool}" отсутствует в списке. ` +
          `Доступные: ${toolNames.join(', ')}`
      );
    }
  }

  // Пакет @fractalizer/mcp-search удалён — прогрессивное раскрытие
  // инструментов сервером больше не поддерживается.
  const forbidden = config.forbiddenTools.filter((name) => toolNames.includes(name));
  if (forbidden.length > 0) {
    throw new Error(
      `Инструмент "${forbidden.join(', ')}" присутствует в списке, хотя пакет mcp-search удалён.`
    );
  }
}

/** Шаги 1-4: настоящая MCP-сессия против собранного бандла. */
async function runClientSmokeTest(config: SmokeConfig): Promise<void> {
  const m = config.messages;
  console.log(m.startingServer);

  const transport = new StdioClientTransport({
    command: 'node',
    args: [config.bundlePath],
    env: { ...process.env, LOG_LEVEL: 'error', ...config.baseEnv } as Record<string, string>,
    stderr: 'pipe',
  });
  const client = new Client(
    { name: 'smoke-test-server', version: '1.0.0' },
    { capabilities: {}, versionNegotiation: { mode: 'legacy' } }
  );

  try {
    // Готовность = завершённый handshake, а не истёкшая пауза.
    await client.connect(transport);

    console.log(m.sendingRequest);
    console.log(m.awaitingResponse);
    const first = await client.listTools();

    console.log(m.validating);
    validateTools(first.tools, config);
    console.log(m.responseValid);
    console.log(m.toolsFound(first.tools.length));

    console.log(m.determinism);
    const second = await client.listTools();

    assertNoDecodingDamage('tools/list', JSON.stringify(first.tools));
    const mismatch = describeToolsListMismatch(first.tools, second.tools);
    if (mismatch !== undefined) {
      console.log(mismatch);
      throw new Error(
        'Два последовательных tools/list вернули РАЗНЫЙ список — нарушен контракт ' +
          `детерминированного порядка (см. ToolSorter.sortByPriority).\n${mismatch}`
      );
    }
    console.log(m.listIdentical);
  } finally {
    console.log(m.stoppingServer);
    await client.close().catch(() => {});
  }
}

/**
 * Шаг 5: устаревшая переменная окружения не должна ронять сервер — только
 * предупреждать в stderr и продолжать штатную работу. Отдельный процесс с
 * собственным жизненным циклом: переменная задаётся только на старте.
 */
async function runDeprecatedEnvVarSmokeTest(config: SmokeConfig): Promise<void> {
  const m = config.messages;
  console.log(m.deprecatedEnvVar);

  const harness = new ServerHarness(config, {
    [config.deprecatedEnvVar.name]: config.deprecatedEnvVar.value,
  });

  try {
    await harness.waitForStderr(config.deprecatedEnvVar.name, STDERR_PATTERN_TIMEOUT_MS);
    console.log(m.warningPresent);

    const response = await harness.request(1, 'tools/list');
    const tools: unknown = response.result?.tools;
    if (response.error || !Array.isArray(tools) || tools.length === 0) {
      throw new Error(`tools/list не отработал штатно после warning: ${JSON.stringify(response)}`);
    }
    console.log(m.stillWorking(tools.length));
  } finally {
    await harness.close();
  }
}

/** Точка входа smoke-теста конкретного сервера. */
export async function runSmokeTest(config: SmokeConfig): Promise<void> {
  const m = config.messages;
  console.log(m.header);

  let timeoutId: NodeJS.Timeout | undefined;
  try {
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => {
        reject(new Error(`Тест превысил таймаут ${TIMEOUT_MS}ms`));
      }, TIMEOUT_MS);
    });

    await Promise.race([
      (async () => {
        await runClientSmokeTest(config);
        await runDeprecatedEnvVarSmokeTest(config);
      })(),
      timeoutPromise,
    ]);

    console.log(m.passed);
    process.exit(0);
  } catch (error) {
    console.error(m.failed, (error as Error).message);
    process.exit(1);
  } finally {
    if (timeoutId !== undefined) {
      clearTimeout(timeoutId);
    }
  }
}

export { RESPONSE_WAIT_TIMEOUT_MS };
