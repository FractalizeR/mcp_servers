#!/usr/bin/env tsx
/**
 * Smoke-test MCP server
 *
 * Checks on the REAL built bundle:
 * 1. Server starts successfully
 * 2. Responds to JSON-RPC tools/list request
 * 3. Returns a valid full list of tools
 * 4. Two consecutive tools/list calls return a byte-identical list (DoD 2.1)
 * 5. The deprecated TOOL_DISCOVERY_MODE env var does not crash the server and
 *    prints a warning to stderr (DoD 2.1.A)
 * 6. Server gracefully shuts down
 */

import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';

interface JSONRPCRequest {
  jsonrpc: string;
  method: string;
  id: number;
  params?: Record<string, unknown>;
}

interface JSONRPCResponse {
  jsonrpc: string;
  id: number;
  result?: {
    tools?: Array<{ name: string }>;
  };
  error?: {
    code: number;
    message: string;
  };
}

// 55s: the 4 windows inside the test (2×RESPONSE_WAIT_TIMEOUT_MS in
// runSmokeTest + STDERR_PATTERN_TIMEOUT_MS and RESPONSE_WAIT_TIMEOUT_MS in
// runDeprecatedEnvVarSmokeTest) add up to exactly 40000 with no slack for two
// spawns and bundle parsing — if all four windows were ever fully exhausted,
// the global timeout used to fire first and replace the specific window's
// diagnosable message with a bare "test exceeded timeout". 15s (37.5%) slack.
const TIMEOUT_MS = 55000;
const RESPONSE_WAIT_TIMEOUT_MS = 10000; // event-based wait for a JSON-RPC response
const STDERR_PATTERN_TIMEOUT_MS = 10000; // event-based wait for a stderr substring
// Fallback before SIGKILL on a normal SIGTERM shutdown — the 'exit' event
// usually arrives almost instantly, the timer is only a safety net.
const SHUTDOWN_GRACE_MS = 2000;
const SHUTDOWN_GRACE_MS_SECONDARY = 1000;

/**
 * Wait until a JSON-RPC response with `expectedId` shows up on `proc`'s
 * stdout. Resolves the instant a matching line is parsed — not tied to any
 * fixed delay, so it is not sensitive to how fast the host machine is.
 *
 * Also settles early (with diagnostics, including everything collected on
 * stderr so far) if the process closes or errors before responding, instead
 * of silently waiting out the full timeout.
 */
async function waitForJSONRPCResponse(
  stdoutBuffer: string,
  proc: ChildProcessWithoutNullStreams,
  expectedId: number,
  getStderr: () => string,
  timeoutMs: number
): Promise<JSONRPCResponse> {
  return new Promise((resolve, reject) => {
    let buffer = stdoutBuffer;
    let settled = false;

    const finish = (fn: () => void): void => {
      if (settled) return;
      settled = true;
      proc.stdout?.off('data', onData);
      proc.off('close', onClose);
      proc.off('error', onError);
      clearTimeout(timer);
      fn();
    };

    const onData = (chunk: unknown): void => {
      buffer += assertUtf8Chunk(chunk);

      // Try to find JSON-RPC response in buffer
      const lines = buffer.split('\n');
      for (const line of lines) {
        if (!line.trim()) continue;

        try {
          const parsed = JSON.parse(line) as JSONRPCResponse;
          if (parsed.jsonrpc === '2.0' && parsed.id === expectedId) {
            finish(() => resolve(parsed));
            return;
          }
        } catch {
          // Not JSON or incomplete JSON, continue waiting
        }
      }
    };

    const onClose = (code: number | null, signal: NodeJS.Signals | null): void => {
      finish(() =>
        reject(
          new Error(
            `Process closed (code=${code}, signal=${signal}) before responding to request id=${expectedId}.\n` +
              `stderr: ${getStderr()}`
          )
        )
      );
    };

    const onError = (error: Error): void => {
      finish(() =>
        reject(
          new Error(`Process error while waiting for response id=${expectedId}: ${error.message}`)
        )
      );
    };

    proc.stdout?.on('data', onData);
    proc.on('close', onClose);
    proc.on('error', onError);

    const timer = setTimeout(() => {
      finish(() =>
        reject(
          new Error(
            `Timeout (${timeoutMs}ms) waiting for JSON-RPC response id=${expectedId}.\n` +
              `stderr: ${getStderr()}`
          )
        )
      );
    }, timeoutMs);
  });
}

