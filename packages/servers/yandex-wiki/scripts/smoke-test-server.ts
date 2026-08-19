#!/usr/bin/env tsx
/**
 * Smoke-тест MCP сервера Yandex Wiki
 *
 * Проверяет на РЕАЛЬНОМ собранном бандле:
 * 1. Сервер успешно запускается
 * 2. Отвечает на JSON-RPC запрос tools/list
 * 3. Возвращает валидный полный список инструментов
 * 4. Два последовательных tools/list дают побайтово одинаковый список (DoD 2.1)
 * 5. Устаревшая переменная окружения TOOL_DISCOVERY_MODE не роняет сервер и
 *    печатает предупреждение в stderr (DoD 2.1.A)
 * 6. Сервер корректно завершается
 *
 * **СТРАТЕГИЯ SMOKE ТЕСТИРОВАНИЯ:**
 *
 * Этот скрипт - базовый smoke test через stdio, проверяющий только MCP protocol.
 * Для более детального тестирования используйте vitest smoke тесты:
 *
 * 1. **MCP Lifecycle** (`tests/smoke/mcp-server-lifecycle.smoke.test.ts`)
 *    - Проверка создания MCP server instance без реального API
 *    - Использует fake tokens
 *
 * **Запуск всех smoke тестов:**
 * ```bash
 * npm run test:smoke  # Все smoke тесты
 * ```
 */

import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';

interface JSONRPCRequest {
  jsonrpc: string;
  method: string;
  id: number;
  params?: Record<string, unknown>;
}

interface JSONRPCResponse {
  jsonrpc: string;
  id: number;
  result?: {
    tools?: Array<{ name: string }>;
  };
  error?: {
    code: number;
    message: string;
  };
}

const TIMEOUT_MS = 40000; // 40 секунд на весь тест (основной сценарий + отдельный процесс для DoD 2.1.A)
const RESPONSE_WAIT_TIMEOUT_MS = 10000; // событийное ожидание JSON-RPC ответа
const STDERR_PATTERN_TIMEOUT_MS = 10000; // событийное ожидание подстроки в stderr

/**
 * Ожидание JSON-RPC ответа с `expectedId` в stdout процесса `proc`.
 * Резолвится сразу, как только распознана подходящая строка — не привязано
 * к фиксированной задержке и не зависит от скорости машины.
 *
 * Также завершается раньше таймаута (с диагностикой, включающей весь
 * накопленный stderr), если процесс закрылся или упал до ответа, вместо
 * молчаливого ожидания полного таймаута.
 */
async function waitForJSONRPCResponse(
  stdoutBuffer: string,
  proc: ReturnType<typeof spawn>,
  expectedId: number,
  getStderr: () => string,
  timeoutMs: number
): Promise<JSONRPCResponse> {
  return new Promise((resolve, reject) => {
    let buffer = stdoutBuffer;
    let settled = false;

    const finish = (fn: () => void): void => {
      if (settled) return;
      settled = true;
      proc.stdout?.off('data', onData);
      proc.off('close', onClose);
      proc.off('error', onError);
      clearTimeout(timer);
      fn();
    };

    const onData = (chunk: unknown): void => {
      buffer += assertUtf8Chunk(chunk);

      // Пытаемся найти JSON-RPC ответ в буфере
      const lines = buffer.split('\n');
      for (const line of lines) {
        if (!line.trim()) continue;

        try {
          const parsed = JSON.parse(line) as JSONRPCResponse;
          if (parsed.jsonrpc === '2.0' && parsed.id === expectedId) {
            finish(() => resolve(parsed));
            return;
          }
        } catch {
          // Не JSON или неполный JSON, продолжаем ждать
        }
      }
    };

    const onClose = (code: number | null, signal: NodeJS.Signals | null): void => {
      finish(() =>
        reject(
          new Error(
            `Процесс закрылся (code=${code}, signal=${signal}) до ответа на запрос id=${expectedId}.\n` +
              `stderr: ${getStderr()}`
          )
        )
      );
    };

    const onError = (error: Error): void => {
      finish(() =>
        reject(new Error(`Ошибка процесса при ожидании ответа id=${expectedId}: ${error.message}`))
      );
    };

    proc.stdout?.on('data', onData);
    proc.on('close', onClose);
    proc.on('error', onError);

    const timer = setTimeout(() => {
      finish(() =>
        reject(
          new Error(
            `Таймаут (${timeoutMs}ms) ожидания JSON-RPC ответа id=${expectedId}.\n` +
              `stderr: ${getStderr()}`
          )
        )
      );
    }, timeoutMs);
  });
}

