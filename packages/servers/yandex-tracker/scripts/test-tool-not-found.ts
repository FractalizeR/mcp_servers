#!/usr/bin/env tsx

/**
 * Тестовый скрипт для проверки логирования ошибки "tool not found"
 *
 * Проверяет:
 * 1. Вызов несуществующего инструмента через ToolRegistry
 * 2. Логирование ошибки в stderr и лог-файлы
 * 3. Возвращаемое сообщение об ошибке
 */

import { createContainer, TYPES } from '../src/composition-root/index.js';
import type { Logger } from '@fractalizer/mcp-infrastructure';
import type { ToolRegistry } from '@fractalizer/mcp-core';
import { loadConfig } from '@fractalizer/mcp-infrastructure';

async function testToolNotFound(): Promise<void> {
  console.log('\n=== Тест: вызов несуществующего инструмента ===\n');

  // Создаем контейнер с логированием
  const config = loadConfig();

  // Включаем логирование в файлы
  const testConfig = {
    ...config,
    logsDir: '.logs-test',
    logLevel: 'debug' as const,
    prettyLogs: true,
  };

  const container = await createContainer(testConfig);
  const logger = container.get<Logger>(TYPES.Logger);
  const toolRegistry = container.get<ToolRegistry>(TYPES.ToolRegistry);

  console.log('📝 Конфигурация логирования:');
  console.log(`  - Директория логов: ${testConfig.logsDir}`);
  console.log(`  - Уровень: ${testConfig.logLevel}`);
  console.log(`  - Pretty logs: ${testConfig.prettyLogs}`);
  console.log('');

  // Получаем список доступных инструментов
  const availableTools = toolRegistry.getDefinitionsByMode('all', []);
  console.log('🔧 Доступные инструменты:');
  availableTools.forEach((tool, index) => {
    console.log(`  ${index + 1}. ${tool.name}`);
  });
  console.log('');

  // Тестируем вызов НЕСУЩЕСТВУЮЩЕГО инструмента
  const nonExistentToolName = "FractalizeR's Yandex Tracker MCP:fr_yandex_tracker_find_issues";

  console.log(`❌ Попытка вызова несуществующего инструмента: "${nonExistentToolName}"`);
  console.log('   Ожидаем увидеть в stderr:');
  console.log('   - [ERROR] Инструмент не найден: ...');
  console.log('');
  console.log('--- НАЧАЛО ЛОГОВ ---\n');

  const result = await toolRegistry.execute(nonExistentToolName, {});

  console.log('\n--- КОНЕЦ ЛОГОВ ---\n');

  // Анализируем результат
  console.log('📊 Результат вызова:');
  console.log(`  - isError: ${result.isError}`);
  console.log(`  - content type: ${result.content?.[0]?.type}`);

  if (result.content?.[0]?.type === 'text') {
    const responseText = result.content[0].text;
    console.log(`  - response preview: ${responseText.substring(0, 150)}...`);

    try {
      const parsedResponse = JSON.parse(responseText);
      console.log('\n📋 Распарсенный JSON ответ:');
      console.log(`  - success: ${parsedResponse.success}`);
      console.log(`  - message: ${parsedResponse.message}`);
      console.log(`  - availableTools count: ${parsedResponse.availableTools?.length || 0}`);
    } catch {
      console.log('  - Не удалось распарсить JSON');
    }
  }

  console.log('\n✅ Тест завершен. Проверьте логи в .logs-test/ и stderr выше.');
  console.log('');

  // Ждем немного, чтобы логи успели записаться
  await new Promise((resolve) => setTimeout(resolve, 500));

  // Flush логов
  await logger.flush();
}

// Запуск теста
testToolNotFound().catch((error) => {
  console.error('💥 Ошибка при выполнении теста:', error);
  process.exit(1);
});
