#!/usr/bin/env tsx
/**
 * Тест для проверки логирования ошибки "tool not found"
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
  result?: unknown;
  error?: {
    code: number;
    message: string;
  };
}

async function main(): Promise<void> {
  console.log('🚀 Тест логирования "tool not found"\n');

  let serverProcess: ReturnType<typeof spawn> | null = null;

  try {
    // Запускаем сервер с логированием в stderr
    console.log('1️⃣  Запуск сервера с уровнем логирования DEBUG');
    serverProcess = spawn('node', ['dist/yandex-tracker.bundle.cjs'], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: {
        ...process.env,
        LOG_LEVEL: 'debug', // ❗ Включаем подробное логирование
        YANDEX_TRACKER_TOKEN: 'dummy-token',
        YANDEX_ORG_ID: '123456',
        PRETTY_LOGS: 'true', // Pretty-print для читаемости
        LOGS_DIR: './logs-smoke-test', // ❗ Включаем логирование в файлы
      },
    });

    let stdoutData = '';
    let stderrData = '';

    serverProcess.stdout?.on('data', (data) => {
      stdoutData += data.toString();
    });

    serverProcess.stderr?.on('data', (data) => {
      const chunk = data.toString();
      stderrData += chunk;
      // Выводим stderr в реальном времени для отладки
      process.stderr.write(chunk);
    });

    serverProcess.on('error', (error) => {
      throw new Error(`Не удалось запустить сервер: ${error.message}`);
    });

    // Даём серверу время на запуск
    await sleep(1500);

    // 2. Отправляем запрос на вызов НЕСУЩЕСТВУЮЩЕГО инструмента
    console.log('\n2️⃣  Тест 1: Вызов с префиксом сервера (как Claude Desktop)');
    const testName1 = "FractalizeR's Yandex Tracker MCP:fr_yandex_tracker_find_issues";
    console.log(`   Имя инструмента: "${testName1}"`);

    const request1: JSONRPCRequest = {
      jsonrpc: '2.0',
      method: 'tools/call',
      id: 1,
      params: {
        name: testName1,
        arguments: { query: 'test' },
      },
    };

    serverProcess.stdin?.write(JSON.stringify(request1) + '\n');
    await sleep(1000);

    // 3. Отправляем второй запрос - просто несуществующий инструмент
    console.log('\n3️⃣  Тест 2: Вызов несуществующего инструмента БЕЗ префикса');
    const testName2 = 'nonexistent_tool';
    console.log(`   Имя инструмента: "${testName2}"`);

    const request2: JSONRPCRequest = {
      jsonrpc: '2.0',
      method: 'tools/call',
      id: 2,
      params: {
        name: testName2,
        arguments: {},
      },
    };

    serverProcess.stdin?.write(JSON.stringify(request2) + '\n');
    await sleep(1000);

    // 4. Отправляем третий запрос - существующий инструмент для контроля
    console.log('\n4️⃣  Тест 3: Вызов существующего инструмента (для контроля)');
    const testName3 = 'ping';
    console.log(`   Имя инструмента: "${testName3}"`);

    const request3: JSONRPCRequest = {
      jsonrpc: '2.0',
      method: 'tools/call',
      id: 3,
      params: {
        name: testName3,
        arguments: {},
      },
    };

    serverProcess.stdin?.write(JSON.stringify(request3) + '\n');
    await sleep(1000);

    // 5. Анализ stderr логов
    console.log('\n\n5️⃣  Анализ логов в stderr:');
    console.log('─'.repeat(60));

    // Проверяем наличие сообщения "Инструмент не найден" для теста 1
    const errorLog1 = stderrData.includes('Инструмент не найден');
    const errorLog1Name = stderrData.includes(testName1);

    console.log(`\n📝 Тест 1 - "${testName1}"`);
    console.log(`   ✓ Сообщение "Инструмент не найден" в логах: ${errorLog1 ? '✅ ДА' : '❌ НЕТ'}`);
    console.log(`   ✓ Имя инструмента в логах: ${errorLog1Name ? '✅ ДА' : '❌ НЕТ'}`);

    // Проверяем наличие сообщения для теста 2
    const errorLog2 = stderrData.includes(testName2);

    console.log(`\n📝 Тест 2 - "${testName2}"`);
    console.log(`   ✓ Имя инструмента в логах: ${errorLog2 ? '✅ ДА' : '❌ НЕТ'}`);

    // Проверяем успешный вызов для теста 3
    const successLog3 =
      stderrData.includes('выполнен успешно') || stderrData.includes('Вызов инструмента: ping');

    console.log(`\n📝 Тест 3 - "${testName3}" (контроль)`);
    console.log(`   ✓ Успешный вызов в логах: ${successLog3 ? '✅ ДА' : '❌ НЕТ'}`);

    console.log('\n' + '─'.repeat(60));

    // 6. Итоги
    console.log('\n6️⃣  Итоги:');
    if (!errorLog1) {
      console.log('   ⚠️  STDERR: Ошибка "tool not found" НЕ видна в stderr');
    } else {
      console.log('   ✅ STDERR: Ошибка "tool not found" корректно логируется');
    }

    if (errorLog1Name) {
      console.log('   ⚠️  ВАЖНО: Префикс "FractalizeR\'s Yandex Tracker MCP:" попадает в логи');
      console.log('      Это означает, что клиент передает ПОЛНОЕ имя с префиксом!');
    }

    // 7. Проверяем файлы логов
    console.log('\n7️⃣  Проверка файлов логов (logs-smoke-test/):');
    await sleep(1000); // Даем время на запись логов

    const fs = await import('node:fs/promises');
    const path = await import('node:path');

    try {
      const logsDir = './logs-smoke-test';
      const combinedLogPath = path.join(logsDir, 'combined.log');
      const errorLogPath = path.join(logsDir, 'error.log');

      let combinedLogExists = false;
      let errorLogExists = false;

      try {
        await fs.access(combinedLogPath);
        combinedLogExists = true;
      } catch {
        // Файл не существует
      }

      try {
        await fs.access(errorLogPath);
        errorLogExists = true;
      } catch {
        // Файл не существует
      }

      console.log(`   - combined.log: ${combinedLogExists ? '✅ создан' : '❌ не создан'}`);
      console.log(`   - error.log: ${errorLogExists ? '✅ создан' : '❌ не создан'}`);

      if (combinedLogExists) {
        const combinedContent = await fs.readFile(combinedLogPath, 'utf-8');
        const hasErrorLog = combinedContent.includes('Инструмент не найден');
        const hasNormalizedLog = combinedContent.includes('Убран префикс сервера');

        console.log(`\n   📄 combined.log (${combinedContent.length} байт):`);
        console.log(`      - "Инструмент не найден": ${hasErrorLog ? '✅ ДА' : '❌ НЕТ'}`);
        console.log(`      - "Убран префикс сервера": ${hasNormalizedLog ? '✅ ДА' : '❌ НЕТ'}`);

        if (hasErrorLog && hasNormalizedLog) {
          console.log('\n   ✅ УСПЕХ: Оба исправления работают!');
          console.log('      1. Logger пишет в файлы при PRETTY_LOGS=true');
          console.log('      2. Префикс сервера корректно удаляется');
        }
      }
    } catch (err) {
      console.log(`   ❌ Ошибка при чтении логов: ${(err as Error).message}`);
    }

    console.log('\n✅ Тест завершен');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Ошибка теста:', (error as Error).message);
    process.exit(1);
  } finally {
    if (serverProcess && !serverProcess.killed) {
      serverProcess.kill('SIGTERM');
      await sleep(500);
      if (!serverProcess.killed) {
        serverProcess.kill('SIGKILL');
      }
    }
  }
}

main().catch((error) => {
  console.error('💥 Критическая ошибка:', error);
  process.exit(1);
});