/**
 * Ожидание, пока `getStderr()` не будет содержать `pattern`, с резолвом сразу
 * при появлении подстроки — не привязано к фиксированной задержке. Именно
 * это закрывает реальную гонку, из-за которой smoke-тест был нестабилен в
 * CI: прежняя версия ждала фиксированные 1000ms и затем один раз проверяла
 * то, что успело накопиться в stderr — на более медленной/загруженной
 * машине проверка могла отработать раньше, чем предупреждение было
 * напечатано.
 *
 * Также завершается раньше таймаута, если процесс закрылся/упал до
 * появления подстроки, и всегда включает накопленный stderr в текст ошибки,
 * чтобы падение было диагностируемо без повторного прогона.
 */
async function waitForStderrSubstring(
  child: ReturnType<typeof spawn>,
  pattern: string,
  getStderr: () => string,
  timeoutMs: number
): Promise<void> {
  // Данные могли прийти (и уже быть накоплены слушателем 'data' вызывающей
  // стороны) ещё до вызова этой функции.
  if (getStderr().includes(pattern)) {
    return;
  }

  return new Promise<void>((resolve, reject) => {
    let settled = false;

    const finish = (fn: () => void): void => {
      if (settled) return;
      settled = true;
      child.stderr?.off('data', onData);
      child.off('close', onClose);
      child.off('error', onError);
      clearTimeout(timer);
      fn();
    };

    const onData = (): void => {
      if (getStderr().includes(pattern)) {
        finish(resolve);
      }
    };

    const onClose = (code: number | null, signal: NodeJS.Signals | null): void => {
      finish(() =>
        reject(
          new Error(
            `Процесс закрылся (code=${code}, signal=${signal}) до появления "${pattern}" в stderr.\n` +
              `stderr so far: ${getStderr()}`
          )
        )
      );
    };

    const onError = (error: Error): void => {
      finish(() =>
        reject(new Error(`Ошибка процесса до появления "${pattern}" в stderr: ${error.message}`))
      );
    };

    child.stderr?.on('data', onData);
    child.on('close', onClose);
    child.on('error', onError);

    const timer = setTimeout(() => {
      finish(() =>
        reject(
          new Error(
            `Таймаут (${timeoutMs}ms) ожидания "${pattern}" в stderr.\n` +
              `stderr so far: ${getStderr()}`
          )
        )
      );
    }, timeoutMs);
  });
}

const MISMATCH_CONTEXT_CHARS = 120;

/**
 * Единственный разрешённый способ превратить чанк потока в строку.
 *
 * Наивный `chunk.toString()` декодирует каждый чанк независимо и рвёт
 * многобайтный UTF-8 на границе чанка: буква превращается в два U+FFFD, длина
 * ответа меняется на символ. Именно это давало «два последовательных
 * tools/list вернули разные списки» в релизном CI (4 падения из 6). Поэтому
 * потоки переводятся в `setEncoding('utf8')` — один разделяемый декодер на
 * поток, корректно склеивающий последовательность через границу чанка, — а
 * эта проверка не даёт молча вернуться к побайтовому декодированию.
 */
function assertUtf8Chunk(chunk: unknown): string {
  if (typeof chunk !== 'string') {
    throw new Error(
      'Поток дочернего процесса не переведён в setEncoding("utf8") — пришёл Buffer. ' +
        'Декодирование чанка по отдельности рвёт многобайтный UTF-8 на границе чанка.'
    );
  }
  return chunk;
}

/**
 * U+FFFD в ответе сервера означает не баг сервера, а испорченное чтение на
 * стороне теста. Проверка стоит на зелёном пути специально: порча,
 * случившаяся одинаково в обоих ответах, расхождения не даёт и иначе прошла
 * бы молча.
 */
