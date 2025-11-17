/**
 * Dependency Cruiser Configuration (Monorepo)
 *
 * Валидирует архитектурные правила monorepo:
 * - Граф зависимостей между пакетами
 * - Layered architecture внутри yandex-tracker
 * - Изоляция операций (через Facade)
 * - Запрет циклических зависимостей
 */

/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    // ================================================
    // 1. MONOREPO PACKAGE DEPENDENCY GRAPH
    // ================================================

    {
      name: 'no-reverse-dependencies',
      severity: 'error',
      comment: 'Запрет обратных зависимостей в графе пакетов (infrastructure <- core <- search <- servers)',
      from: {
        path: '^packages/(infrastructure|core|search|framework/(infrastructure|core|search))/',
      },
      to: {
        path: '^packages/(yandex-tracker|servers/)/',
      },
    },

    {
      name: 'infrastructure-bottom-layer',
      severity: 'error',
      comment: 'Infrastructure — базовый слой, не зависит от других framework пакетов',
      from: {
        path: '^packages/(infrastructure|framework/infrastructure)/',
      },
      to: {
        path: '^packages/(core|search|cli|yandex-tracker|framework/(core|search)|servers/)/',
      },
    },

    {
      name: 'core-depends-only-on-infrastructure',
      severity: 'error',
      comment: 'Core может зависеть только от infrastructure',
      from: {
        path: '^packages/(core|framework/core)/',
      },
      to: {
        path: '^packages/(search|cli|yandex-tracker|framework/search|servers/)/',
      },
    },

    {
      name: 'search-depends-only-on-core-and-infrastructure',
      severity: 'error',
      comment: 'Search может зависеть только от core и infrastructure',
      from: {
        path: '^packages/(search|framework/search)/',
      },
      to: {
        path: '^packages/(cli|yandex-tracker|servers/)/',
      },
    },

    {
      name: 'cli-is-independent',
      severity: 'error',
      comment: 'CLI не зависит от других framework пакетов',
      from: {
        path: '^packages/cli/',
      },
      to: {
        path: '^packages/(infrastructure|core|search|yandex-tracker)/',
      },
    },

    // ================================================
    // 2. YANDEX-TRACKER INTERNAL ARCHITECTURE
    // ================================================

    {
      name: 'tracker-api-no-mcp',
      severity: 'error',
      comment: 'tracker_api — низкоуровневый слой, не должен знать о MCP layer',
      from: {
        path: '^packages/(yandex-tracker|servers/yandex-tracker)/src/tracker_api/',
      },
      to: {
        path: '^packages/(yandex-tracker|servers/yandex-tracker)/src/mcp/',
      },
    },

    {
      name: 'mcp-uses-facade-only',
      severity: 'error',
      comment: 'MCP tools должны использовать YandexTrackerFacade, не Operations напрямую',
      from: {
        path: '^packages/(yandex-tracker|servers/yandex-tracker)/src/mcp/',
      },
      to: {
        path: '^packages/(yandex-tracker|servers/yandex-tracker)/src/tracker_api/',
        pathNot: [
          // Разрешены:
          '^packages/(yandex-tracker|servers/yandex-tracker)/src/tracker_api/facade/',     // Facade (основной интерфейс)
          '^packages/(yandex-tracker|servers/yandex-tracker)/src/tracker_api/entities/',   // Entity типы
          '^packages/(yandex-tracker|servers/yandex-tracker)/src/tracker_api/dto/',        // DTO типы
        ],
      },
    },

    {
      name: 'operations-isolation',
      severity: 'warn', // warn чтобы не блокировать development
      comment: 'Operations импортируются только через Facade или Composition Root',
      from: {
        path: '^packages/(yandex-tracker|servers/yandex-tracker)/src/',
        pathNot: [
          // Исключения (разрешено импортировать operations):
          '^packages/(yandex-tracker|servers/yandex-tracker)/src/tracker_api/facade/',                           // Facade координирует operations
          '^packages/(yandex-tracker|servers/yandex-tracker)/src/composition-root/container\\.ts$',              // DI контейнер регистрирует все зависимости
          '^packages/(yandex-tracker|servers/yandex-tracker)/src/composition-root/definitions/operation-definitions\\.ts$', // Автоматическая регистрация операций
          '^packages/(yandex-tracker|servers/yandex-tracker)/src/tracker_api/api_operations/',                       // Operations могут импортировать друг друга
        ],
      },
      to: {
        path: '^packages/(yandex-tracker|servers/yandex-tracker)/src/tracker_api/api_operations/',
      },
    },

    {
      name: 'composition-root-top-level',
      severity: 'error',
      comment: 'Composition Root — высший слой, ничто не должно импортировать его (кроме entry point и файлов внутри composition-root)',
      from: {
        path: '^packages/(yandex-tracker|servers/yandex-tracker)/src/',
        pathNot: [
          '^packages/(yandex-tracker|servers/yandex-tracker)/src/index\\.ts$',                     // Entry point может импортировать
          '^packages/(yandex-tracker|servers/yandex-tracker)/src/composition-root/',               // Файлы внутри composition-root могут импортировать друг друга
          '^packages/(yandex-tracker|servers/yandex-tracker)/src/mcp/tool-registry\\.ts$',         // ToolRegistry импортирует definitions для автоматической регистрации
        ],
      },
      to: {
        path: '^packages/(yandex-tracker|servers/yandex-tracker)/src/composition-root/',
      },
    },

    // ================================================
    // 3. CIRCULAR DEPENDENCIES
    // ================================================

    {
      name: 'no-circular',
      severity: 'warn',
      comment: 'Циклические зависимости запрещены',
      from: {
        pathNot: [
          '^node_modules',
          // Исключения: намеренный паттерн Definition↔Tool (circular by design)
          // BaseDefinition → ToolMetadata → BaseDefinition (framework pattern)
          '^packages/core/src/tools/base/base-definition\\.ts$',
          '^packages/core/src/tools/base/tool-metadata\\.ts$',
          // SearchToolsDefinition ↔ SearchToolsTool (pairing pattern)
          '^packages/search/src/tools/search-tools\\.definition\\.ts$',
          '^packages/search/src/tools/search-tools\\.tool\\.ts$',
          // DemoDefinition ↔ DemoTool (pairing pattern)
          '^packages/(yandex-tracker|servers/yandex-tracker)/src/tools/helpers/demo/demo\\.definition\\.ts$',
          '^packages/(yandex-tracker|servers/yandex-tracker)/src/tools/helpers/demo/demo\\.tool\\.ts$',
        ],
      },
      to: {
        pathNot: '^node_modules',
        circular: true,
      },
    },
  ],

  options: {
    // Не следовать в node_modules
    doNotFollow: {
      path: 'node_modules',
    },

    // Исключить из анализа
    exclude: {
      path: ['\\.test\\.ts$', '\\.spec\\.ts$', 'dist/', 'tests/', 'scripts/', '\\.agentic-planning/'],
    },

    // Использовать TypeScript для разрешения путей
    tsPreCompilationDeps: true,
    tsConfig: {
      fileName: './tsconfig.json',
    },

    // Репортер
    reporterOptions: {
      dot: {
        collapsePattern: 'node_modules/[^/]+',
      },
      text: {
        highlightFocused: true,
      },
    },
  },
};
