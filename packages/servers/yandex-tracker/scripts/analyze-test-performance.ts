#!/usr/bin/env tsx
/**
 * Test Performance Analyzer
 *
 * Анализирует производительность тестов и выводит статистику:
 * - Самые медленные тесты (top-20)
 * - Статистика по категориям (unit/integration/smoke)
 * - Общее время выполнения
 *
 * Usage: npm run test:perf
 */

import { execSync } from 'node:child_process';
import { existsSync, readFileSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';

interface TestResult {
  name: string;
  duration: number;
  file: string;
  status: 'passed' | 'failed' | 'skipped';
}

interface VitestJsonOutput {
  testResults: Array<{
    name: string;
    status: string;
    assertionResults: Array<{
      ancestorTitles: string[];
      title: string;
      status: string;
      duration: number;
      fullName: string;
    }>;
  }>;
}

const SLOW_THRESHOLD = 300; // ms
const TOP_N = 20;

function analyzeTests() {
  console.log('🔍 Analyzing test performance...\n');

  // Запускаем тесты с JSON reporter
  const outputFile = join(process.cwd(), 'test-results.json');

  try {
    execSync('npx vitest run --reporter=json --outputFile=test-results.json', {
      stdio: 'inherit',
    });
  } catch (error) {
    // Тесты могут упасть, но нам все равно нужны результаты
    console.warn('⚠️  Some tests failed, but analyzing results anyway...\n');
  }

  if (!existsSync(outputFile)) {
    console.error('❌ Test results file not found');
    process.exit(1);
  }

  const results = JSON.parse(readFileSync(outputFile, 'utf-8')) as VitestJsonOutput;

  // Собираем все тесты
  const allTests: TestResult[] = [];
  for (const testFile of results.testResults) {
    for (const test of testFile.assertionResults) {
      allTests.push({
        name: test.fullName || test.title,
        duration: test.duration || 0,
        file: testFile.name,
        status: test.status as 'passed' | 'failed' | 'skipped',
      });
    }
  }

  // Сортируем по времени
  allTests.sort((a, b) => b.duration - a.duration);

  // Топ-N самых медленных
  console.log(`📊 Top ${TOP_N} slowest tests:\n`);
  console.log('Rank | Duration | Test');
  console.log('-----|----------|-----');
  for (let i = 0; i < Math.min(TOP_N, allTests.length); i++) {
    const test = allTests[i];
    if (!test) continue;
    const duration = test.duration.toFixed(0);
    const status = test.duration > SLOW_THRESHOLD ? '🐢' : '✅';
    console.log(
      `${String(i + 1).padStart(4)} | ${duration.padStart(7)}ms ${status} | ${test.name.substring(0, 80)}`
    );
  }

  // Статистика по категориям
  console.log('\n\n📈 Statistics by category:\n');

  const categories = {
    unit: allTests.filter((t) => t.file.includes('/unit/')),
    integration: allTests.filter((t) => t.file.includes('/integration/')),
    smoke: allTests.filter((t) => t.file.includes('/smoke/')),
    contract: allTests.filter((t) => t.file.includes('/contract/')),
  };

  for (const [category, tests] of Object.entries(categories)) {
    if (tests.length === 0) continue;

    const totalDuration = tests.reduce((sum, t) => sum + t.duration, 0);
    const avgDuration = totalDuration / tests.length;
    const slowTests = tests.filter((t) => t.duration > SLOW_THRESHOLD);

    console.log(`${category.toUpperCase()}:`);
    console.log(`  Total: ${tests.length} tests, ${(totalDuration / 1000).toFixed(2)}s`);
    console.log(`  Average: ${avgDuration.toFixed(0)}ms per test`);
    console.log(
      `  Slow tests (>${SLOW_THRESHOLD}ms): ${slowTests.length} (${((slowTests.length / tests.length) * 100).toFixed(1)}%)`
    );
    console.log();
  }

  // Общая статистика
  const totalDuration = allTests.reduce((sum, t) => sum + t.duration, 0);
  const avgDuration = totalDuration / allTests.length;
  const slowTests = allTests.filter((t) => t.duration > SLOW_THRESHOLD);

  console.log('📊 Overall statistics:\n');
  console.log(`  Total tests: ${allTests.length}`);
  console.log(`  Total duration: ${(totalDuration / 1000).toFixed(2)}s`);
  console.log(`  Average duration: ${avgDuration.toFixed(0)}ms per test`);
  console.log(
    `  Slow tests (>${SLOW_THRESHOLD}ms): ${slowTests.length} (${((slowTests.length / allTests.length) * 100).toFixed(1)}%)`
  );
  console.log(
    `  Passed: ${allTests.filter((t) => t.status === 'passed').length} | Failed: ${allTests.filter((t) => t.status === 'failed').length} | Skipped: ${allTests.filter((t) => t.status === 'skipped').length}`
  );

  // Cleanup
  unlinkSync(outputFile);

  // Exit code
  if (slowTests.length > allTests.length * 0.1) {
    console.warn(
      `\n⚠️  Warning: ${((slowTests.length / allTests.length) * 100).toFixed(1)}% of tests are slow (threshold: ${SLOW_THRESHOLD}ms)`
    );
    console.warn('Consider optimizing slow tests or increasing the threshold.');
  } else {
    console.log('\n✅ Test performance looks good!');
  }
}

analyzeTests();