/**
 * Wait until `getStderr()` contains `pattern`, resolving as soon as newly
 * arrived stderr data makes it match — not tied to any fixed delay. This is
 * what closes the actual race that made this smoke test flaky in CI: the
 * previous version slept a fixed 1000ms and then inspected whatever had
 * accumulated in stderr exactly once, so on a slower/loaded machine the
 * check could run before the warning had been written.
 *
 * Also settles early if the process closes/errors before the pattern
 * appears, and always includes the stderr collected so far in any rejection
 * so a failure is diagnosable without re-running.
 */
async function waitForStderrSubstring(
  child: ChildProcessWithoutNullStreams,
  pattern: string,
  getStderr: () => string,
  timeoutMs: number
): Promise<void> {
  // Data may have already arrived (and been accumulated by the caller's own
  // 'data' listener) before this function was even called.
  if (getStderr().includes(pattern)) {
    return;
  }

  return new Promise<void>((resolve, reject) => {
    let settled = false;

    const finish = (fn: () => void): void => {
      if (settled) return;
      settled = true;
      child.stderr?.off('data', onData);
      child.off('close', onClose);
      child.off('error', onError);
      clearTimeout(timer);
      fn();
    };

    const onData = (): void => {
      if (getStderr().includes(pattern)) {
        finish(resolve);
      }
    };

    const onClose = (code: number | null, signal: NodeJS.Signals | null): void => {
      finish(() =>
        reject(
          new Error(
            `Process closed (code=${code}, signal=${signal}) before stderr contained "${pattern}".\n` +
              `stderr so far: ${getStderr()}`
          )
        )
      );
    };

    const onError = (error: Error): void => {
      finish(() =>
        reject(new Error(`Process error before stderr contained "${pattern}": ${error.message}`))
      );
    };

    child.stderr?.on('data', onData);
    child.on('close', onClose);
    child.on('error', onError);

    const timer = setTimeout(() => {
      finish(() =>
        reject(
          new Error(
            `Timeout (${timeoutMs}ms) waiting for stderr to contain "${pattern}".\n` +
              `stderr so far: ${getStderr()}`
          )
        )
      );
    }, timeoutMs);
  });
}

/**
 * Stop a process on the 'exit' event instead of a fixed pause: SIGTERM →
 * wait for 'exit' → SIGKILL once `fallbackMs` elapses if the process didn't
 * react. Resolves almost instantly in the normal case, right after the
 * process actually terminates, rather than after an arbitrarily chosen
 * pause. Returns `true` if a forced SIGKILL was needed (for the caller's log).
 */
async function stopGracefully(
  proc: ChildProcessWithoutNullStreams,
  fallbackMs: number
): Promise<boolean> {
  if (proc.exitCode !== null || proc.signalCode !== null) {
    return false;
  }
  return new Promise<boolean>((resolve) => {
    let settled = false;
    const finish = (forcedKill: boolean): void => {
      if (settled) return;
      settled = true;
      proc.off('exit', onExit);
      clearTimeout(timer);
      resolve(forcedKill);
    };
    const onExit = (): void => finish(false);

    proc.on('exit', onExit);
    proc.kill('SIGTERM');
    const timer = setTimeout(() => {
      proc.kill('SIGKILL');
      finish(true);
    }, fallbackMs);
  });
}

const MISMATCH_CONTEXT_CHARS = 120;

