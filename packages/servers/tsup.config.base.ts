import type { Options } from 'tsup';

/**
 * Базовый конфиг для всех MCP серверов
 *
 * Обеспечивает:
 * - Именованные бандлы для каждого сервера
 * - Единые настройки bundling
 * - Правильный shebang для executable файлов
 * - Внешние зависимости (@modelcontextprotocol/server, @modelcontextprotocol/core)
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
    format: ['cjs'], // CommonJS для полной совместимости с dynamic require
    platform: 'node',
    target: 'node18',
    sourcemap: true,
    clean: true,
    dts: false, // серверы не экспортируют типы
    bundle: true,
    splitting: false, // Отключаем code splitting для единого бандла
    outExtension: () => ({ js: '.cjs' }), // .cjs расширение для CommonJS
    shims: true, // Для корректной работы __dirname и __filename
    external: [
      // MCP SDK v2 (peer dependency). @modelcontextprotocol/core НЕ указан:
      // мы его нигде не импортируем напрямую (только через реэкспорты
      // @modelcontextprotocol/server) — сам server пакет разрешит свою
      // зависимость на core через обычную резолюцию node_modules.
      '@modelcontextprotocol/server',
      // Node.js встроенные модули (всегда external)
      'node:*',
    ],
    noExternal: [
      // Явно бандлим все зависимости (кроме MCP SDK и Node.js модулей)
      /.*/,
    ],
    ...additionalOptions,
  };
}
