#!/usr/bin/env tsx
/**
 * Скрипт для измерения размера tools/list response
 *
 * Цель:
 * - Подсчитать общее количество символов в descriptions
 * - Оценить количество токенов (symbols / 4)
 * - Вывести статистику по категориям и приоритетам
 */

import { TOOL_CLASSES } from '../src/composition-root/definitions/tool-definitions.js';

interface ToolsMetrics {
  totalTools: number;
  descriptionLength: number;
  estimatedTokens: number;
  byCategory: Record<string, { count: number; chars: number }>;
  byPriority: Record<string, { count: number; chars: number }>;
  bySubcategory: Record<string, { count: number; chars: number }>;
  longest: Array<{ name: string; length: number; description: string }>;
}

function calculateToolsMetrics(): ToolsMetrics {
  let descriptionLength = 0;
  const byCategory: Record<string, { count: number; chars: number }> = {};
  const byPriority: Record<string, { count: number; chars: number }> = {};
  const bySubcategory: Record<string, { count: number; chars: number }> = {};
  const allDescriptions: Array<{ name: string; length: number; description: string }> = [];

  for (const ToolClass of TOOL_CLASSES) {
    const metadata = (ToolClass as any).METADATA;
    const desc = metadata.description;
    const descLen = desc.length;

    descriptionLength += descLen;
    allDescriptions.push({
      name: metadata.name,
      length: descLen,
      description: desc,
    });

    // By category
    const category = metadata.category || 'unknown';
    if (!byCategory[category]) {
      byCategory[category] = { count: 0, chars: 0 };
    }
    byCategory[category].count++;
    byCategory[category].chars += descLen;

    // By priority
    const priority = metadata.priority || 'normal';
    if (!byPriority[priority]) {
      byPriority[priority] = { count: 0, chars: 0 };
    }
    byPriority[priority].count++;
    byPriority[priority].chars += descLen;

    // By subcategory
    if (metadata.subcategory) {
      const subcategory = metadata.subcategory;
      if (!bySubcategory[subcategory]) {
        bySubcategory[subcategory] = { count: 0, chars: 0 };
      }
      bySubcategory[subcategory].count++;
      bySubcategory[subcategory].chars += descLen;
    }
  }

  // Сортировать по длине (самые длинные первыми)
  const longest = allDescriptions.sort((a, b) => b.length - a.length).slice(0, 5);

  return {
    totalTools: TOOL_CLASSES.length,
    descriptionLength,
    estimatedTokens: Math.ceil(descriptionLength / 4),
    byCategory,
    byPriority,
    bySubcategory,
    longest,
  };
}

function printMetrics(metrics: ToolsMetrics): void {
  console.log('📊 Tools Discovery Size Report');
  console.log('==============================\n');

  console.log('📈 Overall Metrics:');
  console.log(`   Total tools: ${metrics.totalTools}`);
  console.log(`   Total description length: ${metrics.descriptionLength} characters`);
  console.log(`   Estimated tokens: ~${metrics.estimatedTokens} tokens\n`);

  console.log('📂 By Category:');
  for (const [category, stats] of Object.entries(metrics.byCategory).sort(
    (a, b) => b[1].count - a[1].count
  )) {
    console.log(
      `   ${category}: ${stats.count} tools, ${stats.chars} chars, ~${Math.ceil(stats.chars / 4)} tokens`
    );
  }
  console.log('');

  console.log('🎯 By Priority:');
  const priorityOrder = ['critical', 'high', 'normal', 'low'];
  for (const priority of priorityOrder) {
    const stats = metrics.byPriority[priority];
    if (stats) {
      console.log(
        `   ${priority}: ${stats.count} tools, ${stats.chars} chars, ~${Math.ceil(stats.chars / 4)} tokens`
      );
    }
  }
  console.log('');

  console.log('📋 By Subcategory:');
  for (const [subcategory, stats] of Object.entries(metrics.bySubcategory).sort(
    (a, b) => b[1].count - a[1].count
  )) {
    console.log(
      `   ${subcategory}: ${stats.count} tools, ${stats.chars} chars, ~${Math.ceil(stats.chars / 4)} tokens`
    );
  }
  console.log('');

  console.log('📏 Longest Descriptions:');
  for (let i = 0; i < metrics.longest.length; i++) {
    const tool = metrics.longest[i];
    console.log(`   ${i + 1}. ${tool.name}: ${tool.length} chars`);
    console.log(`      "${tool.description}"`);
  }
  console.log('');

  // Рекомендации
  if (metrics.estimatedTokens > 200) {
    console.log('⚠️  Warning: descriptions занимают много токенов (>200)');
    console.log('   Рекомендация: сократите descriptions для экономии контекста LLM\n');
  } else if (metrics.estimatedTokens > 150) {
    console.log('⚡ Notice: descriptions занимают умеренное количество токенов (>150)');
    console.log('   Рекомендация: рассмотрите возможность дальнейшей оптимизации\n');
  } else {
    console.log('✅ Great! Descriptions оптимизированы для минимального использования токенов\n');
  }
}

// Main
const metrics = calculateToolsMetrics();
printMetrics(metrics);