/**
 * The only allowed way to turn a stream chunk into a string.
 *
 * A naive `chunk.toString()` decodes every chunk on its own and tears
 * multi-byte UTF-8 apart on the chunk boundary: one letter becomes two U+FFFD
 * and the response length shifts by a character. That is what produced "two
 * consecutive tools/list calls returned different lists" in the release CI
 * (4 of 6 failures). Streams are therefore switched to `setEncoding('utf8')` —
 * a single shared decoder per stream that stitches a sequence across the chunk
 * boundary — and this check keeps anyone from silently going back to per-chunk
 * decoding.
 */
function assertUtf8Chunk(chunk: unknown): string {
  if (typeof chunk !== 'string') {
    throw new Error(
      'Child process stream is not in setEncoding("utf8") mode — got a Buffer. ' +
        'Decoding chunks individually tears multi-byte UTF-8 on the chunk boundary.'
    );
  }
  return chunk;
}

/**
 * A U+FFFD in the server response means a broken read on the test side, not a
 * server bug. The check sits on the green path on purpose: damage that hits
 * both responses identically produces no mismatch and would otherwise pass
 * unnoticed.
 */
function assertNoDecodingDamage(label: string, json: string): void {
  const at = json.indexOf('\uFFFD');
  if (at < 0) {
    return;
  }
  const window = json.slice(Math.max(0, at - MISMATCH_CONTEXT_CHARS), at + MISMATCH_CONTEXT_CHARS);
  throw new Error(
    `${label}: found U+FFFD at index ${at}. This is a test-side READ DEFECT, not a server ` +
      'bug: multi-byte UTF-8 was torn on a chunk boundary. Check that the stream uses ' +
      `setEncoding("utf8") and that chunks are not decoded one by one.\n  ${JSON.stringify(window)}`
  );
}

function toolNamesForDiagnostics(tools: unknown): string[] {
  if (!Array.isArray(tools)) {
    return [];
  }
  return tools.map((tool, index) => {
    const name = (tool as { name?: unknown } | null)?.name;
    return typeof name === 'string' ? name : `<no-name@${index}>`;
  });
}

function duplicatedNames(names: string[]): string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const name of names) {
    if (seen.has(name)) {
      duplicates.add(name);
    }
    seen.add(name);
  }
  return [...duplicates];
}

/**
 * Report describing how two `tools/list` responses differ; `undefined` when the
 * lists are byte-identical.
 *
 * The only data about the four release failures is the GitHub Actions log, so
 * the report must be self-contained: it has to show what exactly diverged
 * without a re-run (the mismatch does not reproduce locally).
 */
function describeToolsListMismatch(first: unknown, second: unknown): string | undefined {
  const firstJson = JSON.stringify(first ?? []);
  const secondJson = JSON.stringify(second ?? []);
  if (firstJson === secondJson) {
    return undefined;
  }

  const lines: string[] = ['===== tools/list mismatch diagnostics ====='];
  lines.push(`json length: first=${firstJson.length}, second=${secondJson.length} (UTF-16 units)`);

  let diffAt = 0;
  while (
    diffAt < firstJson.length &&
    diffAt < secondJson.length &&
    firstJson[diffAt] === secondJson[diffAt]
  ) {
    diffAt += 1;
  }
  const from = Math.max(0, diffAt - MISMATCH_CONTEXT_CHARS);
  const to = diffAt + MISMATCH_CONTEXT_CHARS;
  lines.push(`first difference at index ${diffAt}; window [${from}, ${to}):`);
  lines.push(`  first : ${JSON.stringify(firstJson.slice(from, to))}`);
  lines.push(`  second: ${JSON.stringify(secondJson.slice(from, to))}`);

  const firstNames = toolNamesForDiagnostics(first);
  const secondNames = toolNamesForDiagnostics(second);
  lines.push(`tool count: first=${firstNames.length}, second=${secondNames.length}`);
  if (firstJson.includes('\uFFFD') || secondJson.includes('\uFFFD')) {
    lines.push(
      'VERDICT: the response contains U+FFFD — this is a test-side READ defect ' +
        '(multi-byte UTF-8 torn on a chunk boundary), not a server-side divergence.'
    );
  }

  const firstSet = new Set(firstNames);
  const secondSet = new Set(secondNames);
  const onlyInFirst = [...firstSet].filter((name) => !secondSet.has(name));
  const onlyInSecond = [...secondSet].filter((name) => !firstSet.has(name));
  lines.push(`only in first (${onlyInFirst.length}): ${onlyInFirst.join(', ') || '-'}`);
  lines.push(`only in second (${onlyInSecond.length}): ${onlyInSecond.join(', ') || '-'}`);

  const firstDuplicates = duplicatedNames(firstNames);
  const secondDuplicates = duplicatedNames(secondNames);
  if (firstDuplicates.length > 0 || secondDuplicates.length > 0) {
    lines.push(
      `duplicate names: first=[${firstDuplicates.join(', ')}], second=[${secondDuplicates.join(', ')}]`
    );
  }

  if (onlyInFirst.length === 0 && onlyInSecond.length === 0) {
    const reordered = firstNames
      .map((name, index) =>
        secondNames[index] === name
          ? undefined
          : `#${index}: ${name} -> ${secondNames[index] ?? '<missing>'}`
      )
      .filter((entry): entry is string => entry !== undefined);
    lines.push(
      reordered.length === 0
        ? 'name order: identical (names and order match, so the difference is inside tool definitions - see the window above)'
        : `name order differs at ${reordered.length} position(s), first 20: ${reordered.slice(0, 20).join('; ')}`
    );
  }

  return lines.join('\n');
}

