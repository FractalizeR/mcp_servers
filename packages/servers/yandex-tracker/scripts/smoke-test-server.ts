#!/usr/bin/env tsx
/**
 * Smoke-тест MCP сервера
 *
 * Проверяет на РЕАЛЬНОМ собранном бандле (единственное место, где это делается
 * end-to-end, а не через мок ServerConfig):
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
 * 2. **DI Container** (`tests/smoke/di-container.smoke.test.ts`)
 *    - Проверка инициализации DI container
 *    - Резолв всех базовых зависимостей
 *
 * 3. **E2E Tool Execution** (`tests/smoke/e2e-tool-execution.smoke.test.ts`)
 *    - Проверка полного flow: Tool → Operation → DTO
 *    - Использует mock HttpClient
 *
 * 4. **API Connectivity** (`tests/smoke/api-connectivity.smoke.test.ts`)
 *    - Проверка реального подключения к Yandex Tracker API
 *    - УСЛОВНЫЙ: запускается только если установлен YANDEX_TRACKER_TOKEN
 *    - В CI пропускается (test.skipIf)
 *
 * **Запуск всех smoke тестов:**
 * ```bash
 * npm run test:smoke  # Все smoke тесты (кроме api-connectivity без токена)
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

const TIMEOUT_MS = 20000; // 20 секунд на весь тест (основной сценарий + отдельный процесс для DoD 2.1.A)
const SERVER_STARTUP_DELAY_MS = 1000; // 1 секунда на запуск сервера

/**
 * Главная функция smoke-теста
 */
