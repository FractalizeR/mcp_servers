#!/usr/bin/env node
/**
 * Скрипт для измерения размера tools/list response
 *
 * Цель:
 * - Подсчитать общее количество символов в descriptions
 * - Оценить количество токенов (symbols / 4)
 * - Вывести статистику по категориям и приоритетам
 */

import { readFileSync } from 'fs';
import { glob } from 'glob';

// Найти все tool файлы
const toolFiles = glob.sync('packages/servers/yandex-tracker/src/tools/**/*.tool.ts');

const tools = [];

for (const file of toolFiles) {
  const content = readFileSync(file, 'utf-8');

  // Извлечь METADATA из файла
  const metadataMatch = content.match(/static\s+override\s+readonly\s+METADATA\s*=\s*{([^}]+)}/s);

  if (metadataMatch) {
    const metadataContent = metadataMatch[1];

    // Извлечь description
    const descMatch = metadataContent.match(/description:\s*['"`]([^'"`]+)['"`]/);
    const categoryMatch = metadataContent.match(/category:\s*ToolCategory\.(\w+)/);
    const priorityMatch = metadataContent.match(/priority:\s*ToolPriority\.(\w+)/);
    const subcategoryMatch = metadataContent.match(/subcategory:\s*['"`]([^'"`]+)['"`]/);
    const nameMatch = metadataContent.match(/name:\s*buildToolName\(['"`]([^'"`]+)['"`]/);

    if (descMatch) {
      tools.push({
        name: nameMatch ? nameMatch[1] : file.split('/').pop(),
        description: descMatch[1],
        category: categoryMatch ? categoryMatch[1].toLowerCase() : 'unknown',
        priority: priorityMatch ? priorityMatch[1].toLowerCase() : 'normal',
        subcategory: subcategoryMatch ? subcategoryMatch[1] : null,
      });
    }
  }
}

// Подсчёт метрик
let descriptionLength = 0;
const byCategory = {};
const byPriority = {};
const bySubcategory = {};
const allDescriptions = [];

for (const tool of tools) {
  const descLen = tool.description.length;
  descriptionLength += descLen;

  allDescriptions.push({
    name: tool.name,
    length: descLen,
    description: tool.description,
  });

  // By category
  if (!byCategory[tool.category]) {
    byCategory[tool.category] = { count: 0, chars: 0 };
  }
  byCategory[tool.category].count++;
  byCategory[tool.category].chars += descLen;

  // By priority
  if (!byPriority[tool.priority]) {
    byPriority[tool.priority] = { count: 0, chars: 0 };
  }
  byPriority[tool.priority].count++;
  byPriority[tool.priority].chars += descLen;

  // By subcategory
  if (tool.subcategory) {
    if (!bySubcategory[tool.subcategory]) {
      bySubcategory[tool.subcategory] = { count: 0, chars: 0 };
    }
    bySubcategory[tool.subcategory].count++;
    bySubcategory[tool.subcategory].chars += descLen;
  }
}

// Сортировать по длине
const longest = allDescriptions.sort((a, b) => b.length - a.length).slice(0, 5);

const estimatedTokens = Math.ceil(descriptionLength / 4);

// Вывод
console.log('📊 Tools Discovery Size Report');
console.log('==============================\n');

console.log('📈 Overall Metrics:');
console.log(`   Total tools: ${tools.length}`);
console.log(`   Total description length: ${descriptionLength} characters`);
console.log(`   Estimated tokens: ~${estimatedTokens} tokens\n`);

console.log('📂 By Category:');
for (const [category, stats] of Object.entries(byCategory).sort((a, b) => b[1].count - a[1].count)) {
  console.log(`   ${category}: ${stats.count} tools, ${stats.chars} chars, ~${Math.ceil(stats.chars / 4)} tokens`);
}
console.log('');

console.log('🎯 By Priority:');
const priorityOrder = ['critical', 'high', 'normal', 'low'];
for (const priority of priorityOrder) {
  const stats = byPriority[priority];
  if (stats) {
    console.log(`   ${priority}: ${stats.count} tools, ${stats.chars} chars, ~${Math.ceil(stats.chars / 4)} tokens`);
  }
}
console.log('');

console.log('📋 By Subcategory:');
for (const [subcategory, stats] of Object.entries(bySubcategory).sort((a, b) => b[1].count - a[1].count)) {
  console.log(`   ${subcategory}: ${stats.count} tools, ${stats.chars} chars, ~${Math.ceil(stats.chars / 4)} tokens`);
}
console.log('');

console.log('📏 Longest Descriptions:');
for (let i = 0; i < longest.length; i++) {
  const tool = longest[i];
  console.log(`   ${i + 1}. ${tool.name}: ${tool.length} chars`);
  console.log(`      "${tool.description}"`);
}
console.log('');

// Рекомендации
if (estimatedTokens > 200) {
  console.log('⚠️  Warning: descriptions занимают много токенов (>200)');
  console.log('   Рекомендация: сократите descriptions для экономии контекста LLM\n');
} else if (estimatedTokens > 150) {
  console.log('⚡ Notice: descriptions занимают умеренное количество токенов (>150)');
  console.log('   Рекомендация: рассмотрите возможность дальнейшей оптимизации\n');
} else {
  console.log('✅ Great! Descriptions оптимизированы для минимального использования токенов\n');
}
