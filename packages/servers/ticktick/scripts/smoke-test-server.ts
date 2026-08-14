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

import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';

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

const TIMEOUT_MS = 20000; // 20 seconds for entire test (main scenario + separate process for DoD 2.1.A)
const SERVER_STARTUP_DELAY_MS = 1000; // 1 second for server startup

/**
 * Main smoke test function
 */
async function main(): Promise<void> {
  console.log('🚀 Starting TickTick MCP server smoke test...\n');

  let serverProcess: ReturnType<typeof spawn> | null = null;
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
    if (serverProcess && !serverProcess.killed) {
      console.log('\n🛑 Stopping server...');
      serverProcess.kill('SIGTERM');

      // Give 2 seconds for graceful shutdown
      await sleep(2000);

      if (!serverProcess.killed) {
        console.log('⚠️  Server did not respond to SIGTERM, sending SIGKILL...');
        serverProcess.kill('SIGKILL');
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

    serverProcess.stdout?.on('data', (data) => {
      stdoutData += data.toString();
    });

    serverProcess.stderr?.on('data', (data) => {
      stderrData += data.toString();
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

    // Give server time to start
    console.log(`   Waiting for server startup (${SERVER_STARTUP_DELAY_MS}ms)...`);
    await sleep(SERVER_STARTUP_DELAY_MS);

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
    const response = await waitForJSONRPCResponse(stdoutData, serverProcess, 1);

    // 4. Validate response
    console.log('\n3️⃣  Validating response');
    validateResponse(response);

    console.log('   ✓ Response is valid');
    console.log(`   ✓ Found ${response.result?.tools?.length ?? 0} tools`);

    // 5. DoD 2.1: two consecutive tools/list calls return a byte-identical list
    console.log('\n4️⃣  Checking order determinism (second tools/list)');
    const secondRequest: JSONRPCRequest = { jsonrpc: '2.0', method: 'tools/list', id: 2 };
    serverProcess.stdin?.write(JSON.stringify(secondRequest) + '\n');
    const secondResponse = await waitForJSONRPCResponse(stdoutData, serverProcess, 2);

    const firstToolsJson = JSON.stringify(response.result?.tools ?? []);
    const secondToolsJson = JSON.stringify(secondResponse.result?.tools ?? []);
    if (firstToolsJson !== secondToolsJson) {
      throw new Error(
        'Two consecutive tools/list calls returned DIFFERENT lists — deterministic order ' +
          'contract is violated (see ToolSorter.sortByPriority).'
      );
    }
    console.log('   ✓ List is byte-identical');
  }

  /**
   * Wait for JSON-RPC response from stdout
   */
  async function waitForJSONRPCResponse(
    stdoutBuffer: string,
    process: ReturnType<typeof spawn>,
    expectedId: number
  ): Promise<JSONRPCResponse> {
    return new Promise((resolve, reject) => {
      let buffer = stdoutBuffer;

      const onData = (data: Buffer) => {
        buffer += data.toString();

        // Try to find JSON-RPC response in buffer
        const lines = buffer.split('\n');
        for (const line of lines) {
          if (!line.trim()) continue;

          try {
            const parsed = JSON.parse(line) as JSONRPCResponse;
            if (parsed.jsonrpc === '2.0' && parsed.id === expectedId) {
              process.stdout?.off('data', onData);
              resolve(parsed);
              return;
            }
          } catch {
            // Not JSON or incomplete JSON, continue waiting
          }
        }
      };

      process.stdout?.on('data', onData);

      // Timeout for receiving response (5 seconds)
      setTimeout(() => {
        process.stdout?.off('data', onData);
        reject(new Error('Timeout waiting for server response (5000ms)'));
      }, 5000);
    });
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
  child.stdout?.on('data', (data) => {
    stdoutData += data.toString();
  });
  child.stderr?.on('data', (data) => {
    stderrData += data.toString();
  });

  try {
    await sleep(SERVER_STARTUP_DELAY_MS);

    if (child.exitCode !== null || child.killed) {
      throw new Error(
        `Server crashed at startup with deprecated TOOL_DISCOVERY_MODE\nstderr: ${stderrData}`
      );
    }

    if (!stderrData.includes('TOOL_DISCOVERY_MODE')) {
      throw new Error(
        `Server did not print a TOOL_DISCOVERY_MODE warning to stderr.\nstderr: ${stderrData}`
      );
    }
    console.log('   ✓ Warning printed to stderr, server did not crash');

    // Server should keep responding normally to tools/list
    const request: JSONRPCRequest = { jsonrpc: '2.0', method: 'tools/list', id: 1 };
    child.stdin?.write(JSON.stringify(request) + '\n');

    const response = await new Promise<JSONRPCResponse>((resolve, reject) => {
      let buffer = stdoutData;
      const onData = (data: Buffer): void => {
        buffer += data.toString();
        for (const line of buffer.split('\n')) {
          if (!line.trim()) continue;
          try {
            const parsed = JSON.parse(line) as JSONRPCResponse;
            if (parsed.jsonrpc === '2.0' && parsed.id === 1) {
              child.stdout?.off('data', onData);
              resolve(parsed);
              return;
            }
          } catch {
            // incomplete JSON, keep waiting
          }
        }
      };
      child.stdout?.on('data', onData);
      setTimeout(() => {
        child.stdout?.off('data', onData);
        reject(
          new Error('Timeout waiting for tools/list after TOOL_DISCOVERY_MODE warning (5000ms)')
        );
      }, 5000);
    });

    if (response.error || !response.result?.tools?.length) {
      throw new Error(
        `tools/list did not work normally after the warning: ${JSON.stringify(response)}`
      );
    }
    console.log(`   ✓ tools/list keeps working (${response.result.tools.length} tools)`);
  } finally {
    if (!child.killed) {
      child.kill('SIGTERM');
      await sleep(1000);
      if (!child.killed) {
        child.kill('SIGKILL');
      }
    }
  }
}

// Run
main().catch((error) => {
  console.error('💥 Critical error:', error);
  process.exit(1);
});
