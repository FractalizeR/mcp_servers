#!/usr/bin/env tsx
/**
 * Smoke-тест MCP сервера Yandex Wiki
 *
 * Проверяет:
 * 1. Сервер успешно запускается
 * 2. Отвечает на JSON-RPC запрос tools/list
 * 3. Возвращает валидный список инструментов
 * 4. Сервер корректно завершается
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

const TIMEOUT_MS = 10000; // 10 секунд на весь тест
const SERVER_STARTUP_DELAY_MS = 1000; // 1 секунда на запуск сервера

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
    await Promise.race([runSmokeTest(), timeoutPromise]);

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

    // Убиваем процесс сервера если он всё ещё работает
    if (serverProcess && !serverProcess.killed) {
      console.log('\n🛑 Останавливаем сервер...');
      serverProcess.kill('SIGTERM');

      // Даём 2 секунды на graceful shutdown
      await sleep(2000);

      if (!serverProcess.killed) {
        console.log('⚠️  Сервер не ответил на SIGTERM, отправляем SIGKILL...');
        serverProcess.kill('SIGKILL');
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
        // TOOL_DISCOVERY_MODE: 'eager' (по умолчанию) - тестируем полный список инструментов
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
    const response = await waitForJSONRPCResponse(stdoutData, serverProcess);

    // 4. Валидируем ответ
    console.log('\n3️⃣  Валидация ответа');
    validateResponse(response);

    console.log('   ✓ Ответ валиден');
    console.log(`   ✓ Найдено ${response.result?.tools?.length ?? 0} инструментов`);
  }

  /**
   * Ожидание JSON-RPC ответа из stdout
   */
  async function waitForJSONRPCResponse(
    stdoutBuffer: string,
    process: ReturnType<typeof spawn>
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
            if (parsed.jsonrpc === '2.0' && parsed.id === 1) {
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
    const requiredTools = ['ywping']; // Имя без подчеркивания
    for (const requiredTool of requiredTools) {
      if (!toolNames.includes(requiredTool)) {
        throw new Error(
          `Критический инструмент "${requiredTool}" отсутствует в списке. ` +
            `Доступные: ${toolNames.join(', ')}`
        );
      }
    }

    // Проверяем, что search_tools НЕ присутствует (в eager mode его не должно быть)
    if (toolNames.includes('yw_search_tools')) {
      throw new Error(
        'Инструмент "yw_search_tools" присутствует в списке, хотя сервер работает в eager mode. ' +
          'В eager mode search_tools избыточен.'
      );
    }
  }
}

// Запуск
main().catch((error) => {
  console.error('💥 Критическая ошибка:', error);
  process.exit(1);
});