function assertNoDecodingDamage(label: string, json: string): void {
  const at = json.indexOf('\uFFFD');
  if (at < 0) {
    return;
  }
  const window = json.slice(Math.max(0, at - MISMATCH_CONTEXT_CHARS), at + MISMATCH_CONTEXT_CHARS);
  throw new Error(
    `${label}: в ответе найден U+FFFD на индексе ${at}. Это ДЕФЕКТ ЧТЕНИЯ на стороне ` +
      'теста, а не сервера: многобайтный UTF-8 порвался на границе чанка. Проверь, что ' +
      `поток переведён в setEncoding("utf8") и чанки не декодируются поштучно.\n  ${JSON.stringify(window)}`
  );
}

function toolNamesForDiagnostics(tools: unknown): string[] {
  if (!Array.isArray(tools)) {
    return [];
  }
  return tools.map((tool, index) => {
    const name = (tool as { name?: unknown } | null)?.name;
    return typeof name === 'string' ? name : `<no-name@${index}>`;
  });
}

function duplicatedNames(names: string[]): string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const name of names) {
    if (seen.has(name)) {
      duplicates.add(name);
    }
    seen.add(name);
  }
  return [...duplicates];
}

/**
 * Отчёт о расхождении двух ответов `tools/list`; `undefined`, когда списки
 * побайтово совпадают.
 *
 * Единственный источник данных о четырёх падениях релиза — лог GitHub Actions,
 * поэтому отчёт должен быть самодостаточным: по нему решают, что именно
 * разошлось, без повторного прогона (который локально не воспроизводится).
 */
function describeToolsListMismatch(first: unknown, second: unknown): string | undefined {
  const firstJson = JSON.stringify(first ?? []);
  const secondJson = JSON.stringify(second ?? []);
  if (firstJson === secondJson) {
    return undefined;
  }

  const lines: string[] = ['===== tools/list mismatch diagnostics ====='];
  lines.push(`json length: first=${firstJson.length}, second=${secondJson.length} (UTF-16 units)`);

  let diffAt = 0;
  while (
    diffAt < firstJson.length &&
    diffAt < secondJson.length &&
    firstJson[diffAt] === secondJson[diffAt]
  ) {
    diffAt += 1;
  }
  const from = Math.max(0, diffAt - MISMATCH_CONTEXT_CHARS);
  const to = diffAt + MISMATCH_CONTEXT_CHARS;
  lines.push(`first difference at index ${diffAt}; window [${from}, ${to}):`);
  lines.push(`  first : ${JSON.stringify(firstJson.slice(from, to))}`);
  lines.push(`  second: ${JSON.stringify(secondJson.slice(from, to))}`);

  const firstNames = toolNamesForDiagnostics(first);
  const secondNames = toolNamesForDiagnostics(second);
  lines.push(`tool count: first=${firstNames.length}, second=${secondNames.length}`);
  if (firstJson.includes('\uFFFD') || secondJson.includes('\uFFFD')) {
    lines.push(
      'ВЕРДИКТ: в ответе есть U+FFFD — это дефект ЧТЕНИЯ на стороне теста ' +
        '(многобайтный UTF-8 порван на границе чанка), а не расхождение на стороне сервера.'
    );
  }

  const firstSet = new Set(firstNames);
  const secondSet = new Set(secondNames);
  const onlyInFirst = [...firstSet].filter((name) => !secondSet.has(name));
  const onlyInSecond = [...secondSet].filter((name) => !firstSet.has(name));
  lines.push(`only in first (${onlyInFirst.length}): ${onlyInFirst.join(', ') || '-'}`);
  lines.push(`only in second (${onlyInSecond.length}): ${onlyInSecond.join(', ') || '-'}`);

  const firstDuplicates = duplicatedNames(firstNames);
  const secondDuplicates = duplicatedNames(secondNames);
  if (firstDuplicates.length > 0 || secondDuplicates.length > 0) {
    lines.push(
      `duplicate names: first=[${firstDuplicates.join(', ')}], second=[${secondDuplicates.join(', ')}]`
    );
  }

  if (onlyInFirst.length === 0 && onlyInSecond.length === 0) {
    const reordered = firstNames
      .map((name, index) =>
        secondNames[index] === name
          ? undefined
          : `#${index}: ${name} -> ${secondNames[index] ?? '<missing>'}`
      )
      .filter((entry): entry is string => entry !== undefined);
    lines.push(
      reordered.length === 0
        ? 'name order: identical (names and order match, so the difference is inside tool definitions - see the window above)'
        : `name order differs at ${reordered.length} position(s), first 20: ${reordered.slice(0, 20).join('; ')}`
    );
  }

  return lines.join('\n');
}

