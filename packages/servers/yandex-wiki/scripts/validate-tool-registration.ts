/**
 * Валидация регистрации Tools для Yandex Wiki
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
  serverName: 'yandex-wiki',
  srcPath: resolve(scriptDir, '../src'),
  toolsPath: 'tools',
  toolClasses: TOOL_CLASSES,

  // Стандартные паттерны для wiki
  destructivePatterns: ['update', 'delete', 'append', 'bulk', 'batch'],
  readOnlyPatterns: ['get', 'find', 'search', 'list'],
}).catch((error) => {
  console.error('❌ Ошибка при валидации:', error);
  process.exit(1);
});
