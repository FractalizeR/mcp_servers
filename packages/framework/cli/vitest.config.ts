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
      name: 'cli',
    },
    resolve: {
      alias: {
        // Поддержка subpath imports
        '@mcp-framework/cli': path.resolve(__dirname, './src'),
        '@mcp-framework/cli/*': path.resolve(__dirname, './src/*'),
        '#cli': path.resolve(__dirname, './src'),
        '#cli/*': path.resolve(__dirname, './src/*'),
        '#types': path.resolve(__dirname, './src/types.ts'),
      },
    },
  })
);