/**
 * Главная функция smoke-теста
 */
async function main(): Promise<void> {
  console.log('🚀 Запуск smoke-теста Yandex Wiki MCP сервера...\n');

  let serverProcess: ReturnType<typeof spawn> | null = null;
  let timeoutId: NodeJS.Timeout | null = null;

  try {
    // Устанавливаем глобальный таймаут
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => {
        reject(new Error(`Тест превысил таймаут ${TIMEOUT_MS}ms`));
      }, TIMEOUT_MS);
    });

    // Запускаем тест с таймаутом
    await Promise.race([
      (async () => {
        await runSmokeTest();
        await runDeprecatedEnvVarSmokeTest();
      })(),
      timeoutPromise,
    ]);

    console.log('\n✅ Smoke-тест успешно пройден!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Smoke-тест провален:', (error as Error).message);
    process.exit(1);
  } finally {
    // Очищаем таймаут
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    // Убиваем процесс сервера если он всё ещё работает.
    // Каст: serverProcess присваивается ТОЛЬКО внутри вложенных
    // runSmokeTest()/runDeprecatedEnvVarSmokeTest() (замыкание) — TS не
    // связывает это присваивание с внешней областью видимости и в finally
    // сужает тип до `null` (истинностная проверка ниже даёт `never`), хотя
    // рантайм-присваивание реально происходит до входа в finally.
    const proc = serverProcess as ReturnType<typeof spawn> | null;
    if (proc && !proc.killed) {
      console.log('\n🛑 Останавливаем сервер...');
      proc.kill('SIGTERM');

      // Даём 2 секунды на graceful shutdown
      await sleep(2000);

      if (!proc.killed) {
        console.log('⚠️  Сервер не ответил на SIGTERM, отправляем SIGKILL...');
        proc.kill('SIGKILL');
      }
    }
  }

  /**
   * Основная логика smoke-теста
   */
  async function runSmokeTest(): Promise<void> {
    // 1. Запускаем сервер
    console.log('1️⃣  Запуск сервера: node dist/yandex-wiki.bundle.cjs');
    serverProcess = spawn('node', ['dist/yandex-wiki.bundle.cjs'], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: {
        ...process.env,
        LOG_LEVEL: 'error', // Минимальный уровень логирования
        YANDEX_WIKI_TOKEN: 'OAuth dummy-token-for-smoke-test', // Фейковый токен для теста
        YANDEX_ORG_ID: '123456', // Фейковый ID организации для теста
        // tools/list всегда отдаёт полный список (lazy discovery убран, DoD 2.1)
      },
    });

    // Буферы для stdout/stderr
    let stdoutData = '';
    let stderrData = '';

    // Один разделяемый декодер на поток (см. assertUtf8Chunk): и stdout, и
    // stderr читают несколько слушателей, побайтовое декодирование каждым из
    // них рвало бы кириллицу на границе чанка.
    serverProcess.stdout?.setEncoding('utf8');
    serverProcess.stderr?.setEncoding('utf8');

    serverProcess.stdout?.on('data', (chunk: unknown) => {
      stdoutData += assertUtf8Chunk(chunk);
    });

    serverProcess.stderr?.on('data', (chunk: unknown) => {
      stderrData += assertUtf8Chunk(chunk);
    });

    // Обработка ошибок запуска
    serverProcess.on('error', (error) => {
      throw new Error(`Не удалось запустить сервер: ${error.message}`);
    });

    serverProcess.on('exit', (code, signal) => {
      if (code !== null && code !== 0) {
        throw new Error(`Сервер неожиданно завершился с кодом ${code}\nstderr: ${stderrData}`);
      }
      if (signal && signal !== 'SIGTERM' && signal !== 'SIGKILL') {
        throw new Error(`Сервер был убит сигналом ${signal}\nstderr: ${stderrData}`);
      }
    });

    // Фиксированной паузы перед первым запросом больше нет: запись в stdin
    // буферизуется ОС-пайпом независимо от того, успел ли дочерний процесс
    // стартовать, а waitForJSONRPCResponse() ниже ждёт реального события
    // ответа (со своим таймаутом) — ждать здесь нечего.

    // 2. Отправляем JSON-RPC запрос tools/list
    console.log('\n2️⃣  Отправка JSON-RPC запроса: tools/list');
    const request: JSONRPCRequest = {
      jsonrpc: '2.0',
      method: 'tools/list',
      id: 1,
    };

    serverProcess.stdin?.write(JSON.stringify(request) + '\n');
    console.log('   Запрос отправлен, ожидание ответа...');

    // 3. Ожидаем ответ
    const response = await waitForJSONRPCResponse(
      stdoutData,
      serverProcess,
      1,
      () => stderrData,
      RESPONSE_WAIT_TIMEOUT_MS
    );

    // 4. Валидируем ответ
    console.log('\n3️⃣  Валидация ответа');
    validateResponse(response);

    console.log('   ✓ Ответ валиден');
    console.log(`   ✓ Найдено ${response.result?.tools?.length ?? 0} инструментов`);

    // 5. DoD 2.1: два последовательных tools/list дают побайтово одинаковый список
    console.log('\n4️⃣  Проверка детерминированности порядка (второй tools/list)');
    const secondRequest: JSONRPCRequest = { jsonrpc: '2.0', method: 'tools/list', id: 2 };
    serverProcess.stdin?.write(JSON.stringify(secondRequest) + '\n');
    const secondResponse = await waitForJSONRPCResponse(
      stdoutData,
      serverProcess,
      2,
      () => stderrData,
      RESPONSE_WAIT_TIMEOUT_MS
    );

    assertNoDecodingDamage('tools/list', JSON.stringify(response.result?.tools));
    const mismatch = describeToolsListMismatch(
      response.result?.tools,
      secondResponse.result?.tools
    );
    if (mismatch !== undefined) {
      console.log(mismatch);
      throw new Error(
        'Два последовательных tools/list вернули РАЗНЫЙ список — нарушен контракт ' +
          `детерминированного порядка (см. ToolSorter.sortByPriority).\n${mismatch}`
      );
    }
    console.log('   ✓ Список побайтово идентичен');
  }

  /**
   * Валидация JSON-RPC ответа
   */
  function validateResponse(response: JSONRPCResponse): void {
    // Проверяем базовую структуру JSON-RPC
    if (response.jsonrpc !== '2.0') {
      throw new Error(`Невалидная версия JSON-RPC: ${response.jsonrpc}`);
    }

    if (response.id !== 1) {
      throw new Error(`Невалидный id ответа: ${response.id}`);
    }

    // Проверяем отсутствие ошибок
    if (response.error) {
      throw new Error(`Сервер вернул ошибку: [${response.error.code}] ${response.error.message}`);
    }

    // Проверяем наличие result
    if (!response.result) {
      throw new Error('Отсутствует поле result в ответе');
    }

    // Проверяем наличие tools
    if (!response.result.tools || !Array.isArray(response.result.tools)) {
      throw new Error('Отсутствует или невалидное поле tools в result');
    }

    // Проверяем, что список инструментов не пустой
    if (response.result.tools.length === 0) {
      throw new Error('Список инструментов пустой');
    }

    // Проверяем минимальное количество инструментов (должно быть >= 5)
    const MIN_EXPECTED_TOOLS = 5;
    if (response.result.tools.length < MIN_EXPECTED_TOOLS) {
      const toolNames = response.result.tools.map((t) => t.name).join(', ');
      throw new Error(
        `Ожидалось минимум ${MIN_EXPECTED_TOOLS} инструментов, получено ${response.result.tools.length}. ` +
          `Инструменты: ${toolNames}`
      );
    }

    // Проверяем структуру первого инструмента
    const firstTool = response.result.tools[0];
    if (!firstTool || typeof firstTool.name !== 'string') {
      throw new Error('Невалидная структура инструмента (отсутствует name)');
    }

    // Проверяем наличие критически важных инструментов
    const toolNames = response.result.tools.map((t) => t.name);
    const requiredTools = ['yw_ping']; // С подчеркиванием (автонормализация в buildToolName)
    for (const requiredTool of requiredTools) {
      if (!toolNames.includes(requiredTool)) {
        throw new Error(
          `Критический инструмент "${requiredTool}" отсутствует в списке. ` +
            `Доступные: ${toolNames.join(', ')}`
        );
      }
    }

    // Проверяем, что search_tools НЕ присутствует — пакет @fractalizer/mcp-search удалён,
    // прогрессивное раскрытие инструментов больше не поддерживается сервером
    if (toolNames.includes('search_tools') || toolNames.includes('yw_search_tools')) {
      throw new Error(
        'Инструмент search_tools присутствует в списке, хотя пакет mcp-search удалён.'
      );
    }
  }
}

