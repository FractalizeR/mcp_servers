#!/usr/bin/env tsx
/**
 * Smoke-тест собранного бандла TickTick.
 *
 * Сценарии и их порядок — в общем харнессе
 * (`packages/servers/scripts/mcp-wire-harness/smoke-test.ts`); здесь только
 * то, чем этот сервер отличается от двух других: бандл, переменные окружения,
 * ожидания по списку инструментов и строки отчёта.
 */

import { runSmokeTest } from '../../scripts/mcp-wire-harness/index.js';

await runSmokeTest({
  label: 'TickTick',
  bundlePath: 'dist/ticktick.bundle.cjs',
  baseEnv: {
    TICKTICK_ACCESS_TOKEN: 'dummy-token-for-smoke-test',
  },
  deprecatedEnvVar: { name: 'TOOL_DISCOVERY_MODE', value: 'eager' },
  minExpectedTools: 10,
  requiredTools: ['fr_ticktick_ping'],
  forbiddenTools: ['search_tools'],
  messages: {
    header: '🚀 Starting MCP server smoke test...\n',
    startingServer: '1️⃣  Starting server: node dist/ticktick.bundle.cjs',
    sendingRequest: '\n2️⃣  Sending JSON-RPC request: tools/list',
    awaitingResponse: '   Request sent, awaiting response...',
    validating: '\n3️⃣  Validating response',
    responseValid: '   ✓ Response is valid',
    toolsFound: (count: number) => `   ✓ Found ${count} tools`,
    determinism: '\n4️⃣  Checking order determinism (second tools/list)',
    listIdentical: '   ✓ List is byte-identical',
    deprecatedEnvVar: '\n5️⃣  Checking TOOL_DISCOVERY_MODE deprecation warning',
    warningPresent: '   ✓ Warning printed to stderr, server did not crash',
    stillWorking: (count: number) => `   ✓ tools/list keeps working (${count} tools)`,
    passed: '\n✅ Smoke test passed!',
    failed: '\n❌ Smoke test failed:',
    stoppingServer: '\n🛑 Stopping server...',
  },
});
