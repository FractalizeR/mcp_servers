import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/**', 'dist/**', '**/*.test.ts', '**/*.spec.ts', '**/index.ts'],
    },
  },
  resolve: {
    alias: {
      'mcp-server-yandex-tracker': path.resolve(__dirname, './src'),
      '@tracker_api': path.resolve(__dirname, './src/tracker_api'),
      '@tools': path.resolve(__dirname, './src/tools'),
      '@composition-root': path.resolve(__dirname, './src/composition-root'),
      '@integration': path.resolve(__dirname, './tests/integration'),
      '@mcp-framework/search': path.resolve(__dirname, '../search/src'),
      '@mcp-framework/core': path.resolve(__dirname, '../core/src'),
      '@mcp-framework/infrastructure': path.resolve(__dirname, '../infrastructure/src'),
    },
  },
});