/**
 * Main smoke test function
 */
async function main(): Promise<void> {
  console.log('🚀 Starting TickTick MCP server smoke test...\n');

  let serverProcess: ChildProcessWithoutNullStreams | null = null;
  let timeoutId: NodeJS.Timeout | null = null;

  try {
    // Set global timeout
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => {
        reject(new Error(`Test exceeded timeout ${TIMEOUT_MS}ms`));
      }, TIMEOUT_MS);
    });

    // Run test with timeout
    await Promise.race([
      (async () => {
        await runSmokeTest();
        await runDeprecatedEnvVarSmokeTest();
      })(),
      timeoutPromise,
    ]);

    console.log('\n✅ Smoke test passed!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Smoke test failed:', (error as Error).message);
    process.exit(1);
  } finally {
    // Clear timeout
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    // Kill server process if still running
    //
    // TS не отслеживает присваивание `serverProcess` внутри вложенной функции
    // runSmokeTest() как часть control flow этого блока — без приведения типа
    // здесь `serverProcess` сужается до `never` (TS2339), хотя рантайм-значение
    // корректно (см. https://github.com/microsoft/TypeScript/issues/9998).
    const proc = serverProcess as unknown as ChildProcessWithoutNullStreams | null;
    if (proc) {
      console.log('\n🛑 Stopping server...');
      const forcedKill = await stopGracefully(proc, SHUTDOWN_GRACE_MS);
      if (forcedKill) {
        console.log('⚠️  Server did not respond to SIGTERM, sending SIGKILL...');
      }
    }
  }

  /**
   * Main smoke test logic
   */
  async function runSmokeTest(): Promise<void> {
    // 1. Start server
    console.log('1️⃣  Starting server: node dist/ticktick.bundle.cjs');
    serverProcess = spawn('node', ['dist/ticktick.bundle.cjs'], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: {
        ...process.env,
        LOG_LEVEL: 'error', // Minimal logging level
        TICKTICK_ACCESS_TOKEN: 'dummy-token-for-smoke-test', // Fake token for test
      },
    });

    // Buffers for stdout/stderr
    let stdoutData = '';
    let stderrData = '';

    // One shared decoder per stream (see assertUtf8Chunk): both stdout and
    // stderr have several listeners, and per-chunk decoding by each of them
    // would tear multi-byte UTF-8 on the chunk boundary.
    serverProcess.stdout?.setEncoding('utf8');
    serverProcess.stderr?.setEncoding('utf8');

    serverProcess.stdout?.on('data', (chunk: unknown) => {
      stdoutData += assertUtf8Chunk(chunk);
    });

    serverProcess.stderr?.on('data', (chunk: unknown) => {
      stderrData += assertUtf8Chunk(chunk);
    });

    // Handle startup errors
    serverProcess.on('error', (error) => {
      throw new Error(`Failed to start server: ${error.message}`);
    });

    serverProcess.on('exit', (code, signal) => {
      if (code !== null && code !== 0) {
        throw new Error(`Server unexpectedly exited with code ${code}\nstderr: ${stderrData}`);
      }
      if (signal && signal !== 'SIGTERM' && signal !== 'SIGKILL') {
        throw new Error(`Server was killed by signal ${signal}\nstderr: ${stderrData}`);
      }
    });

    // No fixed startup pause here: stdin writes are buffered by the OS pipe
    // regardless of whether the child has finished starting up yet, and
    // waitForJSONRPCResponse() below waits for the actual response event
    // (with its own timeout), so there is nothing useful to wait for before
    // sending the first request.

    // 2. Send JSON-RPC tools/list request
    console.log('\n2️⃣  Sending JSON-RPC request: tools/list');
    const request: JSONRPCRequest = {
      jsonrpc: '2.0',
      method: 'tools/list',
      id: 1,
    };

    serverProcess.stdin?.write(JSON.stringify(request) + '\n');
    console.log('   Request sent, waiting for response...');

    // 3. Wait for response
    const response = await waitForJSONRPCResponse(
      stdoutData,
      serverProcess,
      1,
      () => stderrData,
      RESPONSE_WAIT_TIMEOUT_MS
    );

    // 4. Validate response
    console.log('\n3️⃣  Validating response');
    validateResponse(response);

    console.log('   ✓ Response is valid');
    console.log(`   ✓ Found ${response.result?.tools?.length ?? 0} tools`);

    // 5. DoD 2.1: two consecutive tools/list calls return a byte-identical list
    console.log('\n4️⃣  Checking order determinism (second tools/list)');
    const secondRequest: JSONRPCRequest = { jsonrpc: '2.0', method: 'tools/list', id: 2 };
    serverProcess.stdin?.write(JSON.stringify(secondRequest) + '\n');
    const secondResponse = await waitForJSONRPCResponse(
      stdoutData,
      serverProcess,
      2,
      () => stderrData,
      RESPONSE_WAIT_TIMEOUT_MS
    );

    assertNoDecodingDamage('tools/list', JSON.stringify(response.result?.tools));
    const mismatch = describeToolsListMismatch(
      response.result?.tools,
      secondResponse.result?.tools
    );
    if (mismatch !== undefined) {
      console.log(mismatch);
      throw new Error(
        'Two consecutive tools/list calls returned DIFFERENT lists — deterministic order ' +
          `contract is violated (see ToolSorter.sortByPriority).\n${mismatch}`
      );
    }
    console.log('   ✓ List is byte-identical');
  }

  /**
   * Validate JSON-RPC response
   */
  function validateResponse(response: JSONRPCResponse): void {
    // Check basic JSON-RPC structure
    if (response.jsonrpc !== '2.0') {
      throw new Error(`Invalid JSON-RPC version: ${response.jsonrpc}`);
    }

    if (response.id !== 1) {
      throw new Error(`Invalid response id: ${response.id}`);
    }

    // Check for errors
    if (response.error) {
      throw new Error(`Server returned error: [${response.error.code}] ${response.error.message}`);
    }

    // Check for result
    if (!response.result) {
      throw new Error('Missing result field in response');
    }

    // Check for tools
    if (!response.result.tools || !Array.isArray(response.result.tools)) {
      throw new Error('Missing or invalid tools field in result');
    }

    // Check that tools list is not empty
    if (response.result.tools.length === 0) {
      throw new Error('Tools list is empty');
    }

    // Check minimum number of tools (should be >= 10)
    const MIN_EXPECTED_TOOLS = 10;
    if (response.result.tools.length < MIN_EXPECTED_TOOLS) {
      const toolNames = response.result.tools.map((t) => t.name).join(', ');
      throw new Error(
        `Expected at least ${MIN_EXPECTED_TOOLS} tools, got ${response.result.tools.length}. ` +
          `Tools: ${toolNames}`
      );
    }

    // Check structure of first tool
    const firstTool = response.result.tools[0];
    if (!firstTool || typeof firstTool.name !== 'string') {
      throw new Error('Invalid tool structure (missing name)');
    }

    // Check for critical tools
    const toolNames = response.result.tools.map((t) => t.name);
    const requiredTools = ['fr_ticktick_ping'];
    for (const requiredTool of requiredTools) {
      if (!toolNames.includes(requiredTool)) {
        throw new Error(
          `Critical tool "${requiredTool}" is missing from list. ` +
            `Available: ${toolNames.join(', ')}`
        );
      }
    }

    // Check that search_tools is NOT present — @fractalizer/mcp-search package
    // has been removed, progressive tool disclosure is no longer server-side
    if (toolNames.includes('search_tools')) {
      throw new Error(
        'Tool "search_tools" is present in list, but the mcp-search package is removed.'
      );
    }
  }
}

