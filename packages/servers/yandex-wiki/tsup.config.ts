import { defineConfig } from 'tsup';
import { defineServerConfig } from '../tsup.config.base.js';

/**
 * Build конфигурация для Yandex Wiki MCP Server
 *
 * Создает два бандла:
 * 1. yandex-wiki.bundle.cjs - основной MCP сервер
 * 2. mcp-connect.js - CLI инструмент для управления подключениями
 */
export default defineConfig([
  // Основной MCP сервер
  defineServerConfig('yandex-wiki'),

  // CLI инструмент
  {
    entry: ['src/cli/bin/mcp-connect.ts'],
    outDir: 'dist/cli/bin',
    format: ['esm'],
    platform: 'node',
    target: 'node18',
    sourcemap: true,
    bundle: true,
    shims: true,
    external: [
      // CLI зависимости должны быть установлены как npm пакеты
      '@modelcontextprotocol/sdk',
      'axios',
      'inversify',
      'pino',
      'chalk',
      'commander',
      'inquirer',
    ],
  },
]);
