import type { Options } from 'tsup';

/**
 * Базовый конфиг для всех MCP серверов
 *
 * Обеспечивает:
 * - Именованные бандлы для каждого сервера
 * - Единые настройки bundling
 * - Правильный shebang для executable файлов
 * - Внешние зависимости (@modelcontextprotocol/sdk)
 * - Bundled framework пакеты
 */
export function defineServerConfig(
  serverName: string,
  additionalOptions: Partial<Options> = {}
): Options {
  return {
    // Используем объектную нотацию для entry, чтобы задать имя выходного файла
    entry: { [`${serverName}.bundle`]: 'src/index.ts' },
    outDir: 'dist',
    format: ['esm'],
    platform: 'node',
    target: 'node18',
    sourcemap: true,
    clean: true,
    dts: false, // серверы не экспортируют типы
    bundle: true,
    outExtension: () => ({ js: '.js' }),
    shims: true, // Для корректной работы __dirname и __filename в ESM
    external: [
      // MCP SDK всегда external (peer dependency)
      '@modelcontextprotocol/sdk',
      // Framework пакеты НЕ external - они будут забандлены
      // чтобы сервер был самодостаточным
    ],
    ...additionalOptions,
  };
}