async function main(): Promise<void> {
  console.log('🚀 Запуск smoke-теста MCP сервера...\n');

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
    // TS не умеет отследить присваивание `serverProcess = spawn(...)` внутри
    // вложенной `runSmokeTest()` через границу `await runSmokeTest()` — без
    // явного каста CFA считает переменную здесь всегда `null` (сужает `if`
    // до `never`). Рантайм-поведение корректно (одна и та же переменная
    // захвачена замыканием), это чисто сигнатурное ограничение компилятора.
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
    console.log('1️⃣  Запуск сервера: node dist/yandex-tracker.bundle.cjs');
    serverProcess = spawn('node', ['dist/yandex-tracker.bundle.cjs'], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: {
        ...process.env,
        LOG_LEVEL: 'error', // Минимальный уровень логирования
        YANDEX_TRACKER_TOKEN: 'dummy-token-for-smoke-test', // Фейковый токен для теста
        YANDEX_ORG_ID: '123456', // Фейковый ID организации для теста
        // tools/list всегда отдаёт полный список (lazy discovery убран, DoD 2.1)
      },
    });

    // Буферы для stdout/stderr
    let stdoutData = '';
    let stderrData = '';

    serverProcess.stdout?.on('data', (data) => {
      stdoutData += data.toString();
    });

    serverProcess.stderr?.on('data', (data) => {
      stderrData += data.toString();
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

    // Даём серверу время на запуск
    console.log(`   Ожидание запуска сервера (${SERVER_STARTUP_DELAY_MS}ms)...`);
    await sleep(SERVER_STARTUP_DELAY_MS);

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
    const response = await waitForJSONRPCResponse(stdoutData, serverProcess, 1);

    // 4. Валидируем ответ
    console.log('\n3️⃣  Валидация ответа');
    validateResponse(response);

    console.log('   ✓ Ответ валиден');
    console.log(`   ✓ Найдено ${response.result?.tools?.length ?? 0} инструментов`);

    // 5. DoD 2.1: два последовательных tools/list дают побайтово одинаковый список
    console.log('\n4️⃣  Проверка детерминированности порядка (второй tools/list)');
    const secondRequest: JSONRPCRequest = { jsonrpc: '2.0', method: 'tools/list', id: 2 };
    serverProcess.stdin?.write(JSON.stringify(secondRequest) + '\n');
    const secondResponse = await waitForJSONRPCResponse(stdoutData, serverProcess, 2);

    const firstToolsJson = JSON.stringify(response.result?.tools ?? []);
    const secondToolsJson = JSON.stringify(secondResponse.result?.tools ?? []);
    if (firstToolsJson !== secondToolsJson) {
      throw new Error(
        'Два последовательных tools/list вернули РАЗНЫЙ список — нарушен контракт ' +
          'детерминированного порядка (см. ToolSorter.sortByPriority).'
      );
    }
    console.log('   ✓ Список побайтово идентичен');
  }

  /**
   * Ожидание JSON-RPC ответа из stdout
   */
  async function waitForJSONRPCResponse(
    stdoutBuffer: string,
    process: ReturnType<typeof spawn>,
    expectedId: number
  ): Promise<JSONRPCResponse> {
    return new Promise((resolve, reject) => {
      let buffer = stdoutBuffer;

      const onData = (data: Buffer) => {
        buffer += data.toString();

        // Пытаемся найти JSON-RPC ответ в буфере
        const lines = buffer.split('\n');
        for (const line of lines) {
          if (!line.trim()) continue;

          try {
            const parsed = JSON.parse(line) as JSONRPCResponse;
            if (parsed.jsonrpc === '2.0' && parsed.id === expectedId) {
              process.stdout?.off('data', onData);
              resolve(parsed);
              return;
            }
          } catch {
            // Не JSON или неполный JSON, продолжаем ждать
          }
        }
      };

      process.stdout?.on('data', onData);

      // Таймаут на получение ответа (5 секунд)
      setTimeout(() => {
        process.stdout?.off('data', onData);
        reject(new Error('Таймаут ожидания ответа от сервера (5000ms)'));
      }, 5000);
    });
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

    // Проверяем минимальное количество инструментов (должно быть >= 10)
    const MIN_EXPECTED_TOOLS = 10;
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
    const requiredTools = ['fr_yandex_tracker_ping'];
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
    if (toolNames.includes('search_tools')) {
      throw new Error(
        'Инструмент "search_tools" присутствует в списке, хотя пакет mcp-search удалён.'
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

  const child = spawn('node', ['dist/yandex-tracker.bundle.cjs'], {
    stdio: ['pipe', 'pipe', 'pipe'],
    env: {
      ...process.env,
      LOG_LEVEL: 'error',
      YANDEX_TRACKER_TOKEN: 'dummy-token-for-smoke-test',
      YANDEX_ORG_ID: '123456',
      TOOL_DISCOVERY_MODE: 'eager', // Переменная больше не поддерживается — должна дать warning, не падение
    },
  });

  let stdoutData = '';
  let stderrData = '';
  child.stdout?.on('data', (data) => {
    stdoutData += data.toString();
  });
  child.stderr?.on('data', (data) => {
    stderrData += data.toString();
  });

  try {
    await sleep(SERVER_STARTUP_DELAY_MS);

    if (child.exitCode !== null || child.killed) {
      throw new Error(
        `Сервер упал при старте с устаревшей TOOL_DISCOVERY_MODE\nstderr: ${stderrData}`
      );
    }

    if (!stderrData.includes('TOOL_DISCOVERY_MODE')) {
      throw new Error(
        `Сервер не напечатал предупреждение о TOOL_DISCOVERY_MODE в stderr.\nstderr: ${stderrData}`
      );
    }
    console.log('   ✓ Предупреждение в stderr есть, сервер не упал');

    // Сервер должен продолжать штатно отвечать на tools/list
    const request: JSONRPCRequest = { jsonrpc: '2.0', method: 'tools/list', id: 1 };
    child.stdin?.write(JSON.stringify(request) + '\n');

    const response = await new Promise<JSONRPCResponse>((resolve, reject) => {
      let buffer = stdoutData;
      const onData = (data: Buffer): void => {
        buffer += data.toString();
        for (const line of buffer.split('\n')) {
          if (!line.trim()) continue;
          try {
            const parsed = JSON.parse(line) as JSONRPCResponse;
            if (parsed.jsonrpc === '2.0' && parsed.id === 1) {
              child.stdout?.off('data', onData);
              resolve(parsed);
              return;
            }
          } catch {
            // неполный JSON, продолжаем ждать
          }
        }
      };
      child.stdout?.on('data', onData);
      setTimeout(() => {
        child.stdout?.off('data', onData);
        reject(new Error('Таймаут ожидания tools/list после TOOL_DISCOVERY_MODE warning (5000ms)'));
      }, 5000);
    });

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
