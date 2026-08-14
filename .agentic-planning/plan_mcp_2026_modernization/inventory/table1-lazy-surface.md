# Таблица 1. Поверхность lazy-discovery / search_tools

Чем получено: grep по идентификаторам toolDiscoveryMode|essentialTools|TOOL_DISCOVERY_MODE|essential|'lazy'|'eager'|search_tools|SearchToolsTool|mcp-search по всему репо (src, tests, docs, json, скрипты), исключая node_modules/dist/.turbo.
Каналы покрыты: прямой импорт, строковый идентификатор, env var, package.json deps, конфиг, документация, тесты, DI-регистрация по строке.
НЕ покрыто: значения в пользовательских конфигах вне репо (~/.mcp/*, claude_desktop_config.json), README на npmjs у уже опубликованных версий.

## toolDiscoveryMode
packages/servers/yandex-tracker/tests/smoke/e2e-tool-execution.smoke.test.ts:25:    toolDiscoveryMode: 'lazy',
packages/servers/yandex-tracker/tests/smoke/e2e-tool-execution.smoke.test.ts:116:      toolDiscoveryMode: 'lazy' as const,
packages/servers/yandex-tracker/tests/smoke/e2e-tool-execution.smoke.test.ts:136:      toolDiscoveryMode: 'eager' as const,
packages/servers/yandex-tracker/tests/smoke/di-container.smoke.test.ts:28:    toolDiscoveryMode: 'lazy',
packages/servers/yandex-tracker/tests/smoke/di-container.smoke.test.ts:114:    const lazyConfig = { ...fakeConfig, toolDiscoveryMode: 'lazy' as const };
packages/servers/yandex-tracker/tests/smoke/di-container.smoke.test.ts:127:    const eagerConfig = { ...fakeConfig, toolDiscoveryMode: 'eager' as const };
packages/servers/yandex-tracker/tests/smoke/mcp-server-lifecycle.smoke.test.ts:25:    toolDiscoveryMode: 'lazy',
packages/servers/yandex-tracker/tests/smoke/mcp-server-lifecycle.smoke.test.ts:111:      toolDiscoveryMode: 'lazy',
packages/servers/yandex-tracker/tests/smoke/mcp-server-lifecycle.smoke.test.ts:123:      toolDiscoveryMode: 'lazy' as const,
packages/servers/yandex-tracker/tests/smoke/mcp-server-lifecycle.smoke.test.ts:126:    const eagerConfig = { ...fakeConfig, toolDiscoveryMode: 'eager' as const };
packages/servers/yandex-tracker/tests/smoke/entry-point.smoke.test.ts:108:      toolDiscoveryMode: 'eager' as const,
packages/servers/yandex-tracker/tests/integration/tools/helpers/search/search-tools.tool.integration.test.ts:28:      toolDiscoveryMode: 'lazy', // search_tools требует lazy mode
packages/servers/yandex-tracker/tests/composition-root/container.test.ts:49:      toolDiscoveryMode: 'lazy', // По умолчанию lazy mode для обратной совместимости тестов
packages/servers/yandex-tracker/tests/composition-root/container.test.ts:461:        toolDiscoveryMode: 'eager',
packages/servers/yandex-tracker/scripts/list-tool-names.mjs:57:      configWithEssentialTools.toolDiscoveryMode,
packages/servers/yandex-tracker/src/server.ts:78:      config.toolDiscoveryMode,
packages/servers/yandex-tracker/src/server.ts:195:      config.toolDiscoveryMode === 'eager'
packages/servers/yandex-tracker/src/config/server-config.interface.ts:69:  toolDiscoveryMode: 'lazy' | 'eager';
packages/servers/yandex-tracker/src/config/config-loader.ts:394:  'toolDiscoveryMode' | 'essentialTools' | 'enabledToolCategories' | 'disabledToolGroups'
packages/servers/yandex-tracker/src/config/config-loader.ts:401:    'toolDiscoveryMode' | 'essentialTools' | 'enabledToolCategories' | 'disabledToolGroups'
packages/servers/yandex-tracker/src/config/config-loader.ts:403:    toolDiscoveryMode: validateToolDiscoveryMode(process.env[ENV_VAR_NAMES.TOOL_DISCOVERY_MODE]),
packages/servers/yandex-tracker/src/server/handlers.ts:92:    `✅ Возвращаем ${metrics.totalTools} инструментов (режим: ${config.toolDiscoveryMode})`,
packages/servers/yandex-tracker/src/server/handlers.ts:95:      mode: config.toolDiscoveryMode,
packages/servers/yandex-tracker/src/server/handlers.ts:136:  if (config.toolDiscoveryMode === 'lazy') {
packages/servers/yandex-tracker/src/server/handlers.ts:144:  if (config.toolDiscoveryMode === 'eager' && metrics.totalTools > 30) {
packages/servers/yandex-tracker/src/composition-root/container.ts:330:  if (config.toolDiscoveryMode === 'lazy') {
packages/servers/yandex-wiki/tests/smoke/mcp-server-lifecycle.smoke.test.ts:23:    toolDiscoveryMode: 'lazy',
packages/servers/yandex-wiki/tests/smoke/mcp-server-lifecycle.smoke.test.ts:107:      toolDiscoveryMode: 'lazy',
packages/servers/yandex-wiki/tests/smoke/mcp-server-lifecycle.smoke.test.ts:119:      toolDiscoveryMode: 'lazy' as const,
packages/servers/yandex-wiki/tests/smoke/mcp-server-lifecycle.smoke.test.ts:122:    const eagerConfig = { ...fakeConfig, toolDiscoveryMode: 'eager' as const };
packages/servers/yandex-wiki/tests/smoke/di-container.smoke.test.ts:28:    toolDiscoveryMode: 'lazy',
packages/servers/yandex-wiki/tests/smoke/di-container.smoke.test.ts:120:    const lazyConfig = { ...fakeConfig, toolDiscoveryMode: 'lazy' as const };
packages/servers/yandex-wiki/tests/smoke/di-container.smoke.test.ts:133:    const eagerConfig = { ...fakeConfig, toolDiscoveryMode: 'eager' as const };
packages/servers/yandex-wiki/tests/smoke/entry-point.smoke.test.ts:112:      toolDiscoveryMode: 'eager' as const,
packages/servers/yandex-wiki/tests/smoke/e2e-tool-execution.smoke.test.ts:25:    toolDiscoveryMode: 'lazy',
packages/servers/yandex-wiki/tests/smoke/e2e-tool-execution.smoke.test.ts:124:      toolDiscoveryMode: 'lazy' as const,
packages/servers/yandex-wiki/tests/smoke/e2e-tool-execution.smoke.test.ts:142:      toolDiscoveryMode: 'eager' as const,
packages/servers/yandex-wiki/src/server.ts:78:      config.toolDiscoveryMode,
packages/servers/yandex-wiki/src/server.ts:195:      config.toolDiscoveryMode === 'eager' ? ['yw_ping'] : YANDEX_WIKI_ESSENTIAL_TOOLS;
packages/servers/yandex-wiki/src/config/config-loader.ts:306:  const toolDiscoveryMode = validateToolDiscoveryMode(
packages/servers/yandex-wiki/src/config/config-loader.ts:346:    toolDiscoveryMode,
packages/servers/yandex-wiki/src/server/handlers.ts:92:    `✅ Возвращаем ${metrics.totalTools} инструментов (режим: ${config.toolDiscoveryMode})`,
packages/servers/yandex-wiki/src/server/handlers.ts:95:      mode: config.toolDiscoveryMode,
packages/servers/yandex-wiki/src/server/handlers.ts:136:  if (config.toolDiscoveryMode === 'lazy') {
packages/servers/yandex-wiki/src/server/handlers.ts:144:  if (config.toolDiscoveryMode === 'eager' && metrics.totalTools > 30) {
packages/servers/yandex-wiki/src/config/server-config.interface.ts:62:  toolDiscoveryMode: 'lazy' | 'eager';
packages/servers/yandex-wiki/src/composition-root/container.ts:253:  if (config.toolDiscoveryMode === 'lazy') {

## essentialTools
packages/servers/yandex-tracker/tests/tool-registry.test.ts:372:      // Regression test для бага, где essentialTools содержал ['ping', 'search_tools']
packages/servers/yandex-tracker/tests/tool-registry.test.ts:376:      const essentialToolsWithPrefixes = [
packages/servers/yandex-tracker/tests/tool-registry.test.ts:382:      const essentialDefs = registry.getEssentialDefinitions(essentialToolsWithPrefixes);
packages/servers/yandex-tracker/tests/tool-registry.test.ts:392:      const essentialToolsWithoutPrefixes = [
packages/servers/yandex-tracker/tests/tool-registry.test.ts:398:      const essentialDefs = registry.getEssentialDefinitions(essentialToolsWithoutPrefixes);
packages/servers/yandex-tracker/tests/tool-registry.test.ts:407:      const essentialToolsWithPrefixes = [
packages/servers/yandex-tracker/tests/tool-registry.test.ts:413:      const definitions = registry.getDefinitionsByMode('lazy', essentialToolsWithPrefixes);
packages/servers/yandex-tracker/tests/tool-registry.test.ts:533:      const essentialTools = [
packages/servers/yandex-tracker/tests/tool-registry.test.ts:540:      const definitions = registry.getDefinitionsByMode('lazy', essentialTools);
packages/servers/yandex-tracker/tests/tool-registry.test.ts:770:      const essentialTools = [
packages/servers/yandex-tracker/tests/tool-registry.test.ts:776:      const definitions = registry.getDefinitionsByMode('lazy', essentialTools, categoryFilter);
packages/servers/yandex-tracker/tests/smoke/mcp-server-lifecycle.smoke.test.ts:26:    essentialTools: ['fr_yandex_tracker_ping'],
packages/servers/yandex-tracker/tests/smoke/mcp-server-lifecycle.smoke.test.ts:112:      essentialTools: ['fr_yandex_tracker_ping'],
packages/servers/yandex-tracker/tests/smoke/mcp-server-lifecycle.smoke.test.ts:124:      essentialTools: ['fr_yandex_tracker_ping'],
packages/servers/yandex-tracker/tests/smoke/mcp-server-lifecycle.smoke.test.ts:137:    const lazyDefinitions = lazyRegistry.getEssentialDefinitions(lazyConfig.essentialTools);
packages/servers/yandex-tracker/tests/smoke/e2e-tool-execution.smoke.test.ts:26:    essentialTools: ['fr_yandex_tracker_ping'],
packages/servers/yandex-tracker/tests/smoke/e2e-tool-execution.smoke.test.ts:117:      essentialTools: ['fr_yandex_tracker_ping', 'search_tools'],
packages/servers/yandex-tracker/tests/smoke/entry-point.smoke.test.ts:109:      essentialTools: ['fr_yandex_tracker_ping'],
packages/servers/yandex-tracker/tests/smoke/di-container.smoke.test.ts:29:    essentialTools: ['fr_yandex_tracker_ping'],
packages/servers/yandex-tracker/tests/integration/tools/helpers/search/search-tools.tool.integration.test.ts:29:      essentialTools: ['fr_yandex_tracker_ping', 'search_tools'],
packages/servers/yandex-tracker/tests/composition-root/container.test.ts:50:      essentialTools: ['fr_yandex_tracker_ping', 'search_tools'],
packages/servers/yandex-tracker/tests/composition-root/container.test.ts:462:        essentialTools: ['fr_yandex_tracker_ping'], // В eager mode только ping
packages/servers/yandex-tracker/scripts/list-tool-names.mjs:31:    essentialTools: YANDEX_TRACKER_ESSENTIAL_TOOLS,
packages/servers/yandex-tracker/scripts/list-tool-names.mjs:58:      configWithEssentialTools.essentialTools
packages/servers/yandex-tracker/src/server.ts:79:      config.essentialTools,
packages/servers/yandex-tracker/src/server.ts:191:    // ✅ Переопределяем essentialTools в зависимости от режима discovery
packages/servers/yandex-tracker/src/server.ts:194:    const essentialTools =
packages/servers/yandex-tracker/src/server.ts:201:      essentialTools,
packages/servers/yandex-tracker/src/config/server-config.interface.ts:82:  essentialTools: readonly string[];
packages/servers/yandex-tracker/src/config/server-config.interface.ts:98:   * Работает только в eager режиме. В lazy режиме используется essentialTools.
packages/servers/yandex-tracker/src/server/handlers.ts:139:      essentialTools: config.essentialTools,
packages/servers/yandex-tracker/src/config/config-loader.ts:394:  'toolDiscoveryMode' | 'essentialTools' | 'enabledToolCategories' | 'disabledToolGroups'
packages/servers/yandex-tracker/src/config/config-loader.ts:401:    'toolDiscoveryMode' | 'essentialTools' | 'enabledToolCategories' | 'disabledToolGroups'
packages/servers/yandex-tracker/src/config/config-loader.ts:404:    essentialTools: parseEssentialTools(process.env[ENV_VAR_NAMES.ESSENTIAL_TOOLS]),
packages/servers/yandex-wiki/tests/smoke/e2e-tool-execution.smoke.test.ts:26:    essentialTools: ['yw_ping'],
packages/servers/yandex-wiki/tests/smoke/e2e-tool-execution.smoke.test.ts:125:      essentialTools: ['yw_ping'],
packages/servers/yandex-wiki/tests/smoke/di-container.smoke.test.ts:29:    essentialTools: ['yw_ping'],
packages/servers/yandex-wiki/tests/smoke/mcp-server-lifecycle.smoke.test.ts:24:    essentialTools: ['yw_ping'], // С подчеркиванием (автонормализация)
packages/servers/yandex-wiki/tests/smoke/mcp-server-lifecycle.smoke.test.ts:108:      essentialTools: ['yw_ping'], // С подчеркиванием (автонормализация)
packages/servers/yandex-wiki/tests/smoke/mcp-server-lifecycle.smoke.test.ts:120:      essentialTools: ['yw_ping'], // С подчеркиванием (автонормализация)
packages/servers/yandex-wiki/tests/smoke/mcp-server-lifecycle.smoke.test.ts:133:    const lazyDefinitions = lazyRegistry.getEssentialDefinitions(lazyConfig.essentialTools);
packages/servers/yandex-wiki/tests/smoke/entry-point.smoke.test.ts:113:      essentialTools: ['yw_ping'],
packages/servers/yandex-wiki/src/server.ts:79:      config.essentialTools,
packages/servers/yandex-wiki/src/server.ts:191:    // ✅ Переопределяем essentialTools в зависимости от режима discovery
packages/servers/yandex-wiki/src/server.ts:194:    const essentialTools =
packages/servers/yandex-wiki/src/server.ts:199:      essentialTools,
packages/servers/yandex-wiki/src/config/config-loader.ts:309:  const essentialTools = parseEssentialTools(process.env[ENV_VAR_NAMES.ESSENTIAL_TOOLS]);
packages/servers/yandex-wiki/src/config/config-loader.ts:347:    essentialTools,
packages/servers/yandex-wiki/src/config/server-config.interface.ts:66:  essentialTools: readonly string[];
packages/servers/yandex-wiki/src/server/handlers.ts:139:      essentialTools: config.essentialTools,
packages/servers/ticktick/tests/smoke/e2e-tool-execution.smoke.test.ts:39:      essentialTools: ['fr_ticktick_ping'],
packages/servers/ticktick/tests/smoke/e2e-tool-execution.smoke.test.ts:142:        essentialTools: ['fr_ticktick_ping', 'search_tools'],
packages/servers/ticktick/tests/smoke/e2e-tool-execution.smoke.test.ts:164:        essentialTools: ['fr_ticktick_ping'],
packages/servers/ticktick/tests/smoke/mcp-server-lifecycle.smoke.test.ts:42:      essentialTools: ['fr_ticktick_ping'],
packages/servers/ticktick/tests/smoke/mcp-server-lifecycle.smoke.test.ts:140:        essentialTools: ['fr_ticktick_ping'],
packages/servers/ticktick/tests/smoke/mcp-server-lifecycle.smoke.test.ts:163:        essentialTools: ['fr_ticktick_ping', 'fr_ticktick_search_tools'],
packages/servers/ticktick/tests/smoke/mcp-server-lifecycle.smoke.test.ts:180:    const lazyDefinitions = lazyRegistry.getEssentialDefinitions(lazyConfig.tools.essentialTools);
packages/servers/ticktick/tests/smoke/di-container.smoke.test.ts:43:      essentialTools: ['fr_ticktick_ping'],
packages/servers/ticktick/tests/smoke/entry-point.smoke.test.ts:104:        essentialTools: ['fr_ticktick_ping'],
packages/servers/ticktick/src/server.ts:80:      config.tools.essentialTools,

## TOOL_DISCOVERY_MODE
MCP_SERVER_CHECKLIST.md:197:TOOL_DISCOVERY_MODE="eager"  # или "lazy"
packages/servers/yandex-tracker/README.md:344:| `TOOL_DISCOVERY_MODE` | Режим обнаружения: `lazy` или `eager` | `lazy` |
packages/servers/yandex-tracker/README.md:428:        "TOOL_DISCOVERY_MODE": "eager",
packages/servers/yandex-tracker/CLAUDE.md:333:TOOL_DISCOVERY_MODE=eager
packages/servers/yandex-tracker/CLAUDE.md:336:TOOL_DISCOVERY_MODE=lazy
packages/servers/yandex-tracker/scripts/smoke-test-server.ts:127:        // TOOL_DISCOVERY_MODE: 'eager' (по умолчанию) - тестируем полный список инструментов
packages/servers/yandex-tracker/src/constants.ts:77:  DEFAULT_TOOL_DISCOVERY_MODE,
packages/servers/yandex-tracker/src/config/config-loader.ts:21:  DEFAULT_TOOL_DISCOVERY_MODE,
packages/servers/yandex-tracker/src/config/config-loader.ts:101:  return DEFAULT_TOOL_DISCOVERY_MODE;
packages/servers/yandex-tracker/src/config/config-loader.ts:403:    toolDiscoveryMode: validateToolDiscoveryMode(process.env[ENV_VAR_NAMES.TOOL_DISCOVERY_MODE]),
packages/servers/yandex-tracker/src/config/constants.ts:24:export const DEFAULT_TOOL_DISCOVERY_MODE = 'eager' as const;
packages/servers/yandex-tracker/src/config/constants.ts:46:  TOOL_DISCOVERY_MODE: 'TOOL_DISCOVERY_MODE',
packages/servers/yandex-tracker/src/server/handlers.ts:140:      recommendation: 'Используйте TOOL_DISCOVERY_MODE=eager для совместимости',
packages/servers/yandex-tracker/src/server/handlers.ts:148:      recommendation: 'Рассмотрите TOOL_DISCOVERY_MODE=lazy для экономии контекста',
packages/servers/yandex-wiki/scripts/smoke-test-server.ts:110:        // TOOL_DISCOVERY_MODE: 'eager' (по умолчанию) - тестируем полный список инструментов
packages/servers/yandex-wiki/src/config/constants.ts:21:export const DEFAULT_TOOL_DISCOVERY_MODE = 'eager' as const;
packages/servers/yandex-wiki/src/config/constants.ts:42:  TOOL_DISCOVERY_MODE: 'TOOL_DISCOVERY_MODE',
packages/servers/yandex-wiki/src/config/config-loader.ts:18:  DEFAULT_TOOL_DISCOVERY_MODE,
packages/servers/yandex-wiki/src/config/config-loader.ts:63:  return DEFAULT_TOOL_DISCOVERY_MODE;
packages/servers/yandex-wiki/src/config/config-loader.ts:307:    process.env[ENV_VAR_NAMES.TOOL_DISCOVERY_MODE]
packages/servers/yandex-wiki/src/server/handlers.ts:140:      recommendation: 'Используйте TOOL_DISCOVERY_MODE=eager для совместимости',
packages/servers/yandex-wiki/src/server/handlers.ts:148:      recommendation: 'Рассмотрите TOOL_DISCOVERY_MODE=lazy для экономии контекста',
packages/servers/ticktick/README.md:11:- **Lazy/Eager режимы** — `TOOL_DISCOVERY_MODE`
packages/servers/ticktick/README.md:121:TOOL_DISCOVERY_MODE=eager          # eager | lazy
packages/servers/ticktick/README.md:136:TOOL_DISCOVERY_MODE=lazy
packages/servers/ticktick/src/constants.ts:76:  DEFAULT_TOOL_DISCOVERY_MODE,
packages/servers/ticktick/src/config/config-loader.ts:18:  DEFAULT_TOOL_DISCOVERY_MODE,
packages/servers/ticktick/src/config/config-loader.ts:99:  return DEFAULT_TOOL_DISCOVERY_MODE;
packages/servers/ticktick/src/config/config-loader.ts:376:    discoveryMode: validateToolDiscoveryMode(process.env[ENV_VAR_NAMES.TOOL_DISCOVERY_MODE]),
packages/servers/ticktick/src/config/constants.ts:32:export const DEFAULT_TOOL_DISCOVERY_MODE = 'eager' as const;
packages/servers/ticktick/src/config/constants.ts:74:  TOOL_DISCOVERY_MODE: 'TOOL_DISCOVERY_MODE',
packages/servers/ticktick/src/server/handlers.ts:131:      recommendation: 'Use TOOL_DISCOVERY_MODE=eager for compatibility',
packages/servers/ticktick/src/server/handlers.ts:139:      recommendation: 'Consider TOOL_DISCOVERY_MODE=lazy to save context',

## ESSENTIAL_TOOLS
MCP_SERVER_CHECKLIST.md:81:export const ESSENTIAL_TOOLS = [
MCP_SERVER_CHECKLIST.md:87:export const ESSENTIAL_TOOLS = ['prefix_ping', 'prefix_search_tools'];
packages/servers/yandex-tracker/CLAUDE.md:337:ESSENTIAL_TOOLS=ping,search_tools
packages/servers/yandex-tracker/tests/tool-registry.test.ts:393:        'ping', // БЕЗ префикса (как было в DEFAULT_ESSENTIAL_TOOLS)
packages/servers/yandex-tracker/tests/smoke/entry-point.smoke.test.ts:24:    const { MCP_TOOL_PREFIX, MCP_SERVER_NAME, YANDEX_TRACKER_ESSENTIAL_TOOLS } =
packages/servers/yandex-tracker/tests/smoke/entry-point.smoke.test.ts:33:    expect(YANDEX_TRACKER_ESSENTIAL_TOOLS).toBeDefined();
packages/servers/yandex-tracker/tests/smoke/entry-point.smoke.test.ts:34:    expect(Array.isArray(YANDEX_TRACKER_ESSENTIAL_TOOLS)).toBe(true);
packages/servers/yandex-tracker/scripts/list-tool-names.mjs:19:const { YANDEX_TRACKER_ESSENTIAL_TOOLS, MCP_SERVER_NAME } = await import('../dist/constants.js');
packages/servers/yandex-tracker/scripts/list-tool-names.mjs:23:console.log('Essential Tools:', YANDEX_TRACKER_ESSENTIAL_TOOLS);
packages/servers/yandex-tracker/scripts/list-tool-names.mjs:31:    essentialTools: YANDEX_TRACKER_ESSENTIAL_TOOLS,
packages/servers/yandex-tracker/src/constants.ts:31:export const YANDEX_TRACKER_ESSENTIAL_TOOLS = ['fr_yandex_tracker_ping', 'search_tools'] as const;
packages/servers/yandex-tracker/src/constants.ts:78:  DEFAULT_ESSENTIAL_TOOLS,
packages/servers/yandex-tracker/src/server.ts:28:import { MCP_SERVER_NAME, YANDEX_TRACKER_ESSENTIAL_TOOLS } from './constants.js';
packages/servers/yandex-tracker/src/server.ts:197:        : YANDEX_TRACKER_ESSENTIAL_TOOLS;
packages/servers/yandex-tracker/src/index.ts:15:export { MCP_TOOL_PREFIX, MCP_SERVER_NAME, YANDEX_TRACKER_ESSENTIAL_TOOLS } from './constants.js';
packages/servers/yandex-tracker/src/config/constants.ts:25:export const DEFAULT_ESSENTIAL_TOOLS = ['ping', 'search_tools'] as const;
packages/servers/yandex-tracker/src/config/constants.ts:47:  ESSENTIAL_TOOLS: 'ESSENTIAL_TOOLS',
packages/servers/yandex-tracker/src/config/config-loader.ts:22:  DEFAULT_ESSENTIAL_TOOLS,
packages/servers/yandex-tracker/src/config/config-loader.ts:109:    return DEFAULT_ESSENTIAL_TOOLS;
packages/servers/yandex-tracker/src/config/config-loader.ts:404:    essentialTools: parseEssentialTools(process.env[ENV_VAR_NAMES.ESSENTIAL_TOOLS]),
packages/servers/yandex-wiki/src/constants.ts:40:export const YANDEX_WIKI_ESSENTIAL_TOOLS = ['yw_ping', 'search_tools'] as const;
packages/servers/yandex-wiki/src/server.ts:28:import { MCP_SERVER_NAME, YANDEX_WIKI_ESSENTIAL_TOOLS } from './constants.js';
packages/servers/yandex-wiki/src/server.ts:195:      config.toolDiscoveryMode === 'eager' ? ['yw_ping'] : YANDEX_WIKI_ESSENTIAL_TOOLS;
packages/servers/yandex-wiki/src/config/config-loader.ts:19:  DEFAULT_ESSENTIAL_TOOLS,
packages/servers/yandex-wiki/src/config/config-loader.ts:71:    return DEFAULT_ESSENTIAL_TOOLS;
packages/servers/yandex-wiki/src/config/config-loader.ts:309:  const essentialTools = parseEssentialTools(process.env[ENV_VAR_NAMES.ESSENTIAL_TOOLS]);
packages/servers/yandex-wiki/src/config/constants.ts:22:export const DEFAULT_ESSENTIAL_TOOLS = ['ping', 'search_tools'] as const;
packages/servers/yandex-wiki/src/config/constants.ts:43:  ESSENTIAL_TOOLS: 'ESSENTIAL_TOOLS',
packages/servers/ticktick/tests/smoke/entry-point.smoke.test.ts:24:    const { MCP_TOOL_PREFIX, MCP_SERVER_NAME, TICKTICK_ESSENTIAL_TOOLS } =
packages/servers/ticktick/tests/smoke/entry-point.smoke.test.ts:33:    expect(TICKTICK_ESSENTIAL_TOOLS).toBeDefined();
packages/servers/ticktick/tests/smoke/entry-point.smoke.test.ts:34:    expect(Array.isArray(TICKTICK_ESSENTIAL_TOOLS)).toBe(true);
packages/servers/ticktick/src/constants.ts:31:export const TICKTICK_ESSENTIAL_TOOLS = ['fr_ticktick_ping', 'search_tools'] as const;
packages/servers/ticktick/src/constants.ts:77:  DEFAULT_ESSENTIAL_TOOLS,
packages/servers/ticktick/src/server.ts:28:import { MCP_SERVER_NAME, TICKTICK_ESSENTIAL_TOOLS } from './constants.js';
packages/servers/ticktick/src/server.ts:192:      config.tools.discoveryMode === 'eager' ? ['fr_ticktick_ping'] : TICKTICK_ESSENTIAL_TOOLS;
packages/servers/ticktick/src/index.ts:15:export { MCP_TOOL_PREFIX, MCP_SERVER_NAME, TICKTICK_ESSENTIAL_TOOLS } from './constants.js';
packages/servers/ticktick/src/config/config-loader.ts:19:  DEFAULT_ESSENTIAL_TOOLS,
packages/servers/ticktick/src/config/config-loader.ts:107:    return DEFAULT_ESSENTIAL_TOOLS;
packages/servers/ticktick/src/config/config-loader.ts:377:    essentialTools: parseEssentialTools(process.env[ENV_VAR_NAMES.ESSENTIAL_TOOLS]),
packages/servers/ticktick/src/config/constants.ts:33:export const DEFAULT_ESSENTIAL_TOOLS = ['fr_ticktick_ping', 'search_tools'] as const;
packages/servers/ticktick/src/config/constants.ts:75:  ESSENTIAL_TOOLS: 'ESSENTIAL_TOOLS',

## search_tools
MCP_SERVER_CHECKLIST.md:80:// Framework tools (search_tools) указываются БЕЗ префикса!
MCP_SERVER_CHECKLIST.md:83:  'search_tools',    // ✅ Framework tool — БЕЗ префикса!
MCP_SERVER_CHECKLIST.md:87:export const ESSENTIAL_TOOLS = ['prefix_ping', 'prefix_search_tools'];
packages/framework/core/src/tools/common/utils/tool-name.ts:17: * @param name - Имя tool без префикса (например, 'ping', 'get_issues', 'search_tools')
packages/framework/core/src/tool-registry/tool-registry.ts:201:      const names = essentialNames ?? ['ping', 'search_tools'];
packages/framework/core/src/tool-registry/tool-registry.ts:272:                    : 'Используйте search_tools для поиска доступных инструментов',
packages/framework/search/README.md:18:- ✅ **MCP tool included** — `search_tools` for Claude to discover tools
packages/framework/search/README.md:211:## 🔍 MCP Tool: search_tools
packages/framework/search/README.md:215:**Tool name:** `search_tools`
packages/framework/search/README.md:220:Claude uses: search_tools { query: "issues" }
packages/framework/search/tests/tool-search-engine.test.ts:50:      name: 'search_tools',
packages/framework/search/tests/tool-search-engine.test.ts:104:        toolName: 'search_tools',
packages/framework/search/tests/tool-search-engine.test.ts:125:      expect(result.tools[1]!.name).toBe('search_tools');
packages/framework/search/tests/tool-search-engine.test.ts:213:        { toolName: 'search_tools', score: 0.9, strategyType: 'name' as StrategyType },
packages/framework/search/tests/tool-search-engine.test.ts:236:      expect(result.tools[0]!.name).toBe('search_tools');
packages/framework/search/tests/tool-search-engine.test.ts:252:      expect(result.tools.every((t) => t.name !== 'search_tools')).toBe(true);
packages/framework/search/tests/tool-search-engine.test.ts:322:      const searchToolResult = result.tools.find((t) => t.name === 'search_tools');
packages/framework/search/tests/tool-search-engine.test.ts:333:      const searchToolResult = result.tools.find((t) => t.name === 'search_tools');
packages/framework/search/tests/integration/tool-search-engine.test.ts:90:      name: 'fractalizer_mcp_yandex_tracker_search_tools',
packages/framework/search/tests/integration/tool-search-engine.test.ts:173:        (t) => t.name === 'fractalizer_mcp_yandex_tracker_search_tools'
packages/framework/search/tests/strategies/category-search.strategy.test.ts:50:      name: 'fractalizer_mcp_yandex_tracker_search_tools',
packages/framework/search/tests/strategies/category-search.strategy.test.ts:202:      // search_tools должен найтись по категории (score 1.0)
packages/framework/search/tests/strategies/category-search.strategy.test.ts:204:        (r) => r.toolName === 'fractalizer_mcp_yandex_tracker_search_tools'
packages/framework/search/tests/strategies/category-search.strategy.test.ts:271:      // 'find' есть в тегах find_issues и search_tools
packages/framework/search/src/tools/search-tools.metadata.ts:15:  name: buildToolName('search_tools'),
packages/framework/search/src/tools/search-tools.metadata.ts:18:    'tools/list возвращает только essential инструменты (ping, search_tools). ' +
packages/framework/search/src/tools/search-tools.metadata.ts:19:    'Используйте search_tools для поиска нужных операций перед их вызовом.\n\n' +
packages/framework/search/src/tools/search-tools.definition.ts:25:      name: buildToolName('search_tools'),
packages/framework/search/src/tools/search-tools.definition.ts:28:          'tools/list возвращает только essential инструменты (ping, search_tools). ' +
packages/framework/search/src/tools/search-tools.definition.ts:29:          'Используйте search_tools для поиска нужных операций перед их вызовом.\n\n' +
packages/servers/yandex-tracker/README.md:386:- `lazy` — Claude видит только essential инструменты (ping, search_tools), остальные находит через search_tools
packages/servers/yandex-tracker/CLAUDE.md:337:ESSENTIAL_TOOLS=ping,search_tools
packages/servers/yandex-tracker/CLAUDE.md:341:1. Получает `tools/list` → видит только `[ping, search_tools]`
packages/servers/yandex-tracker/CLAUDE.md:342:2. Использует `search_tools` для поиска нужного инструмента
packages/servers/yandex-tracker/tests/test-constants.ts:32:  SEARCH_TOOLS: `${TEST_TOOL_PREFIX}search_tools`,
packages/servers/yandex-tracker/tests/tool-registry.test.ts:85:              name: buildToolName('search_tools', MCP_TOOL_PREFIX),
packages/servers/yandex-tracker/tests/tool-registry.test.ts:372:      // Regression test для бага, где essentialTools содержал ['ping', 'search_tools']
packages/servers/yandex-tracker/tests/tool-registry.test.ts:373:      // без префиксов, но реальные имена инструментов были 'fr_yandex_tracker_ping', 'search_tools'
packages/servers/yandex-tracker/tests/tool-registry.test.ts:378:        'search_tools', // без префикса (framework-level tool)
packages/servers/yandex-tracker/tests/tool-registry.test.ts:385:      expect(essentialDefs).toHaveLength(1); // Только ping, т.к. search_tools не зарегистрирован в этом тесте
packages/servers/yandex-tracker/tests/tool-registry.test.ts:394:        'search_tools',
packages/servers/yandex-tracker/tests/smoke/tool-search.smoke.test.ts:41:      name: 'fractalizer_mcp_yandex_tracker_search_tools',
packages/servers/yandex-tracker/tests/smoke/tool-search.smoke.test.ts:115:    expect(result.tools[0]!.name).toContain('search_tools');
packages/servers/yandex-tracker/tests/smoke/e2e-tool-execution.smoke.test.ts:117:      essentialTools: ['fr_yandex_tracker_ping', 'search_tools'],
packages/servers/yandex-tracker/tests/smoke/e2e-tool-execution.smoke.test.ts:126:    const searchTool = toolRegistry.getTool('search_tools');
packages/servers/yandex-tracker/tests/integration/tools/helpers/search/search-tools.tool.integration.test.ts:18:const SEARCH_TOOLS_NAME = buildToolName('search_tools');
packages/servers/yandex-tracker/tests/integration/tools/helpers/search/search-tools.tool.integration.test.ts:25:    // ВАЖНО: search_tools доступен только в lazy mode
packages/servers/yandex-tracker/tests/integration/tools/helpers/search/search-tools.tool.integration.test.ts:28:      toolDiscoveryMode: 'lazy', // search_tools требует lazy mode
packages/servers/yandex-tracker/tests/integration/tools/helpers/search/search-tools.tool.integration.test.ts:29:      essentialTools: ['fr_yandex_tracker_ping', 'search_tools'],
packages/servers/yandex-tracker/tests/integration/tools/helpers/search/search-tools.tool.integration.test.ts:252:        // fractalizer_mcp_yandex_tracker_search_tools должен быть helper
packages/servers/yandex-tracker/tests/integration/tools/helpers/search/search-tools.tool.integration.test.ts:275:          // fractalizer_mcp_yandex_tracker_search_tools не должен быть в результатах (он helper)
packages/servers/yandex-tracker/tests/mcp/tools/search-tools.tool.test.ts:105:      name: buildToolName('search_tools', MCP_TOOL_PREFIX),
packages/servers/yandex-tracker/tests/mcp/tools/search-tools.tool.test.ts:507:      expect(SearchToolsTool.METADATA.name).toBe(buildToolName('search_tools'));
packages/servers/yandex-tracker/tests/composition-root/container.test.ts:50:      essentialTools: ['fr_yandex_tracker_ping', 'search_tools'],
packages/servers/yandex-tracker/tests/composition-root/container.test.ts:486:    it('search_tools НЕ должен быть в ToolRegistry в eager mode', () => {
packages/servers/yandex-tracker/tests/composition-root/container.test.ts:490:      // Проверяем, что search_tools отсутствует
packages/servers/yandex-tracker/tests/composition-root/container.test.ts:491:      const searchToolDefinition = definitions.find((def) => def.name === 'search_tools');
packages/servers/yandex-tracker/tests/composition-root/container.test.ts:495:      const searchTool = registry.getTool('search_tools');
packages/servers/yandex-tracker/tests/composition-root/container.test.ts:499:    it('должен иметь все остальные tools кроме search_tools в eager mode', () => {
packages/servers/yandex-tracker/tests/composition-root/container.test.ts:519:      // В eager mode должны быть все инструменты кроме search_tools

## SearchToolsTool
MCP_2026_07_28_ANALYSIS.md:33:Плюс общий `SearchToolsTool`, регистрируемый отдельно в lazy-профиле каждого сервера.
MCP_2026_07_28_ANALYSIS.md:89:Перед реализацией нужна генерируемая матрица всех 97 tool-классов плюс три runtime-регистрации `SearchToolsTool`, включая отдельное решение по raw API tools.
ARCHITECTURE.md:120:- **Tools:** SearchToolsTool (MCP tool for Claude)
.dependency-cruiser.cjs:180:          // SearchToolsDefinition ↔ SearchToolsTool (pairing pattern)
packages/framework/core/src/tools/base/tool-metadata.ts:127:   * - SearchToolsTool помечает такие tools в результатах
packages/framework/core/src/tool-registry/tool-registry.ts:85:   * (например, SearchToolsTool с зависимостью от SearchEngine)
packages/framework/search/README.md:316:export { SearchToolsTool } from './tools/search-tools.tool.js';
packages/framework/search/src/README.md:150:### В SearchToolsTool
packages/framework/search/src/README.md:328:- **SearchToolsTool:** [src/mcp/tools/helpers/search/](../tools/helpers/search/)
packages/framework/search/src/index.ts:38:// Tools (SearchToolsTool)
packages/framework/search/src/tools/search-tools.schema.ts:2: * Zod схема валидации параметров для SearchToolsTool
packages/framework/search/src/tools/search-tools.definition.ts:2: * Определение SearchToolsTool для MCP
packages/framework/search/src/tools/search-tools.definition.ts:16: * Definition builder для SearchToolsTool
packages/framework/search/src/tools/search-tools.tool.ts:35:export class SearchToolsTool {
packages/framework/search/src/tools/search-tools.tool.ts:61:      category: SearchToolsTool.METADATA.category,
packages/framework/search/src/tools/search-tools.tool.ts:62:      tags: SearchToolsTool.METADATA.tags,
packages/framework/search/src/tools/search-tools.tool.ts:63:      isHelper: SearchToolsTool.METADATA.isHelper,
packages/framework/search/src/tools/search-tools.tool.ts:64:      ...(SearchToolsTool.METADATA.examples && { examples: SearchToolsTool.METADATA.examples }),
packages/framework/search/src/tools/index.ts:2: * Re-export SearchToolsTool и связанных типов
packages/framework/search/src/tools/index.ts:5:export { SearchToolsTool } from './search-tools.tool.js';
packages/servers/yandex-tracker/CLAUDE.md:313:- ✅ Позволяет SearchToolsTool находить tools без загрузки всего кода
packages/servers/yandex-tracker/tests/tool-registry.test.ts:81:        if (symbolStr.includes('SearchToolsTool')) {
packages/servers/yandex-tracker/tests/tool-registry.test.ts:82:          // Mock SearchToolsTool (имеет другой конструктор)
packages/servers/yandex-tracker/tests/integration/tools/helpers/search/search-tools.tool.integration.test.ts:5: * MCP Client → ToolRegistry → SearchToolsTool → ToolSearchEngine → Tool Index
packages/servers/yandex-tracker/tests/integration/tools/helpers/search/search-tools.tool.integration.test.ts:17:// SearchToolsTool - framework tool, регистрируется БЕЗ префикса
packages/servers/yandex-tracker/tests/mcp/tools/search-tools.tool.test.ts:2: * E2E тесты для SearchToolsTool
packages/servers/yandex-tracker/tests/mcp/tools/search-tools.tool.test.ts:15:import { SearchToolsTool } from '@fractalizer/mcp-search';
packages/servers/yandex-tracker/tests/mcp/tools/search-tools.tool.test.ts:31:describe('SearchToolsTool (E2E)', () => {
packages/servers/yandex-tracker/tests/mcp/tools/search-tools.tool.test.ts:117:  let tool: SearchToolsTool;
packages/servers/yandex-tracker/tests/mcp/tools/search-tools.tool.test.ts:149:    tool = new SearchToolsTool(searchEngine, mockLogger);
packages/servers/yandex-tracker/tests/mcp/tools/search-tools.tool.test.ts:505:      expect(SearchToolsTool.METADATA).toBeDefined();
packages/servers/yandex-tracker/tests/mcp/tools/search-tools.tool.test.ts:506:      // SearchToolsTool - framework tool, БЕЗ префикса проекта
packages/servers/yandex-tracker/tests/mcp/tools/search-tools.tool.test.ts:507:      expect(SearchToolsTool.METADATA.name).toBe(buildToolName('search_tools'));
packages/servers/yandex-tracker/tests/mcp/tools/search-tools.tool.test.ts:508:      expect(SearchToolsTool.METADATA.category).toBe(ToolCategory.SEARCH);
packages/servers/yandex-tracker/tests/mcp/tools/search-tools.tool.test.ts:509:      expect(SearchToolsTool.METADATA.isHelper).toBe(true);
packages/servers/yandex-tracker/tests/mcp/tools/search-tools.tool.test.ts:510:      expect(SearchToolsTool.METADATA.tags).toContain('search');
packages/servers/yandex-tracker/tests/mcp/tools/search-tools.tool.test.ts:511:      expect(SearchToolsTool.METADATA.tags).toContain('tools');
packages/servers/yandex-tracker/tests/mcp/tools/search-tools.tool.test.ts:512:      expect(SearchToolsTool.METADATA.tags).toContain('discovery');
packages/servers/yandex-tracker/tests/mcp/tools/search-tools.tool.test.ts:516:      expect(SearchToolsTool.METADATA.description.length).toBeGreaterThan(50);
packages/servers/yandex-tracker/tests/mcp/tools/search-tools.tool.test.ts:517:      expect(SearchToolsTool.METADATA.description).toContain('MCP');
packages/servers/yandex-tracker/tests/mcp/tools/search-tools.tool.test.ts:521:      expect(SearchToolsTool.METADATA.examples).toBeDefined();
packages/servers/yandex-tracker/tests/mcp/tools/search-tools.tool.test.ts:522:      expect(SearchToolsTool.METADATA.examples!.length).toBeGreaterThan(0);
packages/servers/yandex-tracker/tests/composition-root/container.test.ts:302:    // SearchToolsTool и ToolSearchEngine тесты перенесены в "Tool Discovery Mode" секцию
packages/servers/yandex-tracker/tests/composition-root/container.test.ts:405:        // SearchToolsTool доступен только в lazy mode (по умолчанию в beforeEach)
packages/servers/yandex-tracker/tests/composition-root/container.test.ts:406:        container.get(Symbol.for('SearchToolsTool'));
packages/servers/yandex-tracker/tests/composition-root/container.test.ts:472:    it('НЕ должен регистрировать SearchToolsTool в eager mode', () => {
packages/servers/yandex-tracker/tests/composition-root/container.test.ts:473:      // SearchToolsTool не должен быть в контейнере
packages/servers/yandex-tracker/tests/composition-root/container.test.ts:475:        eagerContainer.get(Symbol.for('SearchToolsTool'));
packages/servers/yandex-tracker/tests/composition-root/container.test.ts:529:    it('должен регистрировать SearchToolsTool в lazy mode', () => {
packages/servers/yandex-tracker/tests/composition-root/container.test.ts:530:      // В lazy mode (по умолчанию в beforeEach) SearchToolsTool должен быть доступен
packages/servers/yandex-tracker/tests/composition-root/container.test.ts:531:      const tool = container.get(Symbol.for('SearchToolsTool'));
packages/servers/yandex-tracker/src/tools/helpers/index.ts:7:// SearchToolsTool moved to @fractalizer/mcp-search package
packages/servers/yandex-tracker/src/composition-root/README.md:233:(как `SearchToolsTool`) требуют отдельной регистрации в `container.ts`.
packages/servers/yandex-tracker/src/composition-root/container.ts:222: * - SearchToolsTool требует (searchEngine, logger) вместо (facade, logger)
packages/servers/yandex-tracker/src/composition-root/container.ts:251:    // Пропускаем SearchToolsTool (регистрируется отдельно)
packages/servers/yandex-tracker/src/composition-root/container.ts:252:    if (className === 'SearchToolsTool') {
packages/servers/yandex-tracker/src/composition-root/container.ts:259:      // Type assertion: все tools кроме SearchToolsTool имеют конструктор (facade, logger)
packages/servers/yandex-tracker/src/composition-root/container.ts:269: * Регистрация SearchToolsTool
packages/servers/yandex-tracker/src/composition-root/container.ts:274:async function bindSearchToolsTool(container: Container): Promise<void> {
packages/servers/yandex-tracker/src/composition-root/container.ts:275:  const { SearchToolsTool } = await import('@fractalizer/mcp-search');

## mcp-search
knip.json:40:        "@fractalizer/mcp-search",
knip.json:54:        "@fractalizer/mcp-search",
knip.json:65:        "@fractalizer/mcp-search",
ARCHITECTURE.md:36:│   └── search/            → @fractalizer/mcp-search
ARCHITECTURE.md:113:### @fractalizer/mcp-search
README.md:77:| [@fractalizer/mcp-search](packages/framework/search) | Поисковый движок с compile-time индексацией |
README.md:89:│   └── search/            → @fractalizer/mcp-search
README.md:133:npm install @fractalizer/mcp-search
CLAUDE.md:100:│   └── search/            → @fractalizer/mcp-search
CLAUDE.md:146:import { ToolSearchEngine } from '@fractalizer/mcp-search';
package-lock.json:1400:    "node_modules/@fractalizer/mcp-search": {
package-lock.json:17265:      "name": "@fractalizer/mcp-search",
package-lock.json:17284:        "@fractalizer/mcp-search": "^1.6.0",
package-lock.json:17324:        "@fractalizer/mcp-search": "^1.6.0",
package-lock.json:17367:        "@fractalizer/mcp-search": "^1.6.0",
results/1.1_baseline_metrics_summary.md:25:| @fractalizer/mcp-search | 20 | 1,837 | 5.7% |
results/1.1_baseline_metrics_summary.md:49:| @fractalizer/mcp-search | 6 |
results/1.1_baseline_metrics_summary.md:98:| @fractalizer/mcp-search | 89.02% | 79.43% | 87.17% | 89.77% | 135 | ❌ FAIL |
results/1.1_baseline_metrics_summary.md:106:- @fractalizer/mcp-search не достигает порогов покрытия
results/1.1_baseline_metrics_summary.md:107:- Сбор данных прерван из-за ошибки в @fractalizer/mcp-search
results/1.1_baseline_metrics_summary.md:144:| @fractalizer/mcp-search | 2 | 6 |
results/1.1_baseline_metrics_summary.md:193:   - @fractalizer/mcp-search: не достигает порогов (lines 89.77%, branches 79.43%)
results/1.1_baseline_metrics_summary.md:215:   - Исправить threshold в @fractalizer/mcp-search или улучшить покрытие
scripts/update-versions.mjs:53:  '@fractalizer/mcp-search',
packages/framework/core/README.md:28:| Schema → Definition генерация | Поиск tools → `@fractalizer/mcp-search` |
packages/framework/search/README.md:1:# @fractalizer/mcp-search
packages/framework/search/README.md:5:[![npm version](https://img.shields.io/npm/v/@fractalizer/mcp-search.svg)](https://www.npmjs.com/package/@fractalizer/mcp-search)
packages/framework/search/README.md:27:npm install @fractalizer/mcp-search
packages/framework/search/README.md:75:import { ToolSearchEngine } from '@fractalizer/mcp-search';
packages/framework/search/README.md:155:import { WeightedCombinedStrategy, STRATEGY_WEIGHTS } from '@fractalizer/mcp-search';
packages/framework/search/README.md:353:import { SearchStrategy, ToolMetadata } from '@fractalizer/mcp-search';
packages/framework/search/README.md:375:import { STRATEGY_WEIGHTS } from '@fractalizer/mcp-search';
packages/framework/search/vitest.config.ts:17:        '@fractalizer/mcp-search': path.resolve(__dirname, './src'),
packages/framework/search/vitest.config.ts:18:        '@fractalizer/mcp-search/*': path.resolve(__dirname, './src/*'),
packages/framework/search/package.json:2:  "name": "@fractalizer/mcp-search",
packages/servers/README.md:57:    "@fractalizer/mcp-search": "*",
packages/servers/yandex-tracker/README.md:507:- **[@fractalizer/mcp-search](../../framework/search/README.md)** — Поисковый движок
packages/servers/yandex-tracker/package.json:98:    "@fractalizer/mcp-search": "^1.6.0",
packages/servers/yandex-tracker/vitest.config.ts:25:        '@fractalizer/mcp-search': path.resolve(__dirname, '../../framework/search/src'),
packages/servers/yandex-tracker/vitest.config.ts:26:        '@fractalizer/mcp-search/*': path.resolve(__dirname, '../../framework/search/src/*'),
packages/servers/yandex-tracker/CLAUDE.md:26:- **Tool Search System** (из @fractalizer/mcp-search)
packages/servers/yandex-tracker/CLAUDE.md:39:import { ToolSearchEngine } from '@fractalizer/mcp-search';
packages/servers/yandex-tracker/CLAUDE.md:312:- ✅ Используется для compile-time индексирования (@fractalizer/mcp-search)
packages/servers/yandex-tracker/tests/smoke/tool-search.smoke.test.ts:9:import { ToolSearchEngine } from '@fractalizer/mcp-search';
packages/servers/yandex-tracker/tests/smoke/tool-search.smoke.test.ts:10:import { WeightedCombinedStrategy } from '@fractalizer/mcp-search/strategies/weighted-combined.strategy.js';
packages/servers/yandex-tracker/tests/smoke/tool-search.smoke.test.ts:11:import { NameSearchStrategy } from '@fractalizer/mcp-search/strategies/name-search.strategy.js';
packages/servers/yandex-tracker/tests/smoke/tool-search.smoke.test.ts:12:import { DescriptionSearchStrategy } from '@fractalizer/mcp-search/strategies/description-search.strategy.js';
packages/servers/yandex-tracker/tests/smoke/tool-search.smoke.test.ts:13:import { CategorySearchStrategy } from '@fractalizer/mcp-search/strategies/category-search.strategy.js';
packages/servers/yandex-tracker/tests/smoke/tool-search.smoke.test.ts:14:import { FuzzySearchStrategy } from '@fractalizer/mcp-search/strategies/fuzzy-search.strategy.js';
packages/servers/yandex-tracker/tests/smoke/tool-search.smoke.test.ts:16:import type { StaticToolIndex } from '@fractalizer/mcp-search/types.js';
packages/servers/yandex-tracker/tests/mcp/tools/search-tools.tool.test.ts:15:import { SearchToolsTool } from '@fractalizer/mcp-search';
packages/servers/yandex-tracker/tests/mcp/tools/search-tools.tool.test.ts:16:import { ToolSearchEngine } from '@fractalizer/mcp-search/engine';
packages/servers/yandex-tracker/tests/mcp/tools/search-tools.tool.test.ts:23:} from '@fractalizer/mcp-search/strategies';
packages/servers/yandex-tracker/tests/mcp/tools/search-tools.tool.test.ts:25:import type { StaticToolIndex, StrategyType } from '@fractalizer/mcp-search/types.js';
packages/servers/yandex-tracker/scripts/generate-tool-index.ts:26:import type { StaticToolIndex } from '@fractalizer/mcp-search';
packages/servers/yandex-tracker/scripts/generate-tool-index.ts:147:import type { StaticToolIndex } from '@fractalizer/mcp-search';
packages/servers/yandex-tracker/src/tools/generated-index.ts:11:import type { StaticToolIndex } from '@fractalizer/mcp-search';
packages/servers/yandex-tracker/src/tools/helpers/index.ts:7:// SearchToolsTool moved to @fractalizer/mcp-search package
packages/servers/yandex-tracker/src/composition-root/container.ts:29:import { ToolSearchEngine } from '@fractalizer/mcp-search';
packages/servers/yandex-tracker/src/composition-root/container.ts:30:import { WeightedCombinedStrategy } from '@fractalizer/mcp-search';

## 'lazy'
packages/framework/core/tests/tool-registry.contract.test.ts:310:      const definitions = registry.getDefinitionsByMode('lazy', ['tool1']);
packages/framework/core/src/tool-registry/tool-registry.ts:187:   * @param mode - режим обнаружения ('lazy' или 'eager')
packages/framework/core/src/tool-registry/tool-registry.ts:194:    mode: 'lazy' | 'eager',
packages/framework/core/src/tool-registry/tool-registry.ts:199:    if (mode === 'lazy') {
packages/servers/yandex-tracker/tests/tool-registry.test.ts:413:      const definitions = registry.getDefinitionsByMode('lazy', essentialToolsWithPrefixes);
packages/servers/yandex-tracker/tests/tool-registry.test.ts:540:      const definitions = registry.getDefinitionsByMode('lazy', essentialTools);
packages/servers/yandex-tracker/tests/tool-registry.test.ts:776:      const definitions = registry.getDefinitionsByMode('lazy', essentialTools, categoryFilter);
packages/servers/yandex-tracker/tests/smoke/e2e-tool-execution.smoke.test.ts:25:    toolDiscoveryMode: 'lazy',
packages/servers/yandex-tracker/tests/smoke/e2e-tool-execution.smoke.test.ts:116:      toolDiscoveryMode: 'lazy' as const,
packages/servers/yandex-tracker/tests/smoke/mcp-server-lifecycle.smoke.test.ts:25:    toolDiscoveryMode: 'lazy',
packages/servers/yandex-tracker/tests/smoke/mcp-server-lifecycle.smoke.test.ts:111:      toolDiscoveryMode: 'lazy',
packages/servers/yandex-tracker/tests/smoke/mcp-server-lifecycle.smoke.test.ts:123:      toolDiscoveryMode: 'lazy' as const,
packages/servers/yandex-tracker/tests/smoke/di-container.smoke.test.ts:28:    toolDiscoveryMode: 'lazy',
packages/servers/yandex-tracker/tests/smoke/di-container.smoke.test.ts:114:    const lazyConfig = { ...fakeConfig, toolDiscoveryMode: 'lazy' as const };
packages/servers/yandex-tracker/tests/integration/tools/helpers/search/search-tools.tool.integration.test.ts:28:      toolDiscoveryMode: 'lazy', // search_tools требует lazy mode
packages/servers/yandex-tracker/tests/composition-root/container.test.ts:49:      toolDiscoveryMode: 'lazy', // По умолчанию lazy mode для обратной совместимости тестов
packages/servers/yandex-tracker/src/config/server-config.interface.ts:60:   * - 'lazy': tools/list возвращает только essential tools (ping, search_tools)
packages/servers/yandex-tracker/src/config/server-config.interface.ts:67:   * @default 'lazy'
packages/servers/yandex-tracker/src/config/server-config.interface.ts:69:  toolDiscoveryMode: 'lazy' | 'eager';
packages/servers/yandex-tracker/src/config/config-loader.ts:97:function validateToolDiscoveryMode(mode: string | undefined): 'lazy' | 'eager' {
packages/servers/yandex-tracker/src/config/config-loader.ts:98:  if (mode === 'eager' || mode === 'lazy') {
packages/servers/yandex-tracker/src/server/handlers.ts:136:  if (config.toolDiscoveryMode === 'lazy') {
packages/servers/yandex-tracker/src/composition-root/container.ts:330:  if (config.toolDiscoveryMode === 'lazy') {
packages/servers/yandex-wiki/tests/smoke/mcp-server-lifecycle.smoke.test.ts:23:    toolDiscoveryMode: 'lazy',
packages/servers/yandex-wiki/tests/smoke/mcp-server-lifecycle.smoke.test.ts:107:      toolDiscoveryMode: 'lazy',
packages/servers/yandex-wiki/tests/smoke/mcp-server-lifecycle.smoke.test.ts:119:      toolDiscoveryMode: 'lazy' as const,
packages/servers/yandex-wiki/tests/smoke/e2e-tool-execution.smoke.test.ts:25:    toolDiscoveryMode: 'lazy',
packages/servers/yandex-wiki/tests/smoke/e2e-tool-execution.smoke.test.ts:124:      toolDiscoveryMode: 'lazy' as const,
packages/servers/yandex-wiki/tests/smoke/di-container.smoke.test.ts:28:    toolDiscoveryMode: 'lazy',
packages/servers/yandex-wiki/tests/smoke/di-container.smoke.test.ts:120:    const lazyConfig = { ...fakeConfig, toolDiscoveryMode: 'lazy' as const };
packages/servers/yandex-wiki/src/config/server-config.interface.ts:57:   * - 'lazy': tools/list возвращает только essential tools
packages/servers/yandex-wiki/src/config/server-config.interface.ts:62:  toolDiscoveryMode: 'lazy' | 'eager';
packages/servers/yandex-wiki/src/config/config-loader.ts:59:function validateToolDiscoveryMode(mode: string | undefined): 'lazy' | 'eager' {
packages/servers/yandex-wiki/src/config/config-loader.ts:60:  if (mode === 'eager' || mode === 'lazy') {
packages/servers/yandex-wiki/src/server/handlers.ts:136:  if (config.toolDiscoveryMode === 'lazy') {
packages/servers/yandex-wiki/src/composition-root/container.ts:253:  if (config.toolDiscoveryMode === 'lazy') {
packages/servers/ticktick/tests/smoke/mcp-server-lifecycle.smoke.test.ts:162:        discoveryMode: 'lazy' as const,
packages/servers/ticktick/tests/smoke/e2e-tool-execution.smoke.test.ts:38:      discoveryMode: 'lazy',
packages/servers/ticktick/tests/smoke/e2e-tool-execution.smoke.test.ts:141:        discoveryMode: 'lazy' as const,
packages/servers/ticktick/tests/smoke/di-container.smoke.test.ts:140:      tools: { ...fakeConfig.tools, discoveryMode: 'lazy' as const },
packages/servers/ticktick/src/config/server-config.interface.ts:87:   * - 'lazy': tools/list returns only essential tools (ping, search_tools)
packages/servers/ticktick/src/config/server-config.interface.ts:96:  discoveryMode: 'lazy' | 'eager';
packages/servers/ticktick/src/config/config-loader.ts:95:function validateToolDiscoveryMode(mode: string | undefined): 'lazy' | 'eager' {
packages/servers/ticktick/src/config/config-loader.ts:96:  if (mode === 'eager' || mode === 'lazy') {
packages/servers/ticktick/src/server/handlers.ts:127:  if (config.tools.discoveryMode === 'lazy') {
packages/servers/ticktick/src/composition-root/container.ts:302:  if (config.tools.discoveryMode === 'lazy') {

## 'eager'
packages/framework/core/tests/tool-registry.contract.test.ts:322:      const definitions = registry.getDefinitionsByMode('eager');
packages/framework/core/tests/tool-registry.contract.test.ts:333:      const definitions = registry.getDefinitionsByMode('eager', undefined, {
packages/framework/core/tests/tool-registry.contract.test.ts:352:        'eager',
packages/framework/core/src/tool-registry/tool-registry.ts:187:   * @param mode - режим обнаружения ('lazy' или 'eager')
packages/framework/core/src/tool-registry/tool-registry.ts:194:    mode: 'lazy' | 'eager',
packages/servers/yandex-tracker/tests/smoke/e2e-tool-execution.smoke.test.ts:136:      toolDiscoveryMode: 'eager' as const,
packages/servers/yandex-tracker/tests/tool-registry.test.ts:425:      const definitions = registry.getDefinitionsByMode('eager');
packages/servers/yandex-tracker/tests/tool-registry.test.ts:521:      const definitions = registry.getDefinitionsByMode('eager');
packages/servers/yandex-tracker/tests/tool-registry.test.ts:748:      const definitions = registry.getDefinitionsByMode('eager', undefined, categoryFilter);
packages/servers/yandex-tracker/tests/smoke/di-container.smoke.test.ts:127:    const eagerConfig = { ...fakeConfig, toolDiscoveryMode: 'eager' as const };
packages/servers/yandex-tracker/tests/smoke/mcp-server-lifecycle.smoke.test.ts:126:    const eagerConfig = { ...fakeConfig, toolDiscoveryMode: 'eager' as const };
packages/servers/yandex-tracker/tests/smoke/entry-point.smoke.test.ts:108:      toolDiscoveryMode: 'eager' as const,
packages/servers/yandex-tracker/tests/composition-root/container.test.ts:461:        toolDiscoveryMode: 'eager',
packages/servers/yandex-tracker/tests/composition-root/container.test.ts:517:      const definitions = registry.getDefinitionsByMode('eager');
packages/servers/yandex-tracker/scripts/smoke-test-server.ts:127:        // TOOL_DISCOVERY_MODE: 'eager' (по умолчанию) - тестируем полный список инструментов
packages/servers/yandex-tracker/src/server.ts:195:      config.toolDiscoveryMode === 'eager'
packages/servers/yandex-tracker/src/config/server-config.interface.ts:64:   * - 'eager': tools/list возвращает все инструменты (стандартное MCP поведение)
packages/servers/yandex-tracker/src/config/server-config.interface.ts:69:  toolDiscoveryMode: 'lazy' | 'eager';
packages/servers/yandex-tracker/src/config/constants.ts:24:export const DEFAULT_TOOL_DISCOVERY_MODE = 'eager' as const;
packages/servers/yandex-tracker/src/config/config-loader.ts:97:function validateToolDiscoveryMode(mode: string | undefined): 'lazy' | 'eager' {
packages/servers/yandex-tracker/src/config/config-loader.ts:98:  if (mode === 'eager' || mode === 'lazy') {
packages/servers/yandex-tracker/src/server/handlers.ts:144:  if (config.toolDiscoveryMode === 'eager' && metrics.totalTools > 30) {
packages/servers/yandex-wiki/tests/smoke/mcp-server-lifecycle.smoke.test.ts:122:    const eagerConfig = { ...fakeConfig, toolDiscoveryMode: 'eager' as const };
packages/servers/yandex-wiki/tests/smoke/e2e-tool-execution.smoke.test.ts:142:      toolDiscoveryMode: 'eager' as const,
packages/servers/yandex-wiki/tests/smoke/di-container.smoke.test.ts:133:    const eagerConfig = { ...fakeConfig, toolDiscoveryMode: 'eager' as const };
packages/servers/yandex-wiki/tests/smoke/entry-point.smoke.test.ts:112:      toolDiscoveryMode: 'eager' as const,
packages/servers/yandex-wiki/scripts/smoke-test-server.ts:110:        // TOOL_DISCOVERY_MODE: 'eager' (по умолчанию) - тестируем полный список инструментов
packages/servers/yandex-wiki/src/server.ts:195:      config.toolDiscoveryMode === 'eager' ? ['yw_ping'] : YANDEX_WIKI_ESSENTIAL_TOOLS;
packages/servers/yandex-wiki/src/config/server-config.interface.ts:58:   * - 'eager': tools/list возвращает все инструменты
packages/servers/yandex-wiki/src/config/server-config.interface.ts:60:   * @default 'eager'
packages/servers/yandex-wiki/src/config/server-config.interface.ts:62:  toolDiscoveryMode: 'lazy' | 'eager';
packages/servers/yandex-wiki/src/config/constants.ts:21:export const DEFAULT_TOOL_DISCOVERY_MODE = 'eager' as const;
packages/servers/yandex-wiki/src/config/config-loader.ts:59:function validateToolDiscoveryMode(mode: string | undefined): 'lazy' | 'eager' {
packages/servers/yandex-wiki/src/config/config-loader.ts:60:  if (mode === 'eager' || mode === 'lazy') {
packages/servers/yandex-wiki/src/server/handlers.ts:144:  if (config.toolDiscoveryMode === 'eager' && metrics.totalTools > 30) {
packages/servers/ticktick/tests/smoke/e2e-tool-execution.smoke.test.ts:163:        discoveryMode: 'eager' as const,
packages/servers/ticktick/tests/smoke/mcp-server-lifecycle.smoke.test.ts:41:      discoveryMode: 'eager',
packages/servers/ticktick/tests/smoke/mcp-server-lifecycle.smoke.test.ts:139:        discoveryMode: 'eager',
packages/servers/ticktick/tests/smoke/mcp-server-lifecycle.smoke.test.ts:168:      tools: { ...fakeConfig.tools, discoveryMode: 'eager' as const },
packages/servers/ticktick/tests/smoke/di-container.smoke.test.ts:42:      discoveryMode: 'eager',
packages/servers/ticktick/tests/smoke/di-container.smoke.test.ts:156:      tools: { ...fakeConfig.tools, discoveryMode: 'eager' as const },
packages/servers/ticktick/tests/smoke/entry-point.smoke.test.ts:103:        discoveryMode: 'eager' as const,
packages/servers/ticktick/src/server.ts:192:      config.tools.discoveryMode === 'eager' ? ['fr_ticktick_ping'] : TICKTICK_ESSENTIAL_TOOLS;
packages/servers/ticktick/src/config/constants.ts:32:export const DEFAULT_TOOL_DISCOVERY_MODE = 'eager' as const;
packages/servers/ticktick/src/config/config-loader.ts:95:function validateToolDiscoveryMode(mode: string | undefined): 'lazy' | 'eager' {
packages/servers/ticktick/src/config/config-loader.ts:96:  if (mode === 'eager' || mode === 'lazy') {
packages/servers/ticktick/src/config/server-config.interface.ts:91:   * - 'eager': tools/list returns all tools (standard MCP behavior)
packages/servers/ticktick/src/config/server-config.interface.ts:94:   * @default 'eager'
packages/servers/ticktick/src/config/server-config.interface.ts:96:  discoveryMode: 'lazy' | 'eager';
packages/servers/ticktick/src/server/handlers.ts:135:  if (config.tools.discoveryMode === 'eager' && metrics.totalTools > 30) {

