import { defineConfig, mergeConfig } from 'vitest/config';
import path from 'node:path';
import { sharedConfig } from '../../../vitest.shared';

// vite-tsconfig-paths здесь НЕ подключён намеренно. Плагин ломает Node.js
// subpath imports (`#tools/*`, `#composition-root/*` из package.json): он режет
// спецификатор по `#` как по URL-фрагменту, резолвит пустой остаток в
// `exports["."]` пакета и отдаёт `dist/index.js#tools/ping.tool.js`. Пока
// `dist/index.js` не собран, промах не виден; после сборки весь `src/**`
// подменяется бандлом, ESM-граф замыкается и TOOL_CLASSES приходит массивом
// undefined. Резолвить `#`-импорты Vite умеет сам, а `paths` в tsconfig нет ни
// одного — плагину тут нечего делать.
export default mergeConfig(
  sharedConfig,
  defineConfig({
    test: {
      // Package-specific настройки
      name: 'yandex-tracker',
      // Performance monitoring: warn about tests slower than 300ms
      slowTestThreshold: 300,
      // Исключить legacy тесты (сохранены для rollback, но не запускаются)
      exclude: [
        '**/node_modules/**',
        '**/dist/**',
        '**/.{git,cache,output,temp}/**',
        'tests/cli-legacy/**',
      ],
    },
    resolve: {
      alias: {
        // Framework packages (междупакетные зависимости для vitest)
        '@fractalizer/mcp-core': path.resolve(__dirname, '../../framework/core/src'),
        '@fractalizer/mcp-core/*': path.resolve(__dirname, '../../framework/core/src/*'),
        '@fractalizer/mcp-infrastructure': path.resolve(
          __dirname,
          '../../framework/infrastructure/src'
        ),
        '@fractalizer/mcp-infrastructure/*': path.resolve(
          __dirname,
          '../../framework/infrastructure/src/*'
        ),
      },
    },
  })
);
