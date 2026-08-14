#!/usr/bin/env tsx
/* eslint-disable */
/**
 * Скрипт для измерения размера ПОЛНЫХ tool descriptions
 *
 * Цель:
 * - Подсчитать общее количество символов в ToolDefinition.description
 * - Оценить количество токенов (symbols / 4)
 * - Вывести статистику по категориям и приоритетам
 * - Сравнить с короткими metadata descriptions
 *
 * Отличие от measure-tools-size.ts:
 * - measure-tools-size.ts измеряет METADATA.description (короткие для discovery)
 * - этот скрипт измеряет ToolDefinition.description (полные для MCP)
 */

import { TOOL_CLASSES } from '../src/composition-root/definitions/tool-definitions.js';
import { Logger } from '@fractalizer/mcp-infrastructure';

interface FullDescriptionsMetrics {
  totalTools: number;
  // Короткие descriptions (из METADATA)
  shortDescriptionLength: number;
  shortEstimatedTokens: number;
  // Полные descriptions (из ToolDefinition)
  fullDescriptionLength: number;
  fullEstimatedTokens: number;
  // Разница
  savingsChars: number;
  savingsTokens: number;
  // По категориям
  byCategory: Record<
    string,
    {
      count: number;
      shortChars: number;
      fullChars: number;
    }
  >;
  // Топ самых длинных
  longest: Array<{
    name: string;
    shortLength: number;
    fullLength: number;
    fullDescription: string;
  }>;
}

function calculateMetrics(): FullDescriptionsMetrics {
  let shortDescriptionLength = 0;
  let fullDescriptionLength = 0;
  const byCategory: Record<string, { count: number; shortChars: number; fullChars: number }> = {};
  const allTools: Array<{
    name: string;
    shortLength: number;
    fullLength: number;
    fullDescription: string;
    category: string;
  }> = [];

  // Создаем mock logger (без вывода)
  const mockLogger: Logger = {
    debug: () => {},
    info: () => {},
    warn: () => {},
    error: () => {},
    child: () => mockLogger,
  };

  for (const ToolClass of TOOL_CLASSES) {
    const metadata = (ToolClass as any).METADATA;
    const shortDesc = metadata.description;
    const shortLen = shortDesc.length;

    // Создаем экземпляр tool для получения ToolDefinition
    // Передаем null как facade - для getDefinition() это не нужно
    const toolInstance = new ToolClass(null, mockLogger);
    const definition = toolInstance.getDefinition();
    const fullDesc = definition.description;
    const fullLen = fullDesc.length;

    shortDescriptionLength += shortLen;
    fullDescriptionLength += fullLen;

    const category = metadata.category || 'unknown';

    allTools.push({
      name: metadata.name,
      shortLength: shortLen,
      fullLength: fullLen,
      fullDescription: fullDesc,
      category,
    });

    // By category
    if (!byCategory[category]) {
      byCategory[category] = { count: 0, shortChars: 0, fullChars: 0 };
    }
    byCategory[category].count++;
    byCategory[category].shortChars += shortLen;
    byCategory[category].fullChars += fullLen;
  }

  // Сортировать по длине полных descriptions
  const longest = allTools.sort((a, b) => b.fullLength - a.fullLength).slice(0, 10);

  return {
    totalTools: TOOL_CLASSES.length,
    shortDescriptionLength,
    shortEstimatedTokens: Math.ceil(shortDescriptionLength / 4),
    fullDescriptionLength,
    fullEstimatedTokens: Math.ceil(fullDescriptionLength / 4),
    savingsChars: fullDescriptionLength - shortDescriptionLength,
    savingsTokens: Math.ceil((fullDescriptionLength - shortDescriptionLength) / 4),
    byCategory,
    longest,
  };
}

function printMetrics(metrics: FullDescriptionsMetrics): void {
  console.log('📊 Full Tool Descriptions Size Report');
  console.log('=====================================\n');

  console.log('📈 Overall Metrics:');
  console.log(`   Total tools: ${metrics.totalTools}\n`);

  console.log('   Short descriptions (METADATA.description):');
  console.log(`   - Length: ${metrics.shortDescriptionLength} chars`);
  console.log(`   - Tokens: ~${metrics.shortEstimatedTokens} tokens\n`);

  console.log('   Full descriptions (ToolDefinition.description):');
  console.log(`   - Length: ${metrics.fullDescriptionLength} chars`);
  console.log(`   - Tokens: ~${metrics.fullEstimatedTokens} tokens\n`);

  console.log('   Difference (Full - Short):');
  console.log(`   - Characters: +${metrics.savingsChars} chars`);
  console.log(`   - Tokens: +${metrics.savingsTokens} tokens\n`);

  console.log('📂 By Category:');
  for (const [category, stats] of Object.entries(metrics.byCategory).sort(
    (a, b) => b[1].count - a[1].count
  )) {
    const diffChars = stats.fullChars - stats.shortChars;
    const diffTokens = Math.ceil(diffChars / 4);
    console.log(`   ${category}: ${stats.count} tools`);
    console.log(
      `   - Short: ${stats.shortChars} chars (~${Math.ceil(stats.shortChars / 4)} tokens)`
    );
    console.log(`   - Full: ${stats.fullChars} chars (~${Math.ceil(stats.fullChars / 4)} tokens)`);
    console.log(`   - Diff: +${diffChars} chars (+${diffTokens} tokens)\n`);
  }

  console.log('📏 Top 10 Longest Full Descriptions:');
  for (let i = 0; i < metrics.longest.length; i++) {
    const tool = metrics.longest[i];
    const diff = tool.fullLength - tool.shortLength;
    console.log(`   ${i + 1}. ${tool.name} (${tool.category})`);
    console.log(`      - Short: ${tool.shortLength} chars`);
    console.log(`      - Full: ${tool.fullLength} chars (+${diff})`);
    console.log(
      `      - Description: "${tool.fullDescription.substring(0, 100)}${tool.fullDescription.length > 100 ? '...' : ''}"`
    );
    console.log('');
  }

  // Рекомендации
  const avgFullLength = metrics.fullDescriptionLength / metrics.totalTools;
  console.log('💡 Analysis:');
  console.log(
    `   Average full description length: ${Math.ceil(avgFullLength)} chars (~${Math.ceil(avgFullLength / 4)} tokens)\n`
  );

  if (metrics.fullEstimatedTokens > 3000) {
    console.log('⚠️  Warning: Full descriptions занимают много токенов (>3000)');
    console.log('   Рекомендация: рассмотрите возможность дальнейшей оптимизации\n');
  } else if (metrics.fullEstimatedTokens > 2000) {
    console.log('⚡ Notice: Full descriptions занимают умеренное количество токенов (>2000)');
    console.log('   Рекомендация: текущий размер приемлем, но есть место для оптимизации\n');
  } else {
    console.log(
      '✅ Great! Full descriptions оптимизированы для минимального использования токенов\n'
    );
  }
}

// Main
const metrics = calculateMetrics();
printMetrics(metrics);
