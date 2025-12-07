import { defineConfig } from 'tsup';
import { defineServerConfig } from '../tsup.config.base.js';

/**
 * Build конфигурация для TickTick MCP Server
 *
 * Создает бандл:
 * 1. ticktick.bundle.cjs - основной MCP сервер
 */
export default defineConfig([
  // Основной MCP сервер - запускаемый бандл из index.ts
  defineServerConfig('ticktick', {
    entry: { 'ticktick.bundle': 'src/index.ts' },
  }),
]);