/**
 * DoD 2.1.A: the deprecated TOOL_DISCOVERY_MODE env var must not crash the
 * server — it should only warn on stderr and continue normal operation.
 *
 * Separate process, separate lifecycle (own start/stop), since the env var
 * only matters at startup.
 */
async function runDeprecatedEnvVarSmokeTest(): Promise<void> {
  console.log('\n5️⃣  Checking TOOL_DISCOVERY_MODE deprecation warning');

  const child = spawn('node', ['dist/ticktick.bundle.cjs'], {
    stdio: ['pipe', 'pipe', 'pipe'],
    env: {
      ...process.env,
      LOG_LEVEL: 'error',
      TICKTICK_ACCESS_TOKEN: 'dummy-token-for-smoke-test',
      TOOL_DISCOVERY_MODE: 'eager', // No longer supported — should warn, not crash
    },
  });

  let stdoutData = '';
  let stderrData = '';
  child.stdout?.setEncoding('utf8');
  child.stderr?.setEncoding('utf8');
  child.stdout?.on('data', (chunk: unknown) => {
    stdoutData += assertUtf8Chunk(chunk);
  });
  child.stderr?.on('data', (chunk: unknown) => {
    stderrData += assertUtf8Chunk(chunk);
  });

  try {
    // Event-based: resolves the instant the warning line lands on stderr, or
    // fails fast (with the collected stderr) if the process closes/errors
    // first, instead of sampling the buffer once after a fixed pause.
    await waitForStderrSubstring(
      child,
      'TOOL_DISCOVERY_MODE',
      () => stderrData,
      STDERR_PATTERN_TIMEOUT_MS
    );
    console.log('   ✓ Warning printed to stderr, server did not crash');

    // Server should keep responding normally to tools/list
    const request: JSONRPCRequest = { jsonrpc: '2.0', method: 'tools/list', id: 1 };
    child.stdin?.write(JSON.stringify(request) + '\n');

    const response = await waitForJSONRPCResponse(
      stdoutData,
      child,
      1,
      () => stderrData,
      RESPONSE_WAIT_TIMEOUT_MS
    );

    if (response.error || !response.result?.tools?.length) {
      throw new Error(
        `tools/list did not work normally after the warning: ${JSON.stringify(response)}`
      );
    }
    console.log(`   ✓ tools/list keeps working (${response.result.tools.length} tools)`);
  } finally {
    const forcedKill = await stopGracefully(child, SHUTDOWN_GRACE_MS_SECONDARY);
    if (forcedKill) {
      console.log('   ⚠️  Child process did not respond to SIGTERM, sending SIGKILL...');
    }
  }
}

// Run
main().catch((error) => {
  console.error('💥 Critical error:', error);
  process.exit(1);
});
