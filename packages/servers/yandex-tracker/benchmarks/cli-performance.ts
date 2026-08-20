#!/usr/bin/env tsx

/**
 * CLI Performance Benchmarks
 *
 * Измеряет абсолютное время выполнения команд собранного CLI и сравнивает
 * с потолками из ABSOLUTE_THRESHOLDS_MS.
 *
 * Почему абсолютные пороги, а не сравнение двух версий: прежняя редакция
 * гоняла один и тот же бинарник дважды под флагом USE_FRAMEWORK_CLI и
 * сравнивала половины между собой. Флаг перестал читаться кодом после
 * завершения миграции на @fractalizer/mcp-cli, так что «legacy» и
 * «framework» исполняли одно и то же, дельта колебалась около нуля, и гейт
 * не мог сработать ни при какой регрессии.
 *
 * Почему здесь нет команды status: она опрашивает внешние CLI (claude,
 * gemini, qwen, codex) через дочерние процессы, поэтому её время — свойство
 * машины разработчика, а не измеряемого кода. На машине с установленным,
 * но неотвечающим `claude` она упирается в CLAUDE_MCP_LIST_TIMEOUT_MS и
 * занимает ~5 с. Прежняя редакция мерила её с execSync({timeout: 5000}) и
 * пустым catch — процесс убивался по таймауту, время фиксировалось как
 * ~5000 мс для обеих «версий», и бенчмарк рапортовал «✅ OK».
 */

import { performance } from 'perf_hooks';
import { execFileSync } from 'child_process';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const CLI_PATH = resolve(__dirname, '../dist/cli/bin/mcp-connect.js');
const ITERATIONS = 7;

/**
 * Потолки «дальше не расти», а не цель. Замер на Apple Silicon, Node 22
 * (медианы: --help 114 мс, list 196 мс) плюс запас под более медленный
 * агент CI. Опускать по факту улучшения, поднимать — только вместе с
 * объяснением, почему команда стала дороже.
 */
const ABSOLUTE_THRESHOLDS_MS: Record<string, number> = {
  '--help': 400,
  list: 600,
};

interface BenchmarkResult {
  command: string;
  median: number;
  min: number;
  max: number;
  threshold: number;
  passed: boolean;
}

/**
 * Одиночный запуск команды. Ненулевой код возврата — это провал замера, а не
 * повод молча зачесть время: команда, падающая на старте, «выполняется»
 * быстро и без этой проверки выглядела бы как отличный результат.
 */
function measureOnce(command: string): number {
  const start = performance.now();
  execFileSync('node', [CLI_PATH, command], { stdio: 'ignore', timeout: 30_000 });
  return performance.now() - start;
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? ((sorted[mid - 1] ?? 0) + (sorted[mid] ?? 0)) / 2
    : (sorted[mid] ?? 0);
}

function runBenchmark(command: string, threshold: number): BenchmarkResult {
  console.log(`📊 Benchmarking: ${command}...`);

  measureOnce(command); // прогрев: первый запуск платит за холодный дисковый кеш

  const times: number[] = [];
  for (let i = 0; i < ITERATIONS; i++) {
    times.push(measureOnce(command));
  }

  const med = median(times);

  return {
    command,
    median: med,
    min: Math.min(...times),
    max: Math.max(...times),
    threshold,
    passed: med <= threshold,
  };
}

function main(): void {
  console.log('🔬 CLI Performance Benchmarks');
  console.log('===============================\n');
  console.log(`CLI Path: ${CLI_PATH}`);
  console.log(`Iterations per command: ${ITERATIONS} (+1 прогрев)\n`);

  const results: BenchmarkResult[] = [];

  for (const [command, threshold] of Object.entries(ABSOLUTE_THRESHOLDS_MS)) {
    try {
      results.push(runBenchmark(command, threshold));
    } catch (error) {
      console.error(`\n❌ Команда "${command}" не выполнилась — замер недействителен.`);
      console.error(error);
      process.exit(1);
    }
  }

  console.log('\n📈 Results:\n');
  console.table(
    results.map((r) => ({
      Command: r.command,
      'Median (ms)': r.median.toFixed(1),
      'Min (ms)': r.min.toFixed(1),
      'Max (ms)': r.max.toFixed(1),
      'Threshold (ms)': r.threshold,
      Status: r.passed ? '✅ OK' : '❌ FAIL',
    }))
  );

  const failures = results.filter((r) => !r.passed);

  if (failures.length > 0) {
    console.error('\n❌ Превышен порог времени выполнения:\n');
    failures.forEach((f) => {
      console.error(`  - ${f.command}: ${f.median.toFixed(1)} мс при пороге ${f.threshold} мс`);
    });
    process.exit(1);
  }

  console.log('\n✅ Все команды укладываются в пороги.');
}

main();
