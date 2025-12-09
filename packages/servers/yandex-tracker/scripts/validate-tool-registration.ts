/**
 * Валидация регистрации Tools и Operations для Yandex Tracker
 *
 * Использует универсальный валидатор из @mcp-framework/core
 *
 * Запуск: npm run validate:tools
 */

import { resolve } from 'node:path';
import { runValidation, getScriptDir } from '@mcp-framework/core';
import { TOOL_CLASSES } from '../src/composition-root/definitions/tool-definitions.js';
import { OPERATION_CLASSES } from '../src/composition-root/definitions/operation-definitions.js';

const scriptDir = getScriptDir(import.meta.url);

runValidation({
  serverName: 'yandex-tracker',
  srcPath: resolve(scriptDir, '../src'),
  toolsPath: 'tools',
  toolClasses: TOOL_CLASSES,

  // Operations специфичны для yandex-tracker
  operationClasses: OPERATION_CLASSES,
  operationsPath: 'tracker_api/api_operations',

  // Специфичные паттерны для yandex-tracker
  destructivePatterns: ['update', 'delete', 'transition_issue', 'execute', 'bulk', 'batch'],
  readOnlyPatterns: ['get', 'find', 'search', 'list'],
}).catch((error) => {
  console.error('❌ Ошибка при валидации:', error);
  process.exit(1);
});
