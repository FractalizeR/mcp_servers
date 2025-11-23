#!/usr/bin/env node

/**
 * CLI Router с feature flag для безопасного перехода
 *
 * Выбирает между framework-based CLI и legacy CLI
 * в зависимости от переменной окружения USE_FRAMEWORK_CLI
 */

import { USE_FRAMEWORK_CLI, DEBUG_CLI_MIGRATION } from '../feature-flags.js';

if (DEBUG_CLI_MIGRATION) {
  console.log(`[CLI Migration] USE_FRAMEWORK_CLI=${USE_FRAMEWORK_CLI}`);
  console.log(`[CLI Migration] Using ${USE_FRAMEWORK_CLI ? 'framework' : 'legacy'} CLI`);
}

if (USE_FRAMEWORK_CLI) {
  // Новый framework-based CLI
  import('./mcp-connect-framework.js')
    .then(module => module.main())
    .catch(error => {
      console.error('[CLI Migration] Framework CLI failed, falling back to legacy');
      console.error(error);

      // Fallback на legacy при ошибке
      import('../../cli-legacy/bin/mcp-connect.js')
        .then(module => module.main())
        .catch(legacyError => {
          console.error('[CLI Migration] Legacy CLI also failed');
          console.error(legacyError);
          process.exit(1);
        });
    });
} else {
  // Legacy CLI
  if (DEBUG_CLI_MIGRATION) {
    console.log('[CLI Migration] Loading legacy CLI...');
  }

  import('../../cli-legacy/bin/mcp-connect.js')
    .then(module => module.main())
    .catch(error => {
      console.error('CLI failed');
      console.error(error);
      process.exit(1);
    });
}