/**
 * DoD 2.1.A: устаревшая переменная окружения TOOL_DISCOVERY_MODE не должна ронять
 * сервер — только предупреждать в stderr и продолжать штатную работу.
 *
 * Отдельный процесс, отдельный жизненный цикл (собственный запуск/останов),
 * т.к. переменная окружения задаётся только на старте.
 */
async function runDeprecatedEnvVarSmokeTest(): Promise<void> {
  console.log('\n5️⃣  Проверка предупреждения о TOOL_DISCOVERY_MODE (устаревшая переменная)');

  const child = spawn('node', ['dist/yandex-wiki.bundle.cjs'], {
    stdio: ['pipe', 'pipe', 'pipe'],
    env: {
      ...process.env,
      LOG_LEVEL: 'error',
      YANDEX_WIKI_TOKEN: 'OAuth dummy-token-for-smoke-test',
      YANDEX_ORG_ID: '123456',
      TOOL_DISCOVERY_MODE: 'eager', // Переменная больше не поддерживается — должна дать warning, не падение
    },
  });

  let stdoutData = '';
  let stderrData = '';
  child.stdout?.setEncoding('utf8');
  child.stderr?.setEncoding('utf8');
  child.stdout?.on('data', (chunk: unknown) => {
    stdoutData += assertUtf8Chunk(chunk);
  });
  child.stderr?.on('data', (chunk: unknown) => {
    stderrData += assertUtf8Chunk(chunk);
  });

  try {
    // Событийное ожидание: резолвится сразу, как только строка предупреждения
    // попала в stderr, либо падает раньше срока (со всем накопленным
    // stderr), если процесс закрылся/упал первым — вместо однократной
    // проверки буфера после фиксированной паузы.
    await waitForStderrSubstring(
      child,
      'TOOL_DISCOVERY_MODE',
      () => stderrData,
      STDERR_PATTERN_TIMEOUT_MS
    );
    console.log('   ✓ Предупреждение в stderr есть, сервер не упал');

    // Сервер должен продолжать штатно отвечать на tools/list
    const request: JSONRPCRequest = { jsonrpc: '2.0', method: 'tools/list', id: 1 };
    child.stdin?.write(JSON.stringify(request) + '\n');

    const response = await waitForJSONRPCResponse(
      stdoutData,
      child,
      1,
      () => stderrData,
      RESPONSE_WAIT_TIMEOUT_MS
    );

    if (response.error || !response.result?.tools?.length) {
      throw new Error(`tools/list не отработал штатно после warning: ${JSON.stringify(response)}`);
    }
    console.log(
      `   ✓ tools/list продолжает работать (${response.result.tools.length} инструментов)`
    );
  } finally {
    if (!child.killed) {
      child.kill('SIGTERM');
      await sleep(1000);
      if (!child.killed) {
        child.kill('SIGKILL');
      }
    }
  }
}

// Запуск
main().catch((error) => {
  console.error('💥 Критическая ошибка:', error);
  process.exit(1);
});
