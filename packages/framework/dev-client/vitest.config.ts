import { defineConfig, mergeConfig } from 'vitest/config';
import path from 'node:path';
import tsconfigPaths from 'vite-tsconfig-paths';
import { sharedConfig } from '../../../vitest.shared';

export default mergeConfig(
  sharedConfig,
  defineConfig({
    plugins: [tsconfigPaths()],
    test: {
      name: 'dev-client',
      // Интеграционные тесты (DoD 8 пакета 1.1) требуют claude CLI и реальную
      // подключённую запись сервера — не часть validate/validate:quiet, гоняются
      // отдельно через `npm run test:integration` (vitest.integration.config.ts).
      exclude: [
        '**/node_modules/**',
        '**/dist/**',
        '**/.{git,cache,output,temp}/**',
        'tests/integration/**',
      ],
    },
    resolve: {
      alias: {
        '@fractalizer/mcp-dev-client': path.resolve(__dirname, './src'),
        '@fractalizer/mcp-dev-client/*': path.resolve(__dirname, './src/*'),
      },
    },
  })
);
