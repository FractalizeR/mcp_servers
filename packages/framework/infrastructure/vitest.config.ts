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
        // Поддержка subpath imports (например @mcp-framework/infrastructure/config.js)
        '@mcp-framework/infrastructure': path.resolve(__dirname, './src'),
        '@mcp-framework/infrastructure/*': path.resolve(__dirname, './src/*'),
      },
    },
  })
);
