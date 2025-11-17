#!/usr/bin/env node

/**
 * Простой скрипт для вывода списка зарегистрированных инструментов
 * Не требует токена, так как только читает определения инструментов
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';

// Настроим минимальные переменные окружения для избежания ошибок
process.env.YANDEX_TRACKER_TOKEN = 'fake_token_for_list_only';
process.env.YANDEX_ORG_ID = 'fake_org_for_list_only';
process.env.LOG_LEVEL = 'silent';

// Импортируем код сервера
const { createContainer, TYPES } = await import('../dist/composition-root/index.js');
const { loadConfig } = await import('@mcp-framework/infrastructure');
const { YANDEX_TRACKER_ESSENTIAL_TOOLS, MCP_SERVER_NAME } = await import('../dist/constants.js');

console.log('\n=== Список зарегистрированных MCP инструментов ===\n');
console.log('MCP Server Name:', MCP_SERVER_NAME);
console.log('Essential Tools:', YANDEX_TRACKER_ESSENTIAL_TOOLS);
console.log('');

try {
  // Загрузка конфигурации
  const config = loadConfig();
  const configWithEssentialTools = {
    ...config,
    essentialTools: YANDEX_TRACKER_ESSENTIAL_TOOLS,
    logLevel: 'silent',
  };

  // Создание DI контейнера
  const container = await createContainer(configWithEssentialTools);

  // Получение ToolRegistry
  const toolRegistry = container.get(TYPES.ToolRegistry);

  // Создание тестового MCP сервера
  const server = new Server(
    {
      name: MCP_SERVER_NAME,
      version: '0.0.0-test',
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  // Обработчик списка инструментов
  server.setRequestHandler(ListToolsRequestSchema, () => {
    const definitions = toolRegistry.getDefinitionsByMode(
      configWithEssentialTools.toolDiscoveryMode,
      configWithEssentialTools.essentialTools
    );

    return {
      tools: definitions.map((def) => ({
        name: def.name,
        description: def.description,
        inputSchema: def.inputSchema,
      })),
    };
  });

  // Получаем список инструментов
  const result = await server.request(
    { method: 'tools/list' },
    ListToolsRequestSchema
  );

  console.log(`Всего инструментов: ${result.tools.length}\n`);
  console.log('Имена инструментов (БЕЗ префикса сервера):');
  console.log('─'.repeat(60));

  result.tools.forEach((tool, index) => {
    console.log(`${String(index + 1).padStart(2)}. ${tool.name}`);
  });

  console.log('\n' + '─'.repeat(60));
  console.log('\n⚠️  ВАЖНО:');
  console.log('Эти имена - это то, что регистрирует наш сервер.');
  console.log('Claude Desktop может добавлять префикс сервера при отображении:');
  console.log(`  "${MCP_SERVER_NAME}:fr_yandex_tracker_find_issues"`);
  console.log('или форматированный вариант:');
  console.log('  "FractalizeR\'s Yandex Tracker MCP:fr_yandex_tracker_find_issues"');
  console.log('');
} catch (error) {
  console.error('❌ Ошибка:', error.message);
  if (error.stack) {
    console.error(error.stack);
  }
  process.exit(1);
}
