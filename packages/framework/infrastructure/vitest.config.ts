import { defineConfig, mergeConfig } from 'vitest/config';
import path from 'node:path';
import tsconfigPaths from 'vite-tsconfig-paths';
import { sharedConfig } from '../../../vitest.shared';

export default mergeConfig(
  sharedConfig,
  defineConfig({
    plugins: [tsconfigPaths()],
    test: {
      // Package-specific настройки
      name: 'infrastructure',
    },
    resolve: {
      alias: {
        // Поддержка subpath imports (например @fractalizer/mcp-infrastructure/config.js)
        '@fractalizer/mcp-infrastructure': path.resolve(__dirname, './src'),
        '@fractalizer/mcp-infrastructure/*': path.resolve(__dirname, './src/*'),
      },
    },
  })
);
