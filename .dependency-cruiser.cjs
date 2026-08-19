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
      comment: 'Запрет обратных зависимостей в графе пакетов (infrastructure <- core <- servers)',
      from: {
        path: '^packages/framework/(infrastructure|core)/',
      },
      to: {
        path: '^packages/servers/',
      },
    },

    {
      name: 'infrastructure-bottom-layer',
      severity: 'error',
      comment: 'Infrastructure — базовый слой, не зависит от других framework пакетов',
      from: {
        path: '^packages/framework/infrastructure/',
      },
      to: {
        path: '^packages/(framework/(core|cli)|servers)/',
      },
    },

    {
      name: 'core-depends-only-on-infrastructure',
      severity: 'error',
      comment: 'Core может зависеть только от infrastructure',
      from: {
        path: '^packages/framework/core/',
      },
      to: {
        path: '^packages/(framework/cli|servers)/',
      },
    },

    {
      name: 'cli-only-depends-on-infrastructure',
      severity: 'error',
      comment: 'CLI может зависеть только от infrastructure пакета',
      from: {
        path: '^packages/framework/cli/',
      },
      to: {
        path: '^packages/framework/',
        pathNot: [
          '^packages/framework/infrastructure/',
          '^packages/framework/cli/',
        ],
      },
    },

    {
      name: 'no-circular-cli',
      severity: 'error',
      comment: 'Framework пакеты не должны зависеть от CLI',
      from: {
        path: '^packages/framework/(infrastructure|core)/',
      },
      to: {
        path: '^packages/framework/cli/',
      },
    },

    // ================================================
    // 2. MCP SERVERS INTERNAL ARCHITECTURE
    // (applies to all servers: yandex-tracker, yandex-wiki, ticktick)
    // ================================================

    {
      name: 'server-api-no-mcp',
      severity: 'error',
      comment: 'API слой серверов (tracker_api, wiki_api, ticktick_api) не должен знать о MCP/tools layer',
      from: {
        path: '^packages/servers/[^/]+/src/(tracker_api|wiki_api|ticktick_api)/',
      },
      to: {
        path: '^packages/servers/[^/]+/src/(mcp|tools)/',
      },
    },

    {
      name: 'server-tools-use-facade-only',
      severity: 'error',
      comment: 'MCP tools должны использовать Facade, не Operations напрямую',
      from: {
        path: '^packages/servers/[^/]+/src/(mcp|tools)/',
      },
      to: {
        path: '^packages/servers/[^/]+/src/(tracker_api|wiki_api|ticktick_api)/',
        pathNot: [
          // Разрешены:
          '^packages/servers/[^/]+/src/(tracker_api|wiki_api|ticktick_api)/facade/',     // Facade (основной интерфейс)
          '^packages/servers/[^/]+/src/(tracker_api|wiki_api|ticktick_api)/entities/',   // Entity типы
          '^packages/servers/[^/]+/src/(tracker_api|wiki_api|ticktick_api)/dto/',        // DTO типы
        ],
      },
    },

    {
      name: 'server-operations-isolation',
      severity: 'error',
      comment: 'Operations импортируются только через Facade или Composition Root',
      from: {
        path: '^packages/servers/[^/]+/src/',
        pathNot: [
          // Исключения (разрешено импортировать operations):
          '^packages/servers/[^/]+/src/(tracker_api|wiki_api|ticktick_api)/facade/',                           // Facade координирует operations
          '^packages/servers/[^/]+/src/composition-root/container\\.ts$',                                       // DI контейнер регистрирует все зависимости
          '^packages/servers/[^/]+/src/composition-root/definitions/operation-definitions\\.ts$',              // Автоматическая регистрация операций
          '^packages/servers/[^/]+/src/(tracker_api|wiki_api|ticktick_api)/api_operations/',                   // Operations могут импортировать друг друга
        ],
      },
      to: {
        path: '^packages/servers/[^/]+/src/(tracker_api|wiki_api|ticktick_api)/api_operations/',
      },
    },

    {
      name: 'server-composition-root-top-level',
      severity: 'error',
      comment: 'Composition Root — высший слой, ничто не должно импортировать его (кроме entry point и файлов внутри composition-root)',
      from: {
        path: '^packages/servers/[^/]+/src/',
        pathNot: [
          '^packages/servers/[^/]+/src/index\\.ts$',                     // Публичный API пакета (library usage)
          '^packages/servers/[^/]+/src/server\\.ts$',                    // Точка входа бандла: собирает контейнер — это и есть её работа
          '^packages/servers/[^/]+/src/composition-root/',               // Файлы внутри composition-root могут импортировать друг друга
          '^packages/servers/[^/]+/src/(mcp|tools)/tool-registry\\.ts$', // ToolRegistry импортирует definitions для автоматической регистрации
        ],
      },
      to: {
        path: '^packages/servers/[^/]+/src/composition-root/',
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
          '^packages/framework/core/src/tools/base/base-definition\\.ts$',
          '^packages/framework/core/src/tools/base/tool-metadata\\.ts$',
          // Server tools Definition ↔ Tool pairing patterns (all servers)
          '^packages/servers/[^/]+/src/tools/.*/[^/]+\\.definition\\.ts$',
          '^packages/servers/[^/]+/src/tools/.*/[^/]+\\.tool\\.ts$',
        ],
      },
      to: {
        pathNot: '^node_modules',
        circular: true,
      },
    },
  ],

  options: {
    // dist/ не исключён, а только не обходится вглубь: межпакетный импорт
    // `@fractalizer/mcp-core` резолвится через симлинк workspace в
    // packages/framework/core/dist/index.js, и пока dist был в `exclude`,
    // ребро выбрасывалось из графа целиком — правила графа пакетов не могли
    // сработать на канонической форме импорта (см. CLAUDE.md §2). Как узел
    // dist нужен, как поддерево — нет. Цена: гейт видит межпакетные рёбра
    // только после сборки зависимостей, поэтому turbo-задача depcruise
    // объявляет dependsOn: ["^build"].
    doNotFollow: {
      path: '(node_modules|/dist/)',
    },

    // Исключить из анализа
    exclude: {
      path: ['\\.test\\.ts$', '\\.spec\\.ts$', 'tests/', 'scripts/', '\\.agentic-planning/'],
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
