#!/usr/bin/env tsx

/**
 * CLI Performance Benchmarks
 *
 * Измеряет производительность framework-based CLI vs legacy CLI:
 * - Startup time (--help)
 * - Command execution time (list, status)
 *
 * Использует feature flag USE_FRAMEWORK_CLI для переключения между версиями.
 */

import { performance } from 'perf_hooks';
import { execSync } from 'child_process';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface BenchmarkResult {
  name: string;
  legacy: number;
  framework: number;
  diff: number;
  diffPercent: number;
  status: '✅ OK' | '⚠️  WARN' | '❌ FAIL';
}

const CLI_PATH = resolve(__dirname, '../dist/cli/bin/mcp-connect.js');
const ITERATIONS = 5; // Среднее из 5 запусков
const STARTUP_THRESHOLD = 20; // %
const COMMAND_THRESHOLD = 15; // %

/**
 * Измеряет время выполнения команды CLI
 */
function measureCommand(args: string, useFramework: boolean): number {
  const env = {
    ...process.env,
    USE_FRAMEWORK_CLI: useFramework ? 'true' : 'false',
    DEBUG_CLI_MIGRATION: 'false', // Отключаем debug для чистых измерений
  };

  const start = performance.now();

  try {
    execSync(`node ${CLI_PATH} ${args}`, {
      env,
      stdio: 'ignore',
      timeout: 5000, // 5 секунд максимум
    });
  } catch (error) {
    // Некоторые команды могут завершиться с ошибкой (например, если нет клиентов)
    // Но мы все равно измеряем время до ошибки
  }

  const end = performance.now();
  return end - start;
}

/**
 * Запускает benchmark несколько раз и возвращает среднее значение
 */
function runBenchmark(name: string, args: string): BenchmarkResult {
  console.log(`\n📊 Benchmarking: ${name}...`);

  // Legacy (warmup + measurements)
  console.log('  Measuring legacy...');
  measureCommand(args, false); // warmup
  const legacyTimes: number[] = [];
  for (let i = 0; i < ITERATIONS; i++) {
    legacyTimes.push(measureCommand(args, false));
  }
  const legacyAvg = legacyTimes.reduce((a, b) => a + b, 0) / ITERATIONS;

  // Framework (warmup + measurements)
  console.log('  Measuring framework...');
  measureCommand(args, true); // warmup
  const frameworkTimes: number[] = [];
  for (let i = 0; i < ITERATIONS; i++) {
    frameworkTimes.push(measureCommand(args, true));
  }
  const frameworkAvg = frameworkTimes.reduce((a, b) => a + b, 0) / ITERATIONS;

  const diff = frameworkAvg - legacyAvg;
  const diffPercent = (diff / legacyAvg) * 100;

  // Определяем статус
  let status: BenchmarkResult['status'];
  const threshold = args.includes('--help') ? STARTUP_THRESHOLD : COMMAND_THRESHOLD;

  if (diffPercent > threshold) {
    status = '❌ FAIL';
  } else if (diffPercent > threshold / 2) {
    status = '⚠️  WARN';
  } else {
    status = '✅ OK';
  }

  return {
    name,
    legacy: legacyAvg,
    framework: frameworkAvg,
    diff,
    diffPercent,
    status,
  };
}

async function main() {
  console.log('🔬 CLI Performance Benchmarks');
  console.log('===============================\n');
  console.log(`CLI Path: ${CLI_PATH}`);
  console.log(`Iterations per test: ${ITERATIONS}`);
  console.log(`Thresholds: Startup ≤${STARTUP_THRESHOLD}%, Commands ≤${COMMAND_THRESHOLD}%`);

  // Проверяем что CLI собран
  try {
    execSync(`test -f ${CLI_PATH}`, { stdio: 'ignore' });
  } catch {
    console.error('❌ CLI not built! Run: npm run build');
    process.exit(1);
  }

  const results: BenchmarkResult[] = [];

  // Benchmark 1: Startup time (--help)
  results.push(runBenchmark('Startup time (--help)', '--help'));

  // Benchmark 2: List command
  results.push(runBenchmark('List command', 'list'));

  // Benchmark 3: Status command
  results.push(runBenchmark('Status command', 'status'));

  // Показываем результаты
  console.log('\n\n📈 Results:');
  console.log('===========\n');

  console.table(
    results.map((r) => ({
      Command: r.name,
      'Legacy (ms)': r.legacy.toFixed(2),
      'Framework (ms)': r.framework.toFixed(2),
      'Diff (ms)': r.diff.toFixed(2),
      'Diff (%)': r.diffPercent.toFixed(2) + '%',
      Status: r.status,
    }))
  );

  // Проверяем failures
  const failures = results.filter((r) => r.status === '❌ FAIL');
  const warnings = results.filter((r) => r.status === '⚠️  WARN');

  console.log('\n');

  if (failures.length > 0) {
    console.error('❌ Performance regression detected!\n');
    console.error('Commands exceeding threshold:');
    failures.forEach((f) => {
      const threshold = f.name.includes('--help') ? STARTUP_THRESHOLD : COMMAND_THRESHOLD;
      console.error(`  - ${f.name}: +${f.diffPercent.toFixed(2)}% (threshold: ${threshold}%)`);
    });
    console.error('\n⚠️  Action required: Optimize before release!');
    process.exit(1);
  }

  if (warnings.length > 0) {
    console.warn('⚠️  Minor regressions detected:\n');
    warnings.forEach((w) => {
      console.warn(`  - ${w.name}: +${w.diffPercent.toFixed(2)}%`);
    });
    console.warn('\n⚡ Consider optimization, but acceptable for release.');
  } else {
    console.log('✅ All benchmarks passed with excellent performance!');
  }

  process.exit(0);
}

main();
