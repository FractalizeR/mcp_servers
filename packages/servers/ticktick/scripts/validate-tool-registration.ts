/**
 * Валидация регистрации Tools для TickTick
 *
 * Использует универсальный валидатор из @fractalizer/mcp-core
 *
 * Запуск: npm run validate:tools
 */

import { resolve } from 'node:path';
import { runValidation, getScriptDir } from '@fractalizer/mcp-core';
import { TOOL_CLASSES } from '../src/composition-root/definitions/tool-definitions.js';

const scriptDir = getScriptDir(import.meta.url);

runValidation({
  serverName: 'ticktick',
  srcPath: resolve(scriptDir, '../src'),
  toolsPath: 'tools',
  toolClasses: TOOL_CLASSES,

  // Исключаем shared/ директорию - это утилиты, а не tools
  toolExcludePatterns: [/\/shared\//],

  // Специфичные паттерны для ticktick (complete - завершение задачи)
  destructivePatterns: ['update', 'delete', 'complete', 'batch', 'bulk'],
  readOnlyPatterns: ['get', 'search'],
}).catch((error) => {
  console.error('❌ Ошибка при валидации:', error);
  process.exit(1);
});
